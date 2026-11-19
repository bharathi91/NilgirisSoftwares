import asyncio
import csv
import hashlib
import io
import json
import logging
import os
import re
import uuid
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import PlainTextResponse, Response, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel, ReturnDocument
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

try:
    from backend.clerk_auth import clerk_router, require_user
    from backend import services as svc
    from backend.seed import default_content, DEFAULT_TEMPLATES
except ModuleNotFoundError:
    from clerk_auth import clerk_router, require_user
    import services as svc
    from seed import default_content, DEFAULT_TEMPLATES

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
logger = logging.getLogger("nilgiris")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

APP_PREFIX = os.environ["STORAGE_APP_NAME"]
CACHE_DIR = Path("/tmp/media_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

INDEXES = {
    "cms": [IndexModel([("key", ASCENDING)], name="key", unique=True)],
    "versions": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("at", DESCENDING)], name="at")],
    "leads": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("created_at", DESCENDING)], name="created"),
              IndexModel([("status", ASCENDING)], name="status")],
    "media": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("folder", ASCENDING), ("deleted", ASCENDING)], name="folder")],
    "posts": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("slug", ASCENDING)], name="slug", unique=True),
              IndexModel([("status", ASCENDING), ("publish_at", DESCENDING)], name="status_pub")],
    "users": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "invites": [IndexModel([("email", ASCENDING)], name="email", unique=True)],
    "login_events": [IndexModel([("sid", ASCENDING)], name="sid", unique=True), IndexModel([("at", DESCENDING)], name="at")],
    "audit": [IndexModel([("at", DESCENDING)], name="at")],
    "analytics": [IndexModel([("day", ASCENDING)], name="day"), IndexModel([("at", DESCENDING)], name="at")],
    "chat_sessions": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("updated_at", DESCENDING)], name="upd")],
    "notifications": [IndexModel([("at", DESCENDING)], name="at")],
    "translations": [IndexModel([("lang", ASCENDING), ("h", ASCENDING)], name="lang_h", unique=True)],
    "testimonial_submissions": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "email_templates": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
}

app = FastAPI(title="The Nilgiris Softwares CMS API")
api = APIRouter(prefix="/api")


def etag_match(request: Request, etag: str) -> bool:
    inm = request.headers.get("if-none-match", "")
    return any(t.strip().removeprefix("W/") == etag for t in inm.split(",") if t.strip())


def now():
    return datetime.now(timezone.utc)


def iso():
    return now().isoformat()


def nid():
    return uuid.uuid4().hex


# ===================== Auth & roles =====================
ROLES = ["super_admin", "admin", "editor", "sales", "viewer", "none"]
DEFAULT_ROLE = "none"
RETIRED_ROLES: dict = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}
PERMS = {
    "super_admin": {"*"},
    "admin": {"content.read", "content.write", "leads.read", "leads.write", "media.write", "blog.write", "blog.publish",
              "analytics.read", "ai.manage", "audit.read"},
    "editor": {"content.read", "content.write", "media.write", "blog.write"},
    "sales": {"content.read", "leads.read", "leads.write"},
    "viewer": {"content.read", "leads.read", "analytics.read"},
    "none": set(),
}
ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}
CLERK_API = "https://api.clerk.com/v1"


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


def clerk(method: str, path: str, **kw):
    r = requests.request(method, f"{CLERK_API}{path}", timeout=10, headers={
        "Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app", "Content-Type": "application/json"}, **kw)
    r.raise_for_status()
    return r.json() if r.content else {}


def _verified_emails(user_id: str) -> tuple[list, str]:
    u = clerk("GET", f"/users/{user_id}")
    emails = [e["email_address"].lower() for e in u["email_addresses"] if (e.get("verification") or {}).get("status") == "verified"]
    name = " ".join(x for x in [u.get("first_name"), u.get("last_name")] if x) or (emails[0] if emails else "")
    return emails, name


def super_admin_emails() -> set:
    return {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}


async def _resolve_role(uid: str) -> dict:
    emails, name = await run_in_threadpool(_verified_emails, uid)
    role = DEFAULT_ROLE
    if any(e in super_admin_emails() for e in emails):
        role = "super_admin"
    else:
        inv = await db.invites.find_one({"email": {"$in": emails}, "used": False}, {"_id": 0})
        if inv:
            role = effective_role(inv["role"])
            await db.invites.update_one({"email": inv["email"]}, {"$set": {"used": True, "used_at": iso()}})
    return {"role": role, "email": emails[0] if emails else "", "name": name}


async def current_member(request: Request, user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if member is None or not member.get("role") or (member.get("role") == "none" and not member.get("revoked")):
        info = await _resolve_role(uid)
        if member is None or member.get("role") in (None, "", "none"):
            member = await db.users.find_one_and_update(
                {"user_id": uid}, {"$set": {**info, "env": ENV}, "$setOnInsert": {"user_id": uid, "created_at": iso()}},
                upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if member.get("env") != ENV:
        await db.users.update_one({"user_id": uid}, {"$set": {"env": ENV}})
    sid = user.get("session_id")
    if sid:
        res = await db.login_events.update_one({"sid": sid}, {"$setOnInsert": {
            "sid": sid, "user_id": uid, "email": member.get("email"), "ip": svc.client_ip(request),
            "ua": request.headers.get("user-agent", "")[:200], "at": iso()}}, upsert=True)
        if res.upserted_id:
            await db.users.update_one({"user_id": uid}, {"$set": {"last_login": iso()}})
    role = effective_role(member.get("role"))
    return {**member, "env": ENV, "role": role, "session_id": sid}


def can(member: dict, perm: str) -> bool:
    p = PERMS.get(member["role"], set())
    return "*" in p or perm in p


def need(perm: str):
    async def check(member: dict = Depends(current_member)) -> dict:
        if not can(member, perm):
            raise HTTPException(status_code=403, detail="You don't have permission for this action")
        return member
    return check


async def audit(member: dict, action: str, target: str = "", detail: Any = None):
    await db.audit.insert_one({"id": nid(), "at": iso(), "user_id": member.get("user_id"), "email": member.get("email"),
                               "role": member.get("role"), "action": action, "target": target, "detail": detail})


async def notify(kind: str, title: str, body: str = "", link: str = ""):
    await db.notifications.insert_one({"id": nid(), "at": iso(), "kind": kind, "title": title, "body": body, "link": link, "read": False})


@api.get("/me")
async def me(member: dict = Depends(current_member)):
    perms = sorted(PERMS.get(member["role"], set()))
    return {"user_id": member["user_id"], "email": member.get("email"), "name": member.get("name"), "role": member["role"],
            "permissions": perms}


# ===================== CMS draft / publish =====================
async def get_cms(key: str) -> dict:
    doc = await db.cms.find_one({"key": key}, {"_id": 0})
    return doc


async def ensure_seed():
    if not await get_cms("published"):
        data = default_content()
        vid = nid()
        await db.cms.insert_one({"key": "published", "data": data, "version_id": vid, "published_at": iso(), "published_by": "system"})
        await db.cms.insert_one({"key": "draft", "data": data, "rev": 1, "updated_at": iso(), "updated_by": "system"})
        await db.versions.insert_one({"id": vid, "at": iso(), "by": "system", "kind": "publish", "note": "Initial content", "data": data})
    if not await db.email_templates.count_documents({}):
        await db.email_templates.insert_many([{**t, "id": nid(), "created_at": iso()} for t in DEFAULT_TEMPLATES])


PRIVATE_KEYS = [("settings", "_none"), ("settings", "notifications"), ("settings", "email"), ("ai", "knowledge")]


def public_view(data: dict) -> dict:
    d = json.loads(json.dumps(data))
    for a, b in PRIVATE_KEYS:
        d.get(a, {}).pop(b, None)
    c = d.get("settings", {}).get("contact", {})
    if not c.get("confirmed"):
        d["settings"]["contact"] = {"confirmed": False}
    return d


TR_KEYS = {"title", "subtitle", "eyebrow", "body", "text", "label", "ctaLabel", "cta2Label", "summary", "description", "q", "a", "quote", "intro",
           "vision", "mission", "philosophy", "tagline", "headline", "about", "copyright", "greeting", "message", "offlineMessage", "content", "caption",
           "challenge", "solution", "contribution", "features", "domains", "category", "bio", "education", "role", "buttonLabel", "ogTitle", "ogDescription",
           "privacyPolicy", "terms"}
TR_SKIP = {"technologies", "redirects", "seo", "theme", "components"}
_tr_running: set = set()


def _collect(o, out, key=None):
    if isinstance(o, dict):
        for k, v in o.items():
            if k not in TR_SKIP:
                _collect(v, out, k)
    elif isinstance(o, list):
        for v in o:
            _collect(v, out, key)
    elif isinstance(o, str) and key in TR_KEYS and re.search(r"[A-Za-z]{2}", o) and not o.startswith(("http", "/")):
        out.add(o)


def _apply_tr(o, m, key=None):
    if isinstance(o, dict):
        return {k: (v if k in TR_SKIP else _apply_tr(v, m, k)) for k, v in o.items()}
    if isinstance(o, list):
        return [_apply_tr(v, m, key) for v in o]
    if isinstance(o, str) and key in TR_KEYS:
        return m.get(o, o)
    return o


async def translate_site(lang: str):
    pub = await get_cms("published")
    vid = pub["version_id"]
    if (lang, vid) in _tr_running:
        return
    _tr_running.add((lang, vid))
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        data = public_view(pub["data"])
        strings = set()
        _collect(data, strings)
        hashes = {hashlib.sha1(x.encode()).hexdigest(): x for x in strings}
        known = {d["h"]: d["text"] async for d in db.translations.find({"lang": lang, "h": {"$in": list(hashes)}}, {"_id": 0})}
        todo = [x for h, x in hashes.items() if h not in known]
        for i in range(0, len(todo), 40):
            batch = todo[i:i + 40]
            llm = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"tr-{nid()}", system_message=(
                f"You translate website copy for a software company into {LANG_NAMES.get(lang, lang)}. Return ONLY a JSON array of strings, same length and order as the input. "
                "Keep brand names, product names, technology names, numbers, emoji and placeholders like {year} unchanged. Natural, professional tone.")).with_model("openai", "gpt-6-luna")
            try:
                msg = UserMessage(text=json.dumps(batch, ensure_ascii=False))
                raw = await asyncio.to_thread(lambda: asyncio.run(llm.send_message(msg)))
                out = json.loads(raw[raw.index("["): raw.rindex("]") + 1])
                if len(out) != len(batch):
                    continue
            except Exception as e:
                logger.warning(f"translation batch failed: {e}")
                continue
            for src, dst in zip(batch, out):
                h = hashlib.sha1(src.encode()).hexdigest()
                await db.translations.update_one({"lang": lang, "h": h}, {"$set": {"lang": lang, "h": h, "text": str(dst), "src": src}}, upsert=True)
                known[h] = str(dst)
        m = {x: known[h] for h, x in hashes.items() if h in known}
        await db.cms.update_one({"key": f"tr:{lang}"}, {"$set": {"key": f"tr:{lang}", "version_id": vid, "data": _apply_tr(data, m),
                                                                 "coverage": round(len(m) / max(1, len(hashes)) * 100), "at": iso()}}, upsert=True)
    finally:
        _tr_running.discard((lang, vid))


@api.get("/public/site")
async def public_site(request: Request, background: BackgroundTasks, lang: str = ""):
    pub = await get_cms("published")
    langs = pub["data"]["settings"].get("siteLanguages", ["en", "ta"])
    if lang and lang != "en" and lang in langs:
        tr = await get_cms(f"tr:{lang}")
        if tr and tr["version_id"] == pub["version_id"]:
            etag = f'"{pub["version_id"]}-{lang}"'
            headers = {"ETag": etag, "Cache-Control": "public, max-age=30, must-revalidate"}
            if etag_match(request, etag):
                return Response(status_code=304, headers=headers)
            return Response(json.dumps({"version": pub["version_id"], "lang": lang, "data": tr["data"]}), media_type="application/json", headers=headers)
        background.add_task(translate_site, lang)
        return Response(json.dumps({"version": pub["version_id"], "lang": "en", "translating": True, "data": public_view(pub["data"])}),
                        media_type="application/json", headers={"Cache-Control": "no-store"})
    etag = f'"{pub["version_id"]}"'
    headers = {"ETag": etag, "Cache-Control": "public, max-age=30, must-revalidate"}
    if etag_match(request, etag):
        return Response(status_code=304, headers=headers)
    body = json.dumps({"version": pub["version_id"], "data": public_view(pub["data"])})
    return Response(content=body, media_type="application/json", headers=headers)


@api.get("/admin/draft")
async def get_draft(member: dict = Depends(need("content.read"))):
    d = await get_cms("draft")
    pub = await get_cms("published")
    return {**d, "published_version": pub["version_id"], "published_at": pub.get("published_at"),
            "has_unpublished": d["data"] != pub["data"], "submitted": d.get("submitted")}


class DraftIn(BaseModel):
    rev: int
    data: dict


REQUIRED_KEYS = {"settings", "theme", "navigation", "footer", "pages", "services", "projects", "technologies",
                 "testimonials", "faqs", "about", "founder", "seo", "ai"}


def validate_content(data: dict):
    missing = REQUIRED_KEYS - set(data)
    if missing:
        raise HTTPException(400, f"Missing sections: {', '.join(sorted(missing))}")
    slugs = [p.get("slug") for p in data["pages"]]
    if len(slugs) != len(set(slugs)):
        raise HTTPException(400, "Two pages share the same URL")
    for s in slugs:
        if not s or not re.fullmatch(r"/|[a-z0-9][a-z0-9\-/]*", s):
            raise HTTPException(400, f"Invalid page URL: {s!r} (use lowercase letters, numbers and dashes)")
    if len(json.dumps(data)) > 4_000_000:
        raise HTTPException(413, "Content too large")


@api.put("/admin/draft")
async def save_draft(body: DraftIn, member: dict = Depends(need("content.write"))):
    validate_content(body.data)
    res = await db.cms.find_one_and_update(
        {"key": "draft", "rev": body.rev},
        {"$set": {"data": body.data, "updated_at": iso(), "updated_by": member.get("email")}, "$inc": {"rev": 1}},
        return_document=ReturnDocument.AFTER, projection={"_id": 0, "rev": 1, "updated_at": 1})
    if not res:
        cur = await get_cms("draft")
        raise HTTPException(409, f"Someone else ({cur.get('updated_by')}) saved changes at {cur.get('updated_at')}. Reload to get the latest draft.")
    await audit(member, "draft.save", "content")
    return res


def link_errors(data: dict) -> list:
    slugs = {("/" + p["slug"].strip("/")) if p["slug"] != "/" else "/" for p in data["pages"]}
    known = slugs | {"/blog", "/privacy", "/terms", "/admin", "/share-feedback"}
    errs = []

    def check(label, href):
        if not href:
            errs.append(f"{label}: empty link")
        elif href.startswith(("http://", "https://", "mailto:", "tel:", "#")):
            return
        elif href.startswith("/"):
            base = href.split("#")[0].split("?")[0].rstrip("/") or "/"
            if base not in known and not base.startswith(("/blog/", "/portfolio/")):
                errs.append(f"{label}: '{href}' does not match any page")
        else:
            errs.append(f"{label}: '{href}' must start with / or https://")
    for it in data["navigation"]["items"]:
        check(f"Menu '{it['label']}'", it.get("href"))
        for ch in it.get("children", []):
            check(f"Menu '{ch['label']}'", ch.get("href"))
    for col in data["footer"]["columns"]:
        for l in col.get("links", []):
            check(f"Footer '{l.get('label')}'", l.get("href"))
    return errs


class NoteIn(BaseModel):
    note: str = ""


@api.post("/admin/publish")
async def publish(body: NoteIn, member: dict = Depends(need("publish"))):
    d = await get_cms("draft")
    validate_content(d["data"])
    errs = link_errors(d["data"])
    if errs:
        raise HTTPException(400, {"message": "Fix broken links before publishing", "errors": errs})
    vid = nid()
    await db.versions.insert_one({"id": vid, "at": iso(), "by": member.get("email"), "kind": "publish", "note": body.note, "data": d["data"]})
    await db.cms.update_one({"key": "published"}, {"$set": {"data": d["data"], "version_id": vid, "published_at": iso(), "published_by": member.get("email")}})
    await db.cms.update_one({"key": "draft"}, {"$unset": {"submitted": ""}})
    await audit(member, "publish", vid, body.note)
    for lg in d["data"]["settings"].get("siteLanguages", ["en", "ta"]):
        if lg != "en":
            asyncio.create_task(translate_site(lg))
    return {"version_id": vid}


@api.get("/admin/translations/status")
async def tr_status(member: dict = Depends(need("content.read"))):
    pub = await get_cms("published")
    out = []
    for lg in pub["data"]["settings"].get("siteLanguages", ["en", "ta"]):
        if lg == "en":
            continue
        tr = await get_cms(f"tr:{lg}")
        out.append({"lang": lg, "up_to_date": bool(tr and tr["version_id"] == pub["version_id"]), "coverage": (tr or {}).get("coverage", 0),
                    "at": (tr or {}).get("at"), "running": (lg, pub["version_id"]) in _tr_running})
    return out


@api.post("/admin/translations/{lang}/regenerate")
async def tr_regen(lang: str, background: BackgroundTasks, member: dict = Depends(need("publish"))):
    background.add_task(translate_site, lang)
    await audit(member, "translations.regenerate", lang)
    return {"ok": True}


class TestimonialIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    role: str = Field("", max_length=120)
    company: str = Field("", max_length=160)
    email: str = Field(max_length=200)
    quote: str = Field(min_length=10, max_length=1500)
    consent: bool


@api.post("/public/testimonials")
async def submit_testimonial(body: TestimonialIn, request: Request):
    svc.rate_limit(request, "testimonial", 3, 600)
    if not body.consent or not EMAIL_RE.match(body.email):
        raise HTTPException(400, "Please give a valid email and permission to publish")
    doc = {**body.model_dump(), "id": nid(), "status": "pending", "created_at": iso()}
    await db.testimonial_submissions.insert_one(dict(doc))
    await notify("testimonial", f"New testimonial from {body.name}", body.company, "/admin/testimonials")
    return {"ok": True}


@api.get("/admin/testimonial-submissions")
async def list_testimonials(member: dict = Depends(need("content.read"))):
    return await db.testimonial_submissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/admin/testimonial-submissions/{tid}/approve")
async def approve_testimonial(tid: str, member: dict = Depends(need("content.write"))):
    t = await db.testimonial_submissions.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404)
    item = {"id": nid()[:10], "name": t["name"], "role": t["role"], "company": t["company"], "quote": t["quote"], "verified": True, "submitted_email": t["email"]}
    await db.cms.update_one({"key": "draft"}, {"$push": {"data.testimonials": item}, "$inc": {"rev": 1}, "$set": {"updated_at": iso(), "updated_by": member.get("email")}})
    await db.testimonial_submissions.update_one({"id": tid}, {"$set": {"status": "approved", "approved_by": member.get("email")}})
    await audit(member, "testimonial.approve", tid)
    return {"ok": True}


@api.delete("/admin/testimonial-submissions/{tid}")
async def reject_testimonial(tid: str, member: dict = Depends(need("content.write"))):
    await db.testimonial_submissions.update_one({"id": tid}, {"$set": {"status": "rejected"}})
    await audit(member, "testimonial.reject", tid)
    return {"ok": True}


@api.post("/admin/draft/discard")
async def discard(member: dict = Depends(need("content.write"))):
    pub = await get_cms("published")
    await db.cms.update_one({"key": "draft"}, {"$set": {"data": pub["data"], "updated_at": iso(), "updated_by": member.get("email")}, "$inc": {"rev": 1}})
    await audit(member, "draft.discard", "content")
    return {"ok": True}


@api.post("/admin/draft/submit")
async def submit_draft(body: NoteIn, member: dict = Depends(need("content.write"))):
    await db.cms.update_one({"key": "draft"}, {"$set": {"submitted": {"by": member.get("email"), "at": iso(), "note": body.note}}})
    await notify("approval", f"{member.get('email')} submitted changes for approval", body.note, "/admin/publish")
    await audit(member, "draft.submit", "content", body.note)
    return {"ok": True}


@api.get("/admin/versions")
async def versions(member: dict = Depends(need("content.read")), limit: int = 50):
    return await db.versions.find({}, {"_id": 0, "data": 0}).sort("at", -1).limit(limit).to_list(limit)


@api.get("/admin/versions/{vid}")
async def version(vid: str, member: dict = Depends(need("content.read"))):
    v = await db.versions.find_one({"id": vid}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Version not found")
    return v


@api.post("/admin/versions/{vid}/restore")
async def restore_version(vid: str, member: dict = Depends(need("publish"))):
    v = await db.versions.find_one({"id": vid}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Version not found")
    new_id = nid()
    await db.versions.insert_one({"id": new_id, "at": iso(), "by": member.get("email"), "kind": "rollback", "note": f"Restored version from {v['at']}", "data": v["data"]})
    await db.cms.update_one({"key": "published"}, {"$set": {"data": v["data"], "version_id": new_id, "published_at": iso(), "published_by": member.get("email")}})
    await db.cms.update_one({"key": "draft"}, {"$set": {"data": v["data"], "updated_at": iso(), "updated_by": member.get("email")}, "$inc": {"rev": 1}})
    await audit(member, "rollback", vid)
    return {"version_id": new_id}


# ===================== Media =====================
ALLOWED_MEDIA = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
    "video/mp4": "mp4", "video/webm": "webm", "application/pdf": "pdf",
    "application/msword": "doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}
RASTER = {"image/jpeg", "image/png", "image/webp"}
WIDTHS = [480, 1200]


def _variants(data: bytes) -> tuple[dict, int, int]:
    from PIL import Image
    im = Image.open(io.BytesIO(data))
    im.load()
    w, h = im.size
    out = {}
    for tw in WIDTHS:
        if tw < w:
            c = im.copy()
            c.thumbnail((tw, tw * 10))
            b = io.BytesIO()
            c.convert("RGBA" if c.mode in ("RGBA", "P", "LA") else "RGB").save(b, "WEBP", quality=80)
            out[str(tw)] = b.getvalue()
    return out, w, h


async def store_media(data: bytes, ctype: str, name: str, folder: str, uploader: str, private=False, mid=None) -> dict:
    ext = ALLOWED_MEDIA[ctype]
    mid = mid or nid()[:16]
    h = hashlib.sha256(data).hexdigest()[:12]
    base = f"{APP_PREFIX}/media/{mid}/{h}"
    await run_in_threadpool(svc.put_object, f"{base}.{ext}", data, ctype)
    variants, w, hh = {}, None, None
    if ctype in RASTER:
        vs, w, hh = await run_in_threadpool(_variants, data)
        for k, b in vs.items():
            await run_in_threadpool(svc.put_object, f"{base}_{k}.webp", b, "image/webp")
            variants[k] = len(b)
    return {"id": mid, "hash": h, "ext": ext, "content_type": ctype, "size": len(data), "width": w, "height": hh,
            "variants": variants, "storage_base": base, "name": name, "folder": folder, "private": private,
            "url": f"/api/media/f/{mid}.{h}.{ext}", "uploaded_by": uploader}


def _read_validated(file: UploadFile, data: bytes) -> str:
    ctype = (file.content_type or "").lower()
    if ctype not in ALLOWED_MEDIA:
        raise HTTPException(415, f"File type {ctype or 'unknown'} is not allowed")
    limit = 60_000_000 if ctype.startswith("video/") else 12_000_000
    if len(data) > limit:
        raise HTTPException(413, f"File too large (max {limit // 1_000_000} MB)")
    if ctype in RASTER:
        from PIL import Image
        try:
            Image.open(io.BytesIO(data)).verify()
        except Exception:
            raise HTTPException(400, "File is not a valid image")
    return ctype


@api.post("/admin/media")
async def upload_media(file: UploadFile = File(...), folder: str = Form("general"), alt: str = Form(""),
                       member: dict = Depends(need("media.write"))):
    data = await file.read()
    ctype = _read_validated(file, data)
    rec = await store_media(data, ctype, file.filename or "file", folder.strip() or "general", member.get("email"))
    rec.update({"alt": alt, "deleted": False, "created_at": iso(), "updated_at": iso()})
    await db.media.insert_one(dict(rec))
    await audit(member, "media.upload", rec["id"], rec["name"])
    rec.pop("_id", None)
    return rec


@api.get("/admin/media")
async def list_media(q: str = "", folder: str = "", kind: str = "", member: dict = Depends(need("content.read"))):
    f: dict = {"deleted": False, "private": False}
    if folder:
        f["folder"] = folder
    if q:
        f["name"] = {"$regex": re.escape(q), "$options": "i"}
    if kind:
        f["content_type"] = {"$regex": f"^{re.escape(kind)}"}
    items = await db.media.find(f, {"_id": 0}).sort("created_at", -1).to_list(1000)
    folders = await db.media.distinct("folder", {"deleted": False, "private": False})
    return {"items": items, "folders": sorted(folders)}


class MediaPatch(BaseModel):
    name: Optional[str] = None
    alt: Optional[str] = None
    folder: Optional[str] = None


@api.patch("/admin/media/{mid}")
async def patch_media(mid: str, body: MediaPatch, member: dict = Depends(need("media.write"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    upd["updated_at"] = iso()
    r = await db.media.find_one_and_update({"id": mid, "deleted": False}, {"$set": upd}, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not r:
        raise HTTPException(404, "Not found")
    await audit(member, "media.update", mid, upd)
    return r


async def _swap_references(old: str, new: str):
    d = await get_cms("draft")
    raw = json.dumps(d["data"])
    if old in raw:
        await db.cms.update_one({"key": "draft"}, {"$set": {"data": json.loads(raw.replace(old, new))}, "$inc": {"rev": 1}})


async def _replace_bytes(mid: str, data: bytes, ctype: str, member: dict, name: Optional[str] = None):
    cur = await db.media.find_one({"id": mid, "deleted": False}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Not found")
    rec = await store_media(data, ctype, name or cur["name"], cur["folder"], member.get("email"), mid=mid)
    rec["updated_at"] = iso()
    await db.media.update_one({"id": mid}, {"$set": rec})
    await _swap_references(cur["url"], rec["url"])
    await audit(member, "media.replace", mid)
    return {**cur, **rec}


@api.post("/admin/media/{mid}/replace")
async def replace_media(mid: str, file: UploadFile = File(...), member: dict = Depends(need("media.write"))):
    data = await file.read()
    return await _replace_bytes(mid, data, _read_validated(file, data), member, file.filename)


class CropIn(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    w: float = Field(gt=0, le=1)
    h: float = Field(gt=0, le=1)
    max_width: int = Field(0, ge=0, le=6000)
    quality: int = Field(85, ge=30, le=100)


@api.post("/admin/media/{mid}/crop")
async def crop_media(mid: str, body: CropIn, member: dict = Depends(need("media.write"))):
    cur = await db.media.find_one({"id": mid, "deleted": False}, {"_id": 0})
    if not cur or cur["content_type"] not in RASTER:
        raise HTTPException(400, "Only JPG, PNG and WebP images can be cropped or resized")
    data, _ = await run_in_threadpool(svc.get_object, f"{cur['storage_base']}.{cur['ext']}")

    def work():
        from PIL import Image
        im = Image.open(io.BytesIO(data))
        W, H = im.size
        im = im.crop((int(body.x * W), int(body.y * H), int(min(1, body.x + body.w) * W), int(min(1, body.y + body.h) * H)))
        if body.max_width and im.width > body.max_width:
            im.thumbnail((body.max_width, body.max_width * 10))
        b = io.BytesIO()
        fmt = {"jpg": "JPEG", "png": "PNG", "webp": "WEBP"}[cur["ext"]]
        (im.convert("RGB") if fmt == "JPEG" else im).save(b, fmt, quality=body.quality, optimize=True)
        return b.getvalue()
    out = await run_in_threadpool(work)
    return await _replace_bytes(mid, out, cur["content_type"], member)


@api.get("/admin/media/{mid}/usage")
async def media_usage(mid: str, member: dict = Depends(need("content.read"))):
    needle = f"/api/media/f/{mid}."
    used = []
    for key in ("draft", "published"):
        d = await get_cms(key)

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, f"{path}.{k}")
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    lbl = v.get("title") or v.get("name") or v.get("slug") or v.get("type") or i if isinstance(v, dict) else i
                    walk(v, f"{path}[{lbl}]")
            elif isinstance(o, str) and needle in o:
                used.append({"where": key, "path": path.lstrip(".")})
        walk(d["data"], "")
    async for p in db.posts.find({}, {"_id": 0, "title": 1, "cover": 1, "content": 1}):
        if needle in (p.get("cover") or "") + (p.get("content") or ""):
            used.append({"where": "blog", "path": p["title"]})
    return {"usage": used}


@api.delete("/admin/media/{mid}")
async def delete_media(mid: str, member: dict = Depends(need("media.write"))):
    r = await db.media.update_one({"id": mid}, {"$set": {"deleted": True, "deleted_at": iso()}})
    if not r.matched_count:
        raise HTTPException(404, "Not found")
    await audit(member, "media.delete", mid)
    return {"ok": True}


async def _cached_bytes(spath: str) -> Path:
    fp = CACHE_DIR / hashlib.sha1(spath.encode()).hexdigest()
    if not fp.exists():
        data, _ = await run_in_threadpool(svc.get_object, spath)
        tmp = fp.with_suffix(".tmp")
        tmp.write_bytes(data)
        tmp.replace(fp)
    return fp


def _range_response(fp: Path, ctype: str, request: Request, headers: dict) -> Response:
    size = fp.stat().st_size
    rng = request.headers.get("range")
    if rng and rng.startswith("bytes="):
        s, _, e = rng[6:].partition("-")
        start = int(s) if s else max(0, size - int(e))
        end = int(e) if s and e else size - 1
        end = min(end, size - 1)
        if start > end:
            return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
        with fp.open("rb") as f:
            f.seek(start)
            chunk = f.read(end - start + 1)
        return Response(chunk, status_code=206, media_type=ctype, headers={
            **headers, "Content-Range": f"bytes {start}-{end}/{size}", "Accept-Ranges": "bytes"})
    return Response(fp.read_bytes(), media_type=ctype, headers={**headers, "Accept-Ranges": "bytes"})


@api.get("/media/f/{fname}")
async def serve_media(fname: str, request: Request, w: int = 0):
    m = re.fullmatch(r"([a-f0-9]{16})\.([a-f0-9]{12})\.([a-z0-9]+)", fname)
    if not m:
        raise HTTPException(404)
    rec = await db.media.find_one({"id": m.group(1), "private": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404)
    if rec["hash"] != m.group(2):  # stale hash: point to the current file
        return Response(status_code=301, headers={"Location": rec["url"] + (f"?w={w}" if w else ""), "Cache-Control": "no-cache"})
    spath, ctype = f"{rec['storage_base']}.{rec['ext']}", rec["content_type"]
    if w:
        fit = next((k for k in sorted(rec.get("variants", {}), key=int) if int(k) >= w), None)
        if fit:
            spath, ctype = f"{rec['storage_base']}_{fit}.webp", "image/webp"
    etag = f'"{rec["hash"]}-{w}"'
    headers = {"Cache-Control": "public, max-age=31536000, immutable", "ETag": etag,
               "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
               "X-Content-Type-Options": "nosniff"}
    if etag_match(request, etag):
        return Response(status_code=304, headers=headers)
    fp = await _cached_bytes(spath)
    return _range_response(fp, ctype, request, headers)


@api.get("/admin/media/{mid}/download")
async def download_private(mid: str, member: dict = Depends(need("leads.read"))):
    rec = await db.media.find_one({"id": mid}, {"_id": 0})
    if not rec:
        raise HTTPException(404)
    data, _ = await run_in_threadpool(svc.get_object, f"{rec['storage_base']}.{rec['ext']}")
    return Response(data, media_type=rec["content_type"], headers={
        "Cache-Control": "private, no-store", "Content-Disposition": f'attachment; filename="{rec["name"]}"'})


# ===================== Leads / CRM =====================
LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"]
LEAD_FILE_TYPES = {"application/pdf", "image/png", "image/jpeg", "application/msword",
                   "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


async def notify_emails() -> list:
    pub = await get_cms("published")
    lst = pub["data"]["settings"].get("notifications", {}).get("emails") or []
    return [e for e in lst if EMAIL_RE.match(e)] or sorted(super_admin_emails())


async def email_team_about_lead(lead: dict, kind="lead"):
    pub = await get_cms("published")
    ns = pub["data"]["settings"].get("notifications", {})
    if (kind == "lead" and not ns.get("onLead", True)) or (kind == "handover" and not ns.get("onHandover", True)):
        return
    text = (f"New {'chat handover request' if kind == 'handover' else 'enquiry'} received.\n\n"
            f"Name: {lead['name']}\nEmail: {lead['email']}\nPhone: {lead.get('phone', '')}\nCompany: {lead.get('company', '')}\n"
            f"Service: {lead.get('service', '')}\nBudget: {lead.get('budget', '')}\nTimeline: {lead.get('timeline', '')}\n\n"
            f"Message:\n{lead.get('message', '')[:2000]}\n\nOpen the admin dashboard → Leads & CRM to respond.")
    for to in await notify_emails():
        try:
            await svc.send_email(to=to, subject=f"New lead: {lead['name']}", html=svc.render_email(text))
        except Exception as e:
            logger.warning(f"lead notification failed: {e}")


@api.post("/public/leads")
async def create_lead(request: Request, background: BackgroundTasks,
                      name: str = Form(...), email: str = Form(...), phone: str = Form(""), company: str = Form(""),
                      country: str = Form(""), service: str = Form(""), budget: str = Form(""), timeline: str = Form(""),
                      message: str = Form(""), consent: bool = Form(False), website: str = Form(""),
                      attachment: Optional[UploadFile] = File(None)):
    svc.rate_limit(request, "lead", 5, 300)
    if website:  # honeypot
        return {"ok": True}
    name, email = name.strip()[:120], email.strip().lower()[:200]
    if not name or not EMAIL_RE.match(email):
        raise HTTPException(400, "Please provide your name and a valid email")
    if not consent:
        raise HTTPException(400, "Please accept the consent checkbox")
    lead = {"id": nid(), "name": name, "email": email, "phone": phone[:40], "company": company[:120], "country": country[:80],
            "service": service[:120], "budget": budget[:60], "timeline": timeline[:60], "message": message[:5000],
            "status": "new", "source": "contact_form", "notes": [], "assigned_to": "", "follow_up": "", "attachment": None,
            "created_at": iso(), "updated_at": iso(),
            "activity": [{"at": iso(), "by": "visitor", "text": "Enquiry submitted via contact form"}]}
    if attachment and attachment.filename:
        data = await attachment.read()
        ct = (attachment.content_type or "").lower()
        if ct not in LEAD_FILE_TYPES or len(data) > 10_000_000:
            raise HTTPException(400, "Attachment must be a PDF, DOC/DOCX, PNG or JPG under 10 MB")
        rec = await store_media(data, ct, attachment.filename[:120], "_leads", "visitor", private=True)
        rec.update({"deleted": False, "created_at": iso(), "alt": ""})
        await db.media.insert_one(dict(rec))
        lead["attachment"] = {"id": rec["id"], "name": rec["name"], "size": rec["size"]}
    await db.leads.insert_one(dict(lead))
    await notify("lead", f"New enquiry from {name}", service, f"/admin/leads?id={lead['id']}")
    background.add_task(email_team_about_lead, lead)
    return {"ok": True, "id": lead["id"]}


@api.get("/admin/leads")
async def list_leads(q: str = "", status: str = "", source: str = "", page: int = 1, size: int = Query(25, le=200),
                     member: dict = Depends(need("leads.read"))):
    f: dict = {}
    if status:
        f["status"] = status
    if source:
        f["source"] = source
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        f["$or"] = [{"name": rx}, {"email": rx}, {"company": rx}, {"service": rx}, {"message": rx}]
    total = await db.leads.count_documents(f)
    items = await db.leads.find(f, {"_id": 0, "activity": 0}).sort("created_at", -1).skip((page - 1) * size).limit(size).to_list(size)
    counts = {s: await db.leads.count_documents({"status": s}) for s in LEAD_STATUSES}
    return {"items": items, "total": total, "page": page, "counts": counts, "statuses": LEAD_STATUSES}


@api.get("/admin/leads/export")
async def export_leads(member: dict = Depends(need("leads.read"))):
    buf = io.StringIO()
    cols = ["created_at", "name", "email", "phone", "company", "country", "service", "budget", "timeline", "status", "assigned_to", "follow_up", "source", "message"]
    w = csv.writer(buf)
    w.writerow(cols)
    async for l in db.leads.find({}, {"_id": 0}).sort("created_at", -1):
        w.writerow([str(l.get(c, "")) for c in cols])
    await audit(member, "leads.export")
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=leads.csv", "Cache-Control": "no-store"})


@api.get("/admin/leads/{lid}")
async def get_lead(lid: str, member: dict = Depends(need("leads.read"))):
    l = await db.leads.find_one({"id": lid}, {"_id": 0})
    if not l:
        raise HTTPException(404, "Lead not found")
    return l


class LeadPatch(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    follow_up: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    budget: Optional[str] = None
    timeline: Optional[str] = None


@api.patch("/admin/leads/{lid}")
async def patch_lead(lid: str, body: LeadPatch, member: dict = Depends(need("leads.write"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "status" in upd and upd["status"] not in LEAD_STATUSES:
        raise HTTPException(400, "Unknown status")
    upd["updated_at"] = iso()
    text = ", ".join(f"{k} → {v}" for k, v in upd.items() if k != "updated_at")
    r = await db.leads.find_one_and_update({"id": lid}, {"$set": upd, "$push": {"activity": {"at": iso(), "by": member.get("email"), "text": f"Updated {text}"}}},
                                           projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not r:
        raise HTTPException(404, "Lead not found")
    await audit(member, "lead.update", lid, upd)
    return r


class TextIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


@api.post("/admin/leads/{lid}/notes")
async def add_note(lid: str, body: TextIn, member: dict = Depends(need("leads.write"))):
    note = {"id": nid(), "at": iso(), "by": member.get("email"), "text": body.text}
    r = await db.leads.find_one_and_update({"id": lid}, {"$push": {"notes": note, "activity": {"at": iso(), "by": member.get("email"), "text": "Added a note"}}},
                                           projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not r:
        raise HTTPException(404, "Lead not found")
    return r


class LeadEmailIn(BaseModel):
    template_id: str


def fill(tpl: str, lead: dict, company: str) -> str:
    vals = {"name": lead.get("name", ""), "service": lead.get("service") or "your project", "company": company,
            "budget": lead.get("budget", ""), "timeline": lead.get("timeline", "")}
    return re.sub(r"\{(\w+)\}", lambda m: vals.get(m.group(1), m.group(0)), tpl)


@api.post("/admin/leads/{lid}/email")
async def email_lead(lid: str, body: LeadEmailIn, request: Request, member: dict = Depends(need("leads.write"))):
    svc.rate_limit(request, f"leadmail:{member['user_id']}", 20, 3600)
    lead = await db.leads.find_one({"id": lid}, {"_id": 0})
    tpl = await db.email_templates.find_one({"id": body.template_id}, {"_id": 0})
    if not lead or not tpl:
        raise HTTPException(404, "Lead or template not found")
    pub = await get_cms("published")
    st = pub["data"]["settings"]
    company = st.get("displayName") or os.environ["EMAIL_FROM_NAME"]
    subject = fill(tpl["subject"], lead, company)[:200]
    try:
        html = svc.render_email(fill(tpl["body"], lead, company))
        eid = await svc.send_email(to=lead["email"], subject=subject, html=html,
                                   reply_to=(st.get("email") or {}).get("replyTo") or (st["contact"].get("email") if st["contact"].get("confirmed") else None))
    except ValueError as e:
        raise HTTPException(400, str(e))
    await db.leads.update_one({"id": lid}, {"$push": {"activity": {"at": iso(), "by": member.get("email"), "text": f"Emailed: {subject}"}},
                                            "$set": {"status": "contacted" if lead["status"] == "new" else lead["status"], "updated_at": iso()}})
    await audit(member, "lead.email", lid, subject)
    return {"ok": True, "email_id": eid}


@api.delete("/admin/leads/{lid}")
async def delete_lead(lid: str, member: dict = Depends(need("leads.write"))):
    r = await db.leads.delete_one({"id": lid})
    if not r.deleted_count:
        raise HTTPException(404, "Lead not found")
    await audit(member, "lead.delete", lid)
    return {"ok": True}


# ===================== Email templates =====================
class TemplateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=8000)


@api.get("/admin/email-templates")
async def list_templates(member: dict = Depends(need("leads.read"))):
    return await db.email_templates.find({}, {"_id": 0}).sort("created_at", 1).to_list(200)


@api.post("/admin/email-templates")
async def create_template(body: TemplateIn, member: dict = Depends(need("leads.write"))):
    t = {**body.model_dump(), "id": nid(), "created_at": iso()}
    await db.email_templates.insert_one(dict(t))
    await audit(member, "template.create", t["id"])
    return t


@api.put("/admin/email-templates/{tid}")
async def update_template(tid: str, body: TemplateIn, member: dict = Depends(need("leads.write"))):
    r = await db.email_templates.find_one_and_update({"id": tid}, {"$set": body.model_dump()}, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not r:
        raise HTTPException(404)
    await audit(member, "template.update", tid)
    return r


@api.delete("/admin/email-templates/{tid}")
async def delete_template(tid: str, member: dict = Depends(need("leads.write"))):
    await db.email_templates.delete_one({"id": tid})
    await audit(member, "template.delete", tid)
    return {"ok": True}


# ===================== Blog =====================
class PostIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=120)
    excerpt: str = ""
    content: str = ""
    cover: str = ""
    video: str = ""
    category: str = ""
    tags: list[str] = []
    author: dict = {}
    status: str = "draft"
    publish_at: Optional[str] = None
    featured: bool = False
    seo: dict = {}


def _post_doc(body: PostIn, member: dict) -> dict:
    if not re.fullmatch(r"[a-z0-9][a-z0-9\-]*", body.slug):
        raise HTTPException(400, "Slug can only contain lowercase letters, numbers and dashes")
    if body.status not in ("draft", "published", "scheduled"):
        raise HTTPException(400, "Unknown status")
    if body.status != "draft" and not can(member, "blog.publish"):
        raise HTTPException(403, "You can only save drafts")
    d = body.model_dump()
    d["content"] = svc.sanitize_html(d["content"])
    d["publish_at"] = d["publish_at"] or (iso() if d["status"] == "published" else None)
    d["updated_at"], d["updated_by"] = iso(), member.get("email")
    return d


@api.get("/admin/posts")
async def admin_posts(member: dict = Depends(need("content.read"))):
    return await db.posts.find({}, {"_id": 0, "content": 0}).sort("updated_at", -1).to_list(500)


@api.get("/admin/posts/{pid}")
async def admin_post(pid: str, member: dict = Depends(need("content.read"))):
    p = await db.posts.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404)
    return p


@api.post("/admin/posts")
async def create_post(body: PostIn, member: dict = Depends(need("blog.write"))):
    d = {**_post_doc(body, member), "id": nid(), "created_at": iso()}
    if await db.posts.find_one({"slug": d["slug"]}):
        raise HTTPException(409, "A post with this slug already exists")
    await db.posts.insert_one(dict(d))
    await audit(member, "post.create", d["id"], d["title"])
    return d


@api.put("/admin/posts/{pid}")
async def update_post(pid: str, body: PostIn, member: dict = Depends(need("blog.write"))):
    d = _post_doc(body, member)
    if await db.posts.find_one({"slug": d["slug"], "id": {"$ne": pid}}):
        raise HTTPException(409, "A post with this slug already exists")
    r = await db.posts.find_one_and_update({"id": pid}, {"$set": d}, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not r:
        raise HTTPException(404)
    await audit(member, "post.update", pid, d["title"])
    return r


@api.delete("/admin/posts/{pid}")
async def delete_post(pid: str, member: dict = Depends(need("blog.publish"))):
    await db.posts.delete_one({"id": pid})
    await audit(member, "post.delete", pid)
    return {"ok": True}


def _live_filter():
    return {"status": {"$in": ["published", "scheduled"]}, "publish_at": {"$lte": iso()}}


@api.get("/public/blog")
async def public_blog(q: str = "", category: str = "", tag: str = "", page: int = 1, size: int = Query(9, le=50)):
    f = _live_filter()
    if category:
        f["category"] = category
    if tag:
        f["tags"] = tag
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        f["$or"] = [{"title": rx}, {"excerpt": rx}, {"tags": rx}]
    total = await db.posts.count_documents(f)
    items = await db.posts.find(f, {"_id": 0, "content": 0}).sort([("featured", -1), ("publish_at", -1)]).skip((page - 1) * size).limit(size).to_list(size)
    cats = await db.posts.distinct("category", _live_filter())
    return {"items": items, "total": total, "page": page, "pages": max(1, -(-total // size)), "categories": [c for c in cats if c]}


@api.get("/public/blog/{slug}")
async def public_post(slug: str):
    p = await db.posts.find_one({"slug": slug, **_live_filter()}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Post not found")
    return p


# ===================== AI chat =====================
LANG_NAMES = {"en": "English", "ta": "Tamil", "hi": "Hindi", "ml": "Malayalam", "kn": "Kannada", "te": "Telugu", "ar": "Arabic",
              "fr": "French", "de": "German", "es": "Spanish"}


def build_system(data: dict, lang: str, private_ai: dict) -> str:
    st = data["settings"]
    c = st["contact"]
    services = "\n".join(f"- {s['title']}: {s['summary']}" for s in data["services"] if s.get("visible"))
    labels = {"company": "company project", "founder_experience": "founder's previous professional experience (NOT company-owned work)",
              "personal": "personal project", "demo": "demonstration project"}
    projects = "\n".join(f"- {p['name']} ({p['category']}, {p['platform']}) — {labels.get(p['classification'], p['classification'])}" for p in data["projects"] if p.get("visible"))
    tech = ", ".join(t["name"] for t in data["technologies"])
    kb = "\n".join(f"- {k['title']}: {k['content']}" for k in private_ai.get("knowledge", []))
    contact = f"Email {c.get('email')}, phone {c.get('phone')}" if c.get("confirmed") else "Ask the visitor to use the Contact page form."
    f = data["founder"]
    return (f"You are the friendly website assistant for {st['companyName']} ({st['tagline']}), a software company in Ooty, India.\n"
            f"Reply in {LANG_NAMES.get(lang, 'English')} unless the visitor writes in another supported language. Keep answers concise (under 120 words), warm and professional.\n"
            f"Only use the facts below; if unsure, say so and offer to connect the visitor with the team. Never invent prices, clients or timelines. "
            f"Never describe the founder's previous employment projects as company-owned work.\n\n"
            f"SERVICES:\n{services}\n\nPROJECTS:\n{projects}\n\nTECHNOLOGIES: {tech}\n\nFOUNDER: {f['name']} — {f['title']}. {f['bio']}\n\n"
            f"ABOUT: {data['about']['intro']} Mission: {data['about']['mission']}\n\nKNOWLEDGE BASE:\n{kb}\n\nCONTACT: {contact}\n"
            f"When a visitor describes a project or asks for a quote/consultation, ask for their name, email and project details, and tell them they can tap 'Talk to a human'.")


def _available(ai: dict, tz: str) -> bool:
    a = ai.get("availability", {})
    if a.get("mode") != "hours":
        return True
    t = datetime.now(ZoneInfo(tz or "Asia/Kolkata")).strftime("%H:%M")
    return a.get("start", "00:00") <= t <= a.get("end", "23:59")


class ChatIn(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=2000)
    language: str = "en"


@api.post("/public/chat")
async def chat(body: ChatIn, request: Request):
    svc.rate_limit(request, "chat", 15, 60)
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    pub = (await get_cms("published"))["data"]
    draft_ai = (await get_cms("draft"))["data"]["ai"]
    ai = pub["ai"]
    if not ai.get("chatEnabled"):
        raise HTTPException(403, "Chat is disabled")
    lang = body.language if body.language in ai.get("languages", ["en"]) else ai.get("defaultLanguage", "en")
    sid = body.session_id or nid()
    sess = await db.chat_sessions.find_one({"id": sid}, {"_id": 0}) or {"id": sid, "messages": [], "created_at": iso(), "language": lang}
    history = sess["messages"][-12:]
    store = ai.get("storeConversations", True)

    async def gen():
        yield f"data: {json.dumps({'session_id': sid})}\n\n"
        if not _available(ai, pub["settings"].get("timezone")):
            reply = ai["availability"].get("offlineMessage", "We're offline right now.")
            yield f"data: {json.dumps({'delta': reply})}\n\n"
        else:
            transcript = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history)
            system = build_system(pub, lang, {"knowledge": pub["ai"].get("knowledge") or draft_ai.get("knowledge", [])})
            if transcript:
                system += f"\n\nCONVERSATION SO FAR:\n{transcript}"
            llm = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=sid, system_message=system).with_model("openai", "gpt-6-luna")
            reply = ""
            try:
                async for ev in llm.stream_message(UserMessage(text=body.message)):
                    if isinstance(ev, TextDelta):
                        reply += ev.content
                        yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                    elif isinstance(ev, StreamDone):
                        break
            except Exception as e:
                logger.error(f"chat error: {e}")
                reply = reply or "Sorry, I'm having trouble right now. Please use the contact form and we'll get back to you."
                yield f"data: {json.dumps({'delta': reply})}\n\n"
        if store:
            msgs = [{"role": "user", "content": body.message, "at": iso()}, {"role": "assistant", "content": reply, "at": iso()}]
            await db.chat_sessions.update_one({"id": sid}, {"$push": {"messages": {"$each": msgs}},
                                                           "$set": {"updated_at": iso(), "language": lang},
                                                           "$setOnInsert": {"created_at": iso(), "id": sid}}, upsert=True)
        await db.analytics.insert_one({"kind": "chat", "day": iso()[:10], "at": iso()})
        yield f"data: {json.dumps({'done': True})}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


class HandoverIn(BaseModel):
    session_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=120)
    email: str
    phone: str = ""
    message: str = ""


@api.post("/public/chat/handover")
async def handover(body: HandoverIn, request: Request, background: BackgroundTasks):
    svc.rate_limit(request, "handover", 5, 300)
    if not EMAIL_RE.match(body.email):
        raise HTTPException(400, "Please enter a valid email")
    sess = await db.chat_sessions.find_one({"id": body.session_id}, {"_id": 0}) if body.session_id else None
    transcript = "\n".join(f"{m['role']}: {m['content']}" for m in (sess or {}).get("messages", [])[-20:])
    lead = {"id": nid(), "name": body.name, "email": body.email.lower(), "phone": body.phone[:40], "company": "", "country": "",
            "service": "", "budget": "", "timeline": "", "message": (body.message + ("\n\n--- Chat transcript ---\n" + transcript if transcript else ""))[:8000],
            "status": "new", "source": "chat", "notes": [], "assigned_to": "", "follow_up": "", "attachment": None,
            "chat_session": body.session_id, "created_at": iso(), "updated_at": iso(),
            "activity": [{"at": iso(), "by": "visitor", "text": "Requested a human from the chat assistant"}]}
    await db.leads.insert_one(dict(lead))
    if sess:
        await db.chat_sessions.update_one({"id": body.session_id}, {"$set": {"lead_id": lead["id"], "handover": True}})
    await notify("handover", f"{body.name} asked to talk to a human", body.message[:200], f"/admin/leads?id={lead['id']}")
    background.add_task(email_team_about_lead, lead, "handover")
    return {"ok": True}


@api.get("/admin/conversations")
async def conversations(member: dict = Depends(need("ai.manage")), limit: int = 100):
    return await db.chat_sessions.find({}, {"_id": 0}).sort("updated_at", -1).limit(limit).to_list(limit)


@api.delete("/admin/conversations/{cid}")
async def delete_conversation(cid: str, member: dict = Depends(need("ai.manage"))):
    await db.chat_sessions.delete_one({"id": cid})
    await audit(member, "conversation.delete", cid)
    return {"ok": True}


async def purge_conversations():
    pub = await get_cms("published")
    days = int(pub["data"]["ai"].get("retentionDays") or 0)
    if days > 0:
        cutoff = (now() - timedelta(days=days)).isoformat()
        await db.chat_sessions.delete_many({"updated_at": {"$lt": cutoff}})


# ===================== Analytics =====================
class TrackIn(BaseModel):
    path: str = Field(max_length=300)
    referrer: str = Field("", max_length=500)


def device_of(ua: str) -> str:
    ua = ua.lower()
    if "ipad" in ua or "tablet" in ua:
        return "tablet"
    if "mobi" in ua or "android" in ua or "iphone" in ua:
        return "mobile"
    return "desktop"


@api.post("/public/track")
async def track(body: TrackIn, request: Request):
    svc.rate_limit(request, "track", 60, 60)
    if request.headers.get("dnt") == "1" or body.path.startswith("/admin"):
        return {"ok": True}
    ua = request.headers.get("user-agent", "")
    if re.search(r"bot|crawl|spider|headless", ua, re.I):
        return {"ok": True}
    day = iso()[:10]
    visitor = hashlib.sha256(f"{os.environ['ANALYTICS_SALT']}|{svc.client_ip(request)}|{ua}|{day}".encode()).hexdigest()[:16]
    ref = re.sub(r"^https?://([^/]+).*$", r"\1", body.referrer) if body.referrer else ""
    host = request.headers.get("host", "")
    source = "direct" if not ref or ref == host else ref
    await db.analytics.insert_one({"kind": "view", "day": day, "at": iso(), "path": body.path.split("?")[0], "source": source,
                                   "device": device_of(ua), "visitor": visitor})
    return {"ok": True}


@api.get("/admin/analytics")
async def analytics(start: str = "", end: str = "", member: dict = Depends(need("analytics.read"))):
    end = end or iso()[:10]
    start = start or (now() - timedelta(days=29)).isoformat()[:10]
    rng = {"day": {"$gte": start, "$lte": end}}
    views = {"kind": "view", **rng}

    async def group(field, f=views, limit=10):
        return [{"key": r["_id"] or "unknown", "count": r["n"]} async for r in db.analytics.aggregate(
            [{"$match": f}, {"$group": {"_id": f"${field}", "n": {"$sum": 1}}}, {"$sort": {"n": -1}}, {"$limit": limit}])]
    daily = {r["_id"]: {"views": r["v"], "visitors": len(r["u"])} async for r in db.analytics.aggregate(
        [{"$match": views}, {"$group": {"_id": "$day", "v": {"$sum": 1}, "u": {"$addToSet": "$visitor"}}}])}
    lead_rng = {"created_at": {"$gte": start, "$lte": end + "T23:59:59"}}
    leads_daily = {r["_id"]: r["n"] async for r in db.leads.aggregate(
        [{"$match": lead_rng}, {"$group": {"_id": {"$substr": ["$created_at", 0, 10]}, "n": {"$sum": 1}}}])}
    chats_daily = {r["_id"]: r["n"] async for r in db.analytics.aggregate(
        [{"$match": {"kind": "chat", **rng}}, {"$group": {"_id": "$day", "n": {"$sum": 1}}}])}
    days, d = [], datetime.fromisoformat(start)
    while d.date().isoformat() <= end and len(days) < 400:
        k = d.date().isoformat()
        days.append({"day": k, **daily.get(k, {"views": 0, "visitors": 0}), "leads": leads_daily.get(k, 0), "chats": chats_daily.get(k, 0)})
        d += timedelta(days=1)
    visitors = len(await db.analytics.distinct("visitor", views))
    total_leads = await db.leads.count_documents(lead_rng)
    won = await db.leads.count_documents({**lead_rng, "status": "won"})
    services = [{"key": r["_id"] or "unspecified", "count": r["n"]} async for r in db.leads.aggregate(
        [{"$match": lead_rng}, {"$group": {"_id": "$service", "n": {"$sum": 1}}}, {"$sort": {"n": -1}}, {"$limit": 10}])]
    return {"start": start, "end": end, "visitors": visitors, "views": await db.analytics.count_documents(views),
            "leads": total_leads, "contact_submissions": await db.leads.count_documents({**lead_rng, "source": "contact_form"}),
            "won": won, "conversion": round(won / total_leads * 100, 1) if total_leads else 0,
            "chats": await db.analytics.count_documents({"kind": "chat", **rng}), "voice": 0,
            "top_pages": await group("path"), "sources": await group("source"), "devices": await group("device"),
            "services": services, "daily": days}


@api.get("/admin/analytics/export")
async def analytics_export(start: str = "", end: str = "", member: dict = Depends(need("analytics.read"))):
    data = await analytics(start, end, member)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["day", "views", "visitors", "leads", "chats"])
    for r in data["daily"]:
        w.writerow([r["day"], r["views"], r["visitors"], r["leads"], r["chats"]])
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=analytics.csv"})


@api.get("/admin/stats")
async def stats(member: dict = Depends(need("content.read"))):
    d = await get_draft(member)
    week = (now() - timedelta(days=7)).isoformat()
    return {"leads_total": await db.leads.count_documents({}), "leads_new": await db.leads.count_documents({"status": "new"}),
            "leads_week": await db.leads.count_documents({"created_at": {"$gte": week}}),
            "views_week": await db.analytics.count_documents({"kind": "view", "day": {"$gte": week[:10]}}),
            "posts": await db.posts.count_documents({}), "media": await db.media.count_documents({"deleted": False, "private": False}),
            "pages": len(d["data"]["pages"]), "projects": len(d["data"]["projects"]), "has_unpublished": d["has_unpublished"],
            "contact_confirmed": d["data"]["settings"]["contact"].get("confirmed", False),
            "unread_notifications": await db.notifications.count_documents({"read": False})}


# ===================== Users / roles / security =====================
@api.get("/admin/users")
async def list_users(admin: dict = Depends(need("users.manage"))):
    people = await db.users.find(IN_ENV, {"_id": 0}).sort("created_at", 1).to_list(1000)
    invites = await db.invites.find({"used": False}, {"_id": 0}).to_list(200)
    return {"roles": [r for r in ROLES if RANK[r] <= RANK[admin["role"]]], "permissions": {k: sorted(v) for k, v in PERMS.items()},
            "users": [{**p, "role": effective_role(p.get("role"))} for p in people], "invites": invites,
            "super_admin_emails": sorted(super_admin_emails())}


class RoleIn(BaseModel):
    role: str


@api.patch("/admin/users/{user_id}/role")
async def set_role(user_id: str, body: RoleIn, admin: dict = Depends(need("users.manage"))):
    if body.role not in ROLES or RANK[body.role] > RANK[admin["role"]]:
        raise HTTPException(403, "Not allowed")
    target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if target is None:
        raise HTTPException(404, "Not found")
    if (effective_role(target.get("role")) == "super_admin" and body.role != "super_admin"
            and await db.users.count_documents({"role": "super_admin", **IN_ENV}) <= 1):
        raise HTTPException(409, "Keep at least one active Super Admin")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": body.role, "revoked": body.role == "none"}})
    await audit(admin, "user.role", user_id, body.role)
    return {"user_id": user_id, "role": body.role}


class InviteIn(BaseModel):
    email: str
    role: str
    redirect_url: str = ""


@api.post("/admin/users/invite")
async def invite(body: InviteIn, admin: dict = Depends(need("users.manage"))):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email) or body.role not in ROLES or body.role == "none":
        raise HTTPException(400, "Valid email and role required")
    await db.invites.update_one({"email": email}, {"$set": {"email": email, "role": body.role, "used": False, "by": admin.get("email"), "at": iso()}}, upsert=True)
    sent = True
    try:
        payload = {"email_address": email, "ignore_existing": True, "notify": True}
        if body.redirect_url.startswith("https://"):
            payload["redirect_url"] = body.redirect_url
        await run_in_threadpool(lambda: clerk("POST", "/invitations", json=payload))
    except Exception as e:
        logger.warning(f"invite email failed: {e}")
        sent = False
    await audit(admin, "user.invite", email, body.role)
    return {"ok": True, "email_sent": sent}


@api.delete("/admin/users/invite/{email}")
async def revoke_invite(email: str, admin: dict = Depends(need("users.manage"))):
    await db.invites.delete_one({"email": email.lower()})
    await audit(admin, "user.invite_revoke", email)
    return {"ok": True}


def _revoke_all(user_id: str) -> int:
    sessions = clerk("GET", f"/sessions?user_id={user_id}&status=active")
    for s in sessions:
        clerk("POST", f"/sessions/{s['id']}/revoke")
    return len(sessions)


@api.post("/admin/users/{user_id}/revoke-sessions")
async def revoke_sessions(user_id: str, admin: dict = Depends(need("users.manage"))):
    n = await run_in_threadpool(_revoke_all, user_id)
    await audit(admin, "user.revoke_sessions", user_id, n)
    return {"revoked": n}


@api.delete("/admin/users/{user_id}")
async def remove_user(user_id: str, admin: dict = Depends(need("users.manage"))):
    target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Not found")
    if effective_role(target.get("role")) == "super_admin" and await db.users.count_documents({"role": "super_admin", **IN_ENV}) <= 1:
        raise HTTPException(409, "The last Super Admin cannot be removed")
    if user_id == admin["user_id"]:
        raise HTTPException(409, "You cannot remove yourself")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": "none", "revoked": True, "removed_at": iso()}})
    with suppress(Exception):
        await run_in_threadpool(_revoke_all, user_id)
    await audit(admin, "user.remove_access", user_id)
    return {"ok": True}


@api.get("/admin/security/logins")
async def logins(member: dict = Depends(need("users.manage")), limit: int = 200):
    return await db.login_events.find({}, {"_id": 0}).sort("at", -1).limit(limit).to_list(limit)


@api.get("/admin/audit")
async def audit_log(member: dict = Depends(need("audit.read")), q: str = "", limit: int = Query(200, le=1000)):
    f = {"$or": [{"action": {"$regex": re.escape(q), "$options": "i"}}, {"email": {"$regex": re.escape(q), "$options": "i"}}]} if q else {}
    return await db.audit.find(f, {"_id": 0}).sort("at", -1).limit(limit).to_list(limit)


@api.get("/admin/notifications")
async def notifications(member: dict = Depends(need("content.read"))):
    return await db.notifications.find({}, {"_id": 0}).sort("at", -1).limit(100).to_list(100)


@api.post("/admin/notifications/read")
async def read_notifications(member: dict = Depends(need("content.read"))):
    await db.notifications.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/admin/test-email")
async def test_email(request: Request, member: dict = Depends(need("settings.manage"))):
    svc.rate_limit(request, "testmail", 3, 600)
    if not member.get("email"):
        raise HTTPException(400, "Your account has no verified email")
    await svc.send_email(to=member["email"], subject="Test email from your website",
                         html=svc.render_email("This is a test email from your website admin dashboard. Email delivery is working."))
    return {"ok": True}


# ===================== Backups =====================
@api.get("/admin/backup")
async def backup(member: dict = Depends(need("backup"))):
    out = {"created_at": iso(), "format": "nilgiris-cms-backup-v1",
           "cms": await db.cms.find({}, {"_id": 0}).to_list(10),
           "posts": await db.posts.find({}, {"_id": 0}).to_list(5000),
           "email_templates": await db.email_templates.find({}, {"_id": 0}).to_list(500),
           "media": await db.media.find({}, {"_id": 0}).to_list(20000),
           "leads": await db.leads.find({}, {"_id": 0}).to_list(50000),
           "invites": await db.invites.find({}, {"_id": 0}).to_list(500)}
    await audit(member, "backup.download")
    return Response(json.dumps(out, default=str), media_type="application/json", headers={
        "Content-Disposition": f"attachment; filename=nilgiris-backup-{iso()[:10]}.json", "Cache-Control": "no-store"})


@api.post("/admin/restore")
async def restore(file: UploadFile = File(...), member: dict = Depends(need("backup"))):
    try:
        data = json.loads(await file.read())
        assert data.get("format") == "nilgiris-cms-backup-v1"
        draft = next(c for c in data["cms"] if c["key"] == "draft")
        validate_content(draft["data"])
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "This is not a valid backup file")
    cur = await get_cms("published")
    await db.versions.insert_one({"id": nid(), "at": iso(), "by": member.get("email"), "kind": "pre-restore", "note": "Automatic snapshot before restore", "data": cur["data"]})
    for c in data["cms"]:
        await db.cms.replace_one({"key": c["key"]}, c, upsert=True)
    for coll, key in (("posts", "id"), ("email_templates", "id"), ("media", "id"), ("leads", "id"), ("invites", "email")):
        for doc in data.get(coll, []):
            await db[coll].replace_one({key: doc[key]}, doc, upsert=True)
    await audit(member, "backup.restore", file.filename)
    return {"ok": True}


# ===================== SEO =====================
@api.get("/sitemap.xml")
async def sitemap(request: Request):
    pub = (await get_cms("published"))["data"]
    base = (pub["seo"].get("siteUrl") or f"https://{request.headers.get('x-forwarded-host') or request.headers.get('host')}").rstrip("/")
    urls = [("/" if p["slug"] == "/" else "/" + p["slug"]) for p in pub["pages"] if not p.get("seo", {}).get("noindex")]
    urls += [f"/blog/{p['slug']}" async for p in db.posts.find(_live_filter(), {"slug": 1})]
    urls += [f"/portfolio/{p['slug']}" for p in pub["projects"] if p.get("slug") and p.get("visible", True)]
    body = "".join(f"<url><loc>{base}{u}</loc></url>" for u in urls)
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>',
                    media_type="application/xml", headers={"Cache-Control": "public, max-age=600"})


@api.get("/robots.txt")
async def robots():
    pub = (await get_cms("published"))["data"]
    return PlainTextResponse(pub["seo"].get("robots") or "User-agent: *\nAllow: /", headers={"Cache-Control": "public, max-age=600"})


@api.get("/health")
async def health():
    return {"ok": True}


PERMS["super_admin"] = {"*"}  # includes publish, users.manage, settings.manage, backup


app.include_router(api)
app.include_router(clerk_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"], expose_headers=["ETag"])


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if request.url.path.startswith("/api/admin") or request.url.path == "/api/me":
        resp.headers["Cache-Control"] = "private, no-store"
    return resp


async def ensure_indexes():
    for coll, models in INDEXES.items():
        for m in models:
            try:
                await db[coll].create_indexes([m])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", coll, m.document["name"], exc)


@app.on_event("startup")
async def startup():
    await ensure_seed()
    for old, new in RETIRED_ROLES.items():
        await db.users.update_many({"role": old}, {"$set": {"role": new}})
    app.state.index_task = asyncio.create_task(ensure_indexes())
    with suppress(Exception):
        await purge_conversations()
    try:
        await run_in_threadpool(svc.init_storage)
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
