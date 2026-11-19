import os
import re
import ipaddress
import logging
import time
from collections import defaultdict, deque
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
import requests
from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

# ---------- Rate limiting (in-memory, per process) ----------
_hits: dict = defaultdict(deque)


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")


def rate_limit(request: Request, bucket: str, limit: int, window: int = 60):
    key = f"{bucket}:{client_ip(request)}"
    now = time.time()
    q = _hits[key]
    while q and q[0] < now - window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests, please slow down")
    q.append(now)


# ---------- HTML sanitizer (allowlist) ----------
_ALLOWED = {"p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "a", "blockquote",
            "code", "pre", "img", "figure", "figcaption", "hr", "span", "video", "source", "iframe"}
_VOID = {"br", "img", "hr", "source"}
_ATTRS = {"a": {"href"}, "img": {"src", "alt"}, "video": {"src", "controls", "poster"}, "source": {"src", "type"},
          "iframe": {"src", "allowfullscreen"}}


def _safe_url(u: str, iframe=False) -> bool:
    u = (u or "").strip().lower()
    if iframe:
        return u.startswith(("https://www.youtube.com/embed/", "https://player.vimeo.com/"))
    return u.startswith(("https://", "http://", "/", "mailto:", "#"))


class _Sanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
            return
        if tag not in _ALLOWED or self.skip:
            return
        keep = []
        for k, v in attrs:
            if k in _ATTRS.get(tag, set()):
                if k in ("href", "src", "poster") and not _safe_url(v or "", tag == "iframe"):
                    continue
                keep.append(f' {k}="{escape(v or "", quote=True)}"' if v is not None else f" {k}")
        if tag == "a":
            keep.append(' rel="noopener noreferrer" target="_blank"')
        self.out.append(f"<{tag}{''.join(keep)}>")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
            return
        if tag in _ALLOWED and tag not in _VOID and not self.skip:
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.skip:
            self.out.append(escape(data))


def sanitize_html(html: str) -> str:
    s = _Sanitizer()
    s.feed(html or "")
    s.close()
    return "".join(s.out)


# ---------- Email (Emergent managed Resend) ----------
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


def render_email(text: str) -> str:
    from_name = escape(os.environ["EMAIL_FROM_NAME"])
    paras = "".join(f'<p style="margin:0 0 14px;line-height:1.6">{escape(p).replace(chr(10), "<br>")}</p>'
                    for p in text.split("\n\n") if p.strip())
    return ('<table role="presentation" width="100%" style="background:#f4f7f5"><tr><td style="padding:28px">'
            '<table role="presentation" width="600" style="background:#ffffff;border-radius:12px;margin:0 auto">'
            f'<tr><td style="padding:28px;font-family:Arial,sans-serif;color:#0b1a14;font-size:15px">{paras}'
            f'<p style="font-size:12px;color:#888;margin-top:24px">Sent by {from_name}. We never ask for your '
            'password or card details by email.</p></td></tr></table></td></tr></table>')


async def send_email(*, to: str, subject: str, html: str, reply_to: str | None = None) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": os.environ["EMAIL_FROM_NAME"]}
    if reply_to:
        payload["contact_email"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                     headers={"X-Email-Key": os.environ["EMERGENT_EMAIL_KEY"]}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        try:
            code = e.response.json().get("code", "")
        except ValueError:
            code = ""
        if code in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            logger.warning(f"Email paused: {code} ({e.response.status_code})")
            raise HTTPException(status_code=503, detail="Email is temporarily unavailable")
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to send email")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email send error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")


# ---------- Object storage ----------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
_storage_key = None


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    for attempt in range(2):
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": init_storage(force=attempt > 0), "Content-Type": content_type},
                            data=data, timeout=120)
        if resp.status_code == 404 and attempt == 0:
            continue
        resp.raise_for_status()
        return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    for attempt in range(2):
        resp = requests.get(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": init_storage(force=attempt > 0)}, timeout=60)
        if resp.status_code == 404 and attempt == 0:
            continue
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
