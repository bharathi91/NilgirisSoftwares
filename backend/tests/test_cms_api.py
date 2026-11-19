"""Regression tests for Nilgiris CMS backend (auth/RBAC, draft/publish, versions, media, leads, blog, users, backups)."""
import copy
import io
import os
import subprocess
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def _token(email):
    out = subprocess.run(["python3", "/app/scripts/clerk_test_auth.py", "token", email], capture_output=True, text=True, timeout=60)
    return out.stdout.strip().splitlines()[-1]


@pytest.fixture(scope="session")
def sa():
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {_token('superadmin+clerk_test@example.com')}"
    return s


@pytest.fixture(scope="session")
def editor():
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {_token('editor+clerk_test@example.com')}"
    return s


@pytest.fixture(scope="session")
def outsider():
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {_token('outsider+clerk_test@example.com')}"
    return s


# ---- Health / public site ----
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200


def test_public_site_etag_304():
    r = requests.get(f"{API}/public/site")
    assert r.status_code == 200
    etag = r.headers.get("ETag")
    assert etag
    d = r.json()["data"]
    assert "pages" in d and "notifications" not in d["settings"]
    assert "knowledge" not in d["ai"]
    # Through the CDN the body is gzipped and ETag becomes weak (W/"..."); browsers echo it back.
    r2 = requests.get(f"{API}/public/site", headers={"If-None-Match": etag})
    assert r2.status_code == 304, f"weak etag {etag} not honoured"


# ---- Auth / RBAC ----
def test_admin_requires_token():
    assert requests.get(f"{API}/admin/draft").status_code == 401


def test_outsider_forbidden(outsider):
    assert outsider.get(f"{API}/admin/draft").status_code == 403
    assert outsider.get(f"{API}/admin/leads").status_code == 403


def test_editor_cannot_publish_or_manage_users(editor):
    me = editor.get(f"{API}/me").json()
    assert me["role"] == "editor"
    assert editor.post(f"{API}/admin/publish", json={"note": "x"}).status_code == 403
    assert editor.get(f"{API}/admin/users").status_code == 403
    assert editor.post(f"{API}/admin/users/invite", json={"email": "TEST_x@example.com", "role": "editor"}).status_code == 403


# ---- Draft / publish / conflicts ----
def test_draft_stale_rev_conflict(sa):
    d = sa.get(f"{API}/admin/draft").json()
    r = sa.put(f"{API}/admin/draft", json={"rev": d["rev"] - 1, "data": d["data"]})
    assert r.status_code == 409


def test_publish_blocked_by_broken_link_then_discard(sa):
    d = sa.get(f"{API}/admin/draft").json()
    data = copy.deepcopy(d["data"])
    data["navigation"]["items"].append({"label": "TEST_Broken", "href": "/does-not-exist"})
    r = sa.put(f"{API}/admin/draft", json={"rev": d["rev"], "data": data})
    assert r.status_code == 200
    p = sa.post(f"{API}/admin/publish", json={"note": "TEST should fail"})
    assert p.status_code == 400
    assert "does-not-exist" in str(p.json())
    assert sa.post(f"{API}/admin/draft/discard").status_code == 200
    d2 = sa.get(f"{API}/admin/draft").json()
    assert not any(i["label"] == "TEST_Broken" for i in d2["data"]["navigation"]["items"])


def test_versions_list_and_get(sa):
    v = sa.get(f"{API}/admin/versions").json()
    assert isinstance(v, list) and len(v) >= 1
    assert any(x.get("note") == "Initial content" for x in v)
    one = sa.get(f"{API}/admin/versions/{v[0]['id']}").json()
    assert "data" in one
    assert sa.get(f"{API}/admin/versions/nope").status_code == 404


# ---- Media ----
def test_media_upload_serve_variants_delete(sa):
    from PIL import Image
    b = io.BytesIO()
    Image.new("RGB", (1400, 800), (200, 30, 30)).save(b, "PNG")
    r = sa.post(f"{API}/admin/media", files={"file": ("TEST_img.png", b.getvalue(), "image/png")}, data={"folder": "test"})
    assert r.status_code == 200, r.text
    m = r.json()
    try:
        f = requests.get(f"{BASE_URL}{m['url']}")
        assert f.status_code == 200
        # preview ingress overrides Cache-Control with no-store; app sets immutable (verified on localhost:8001)
        et = f.headers["ETag"]
        assert requests.get(f"{BASE_URL}{m['url']}", headers={"If-None-Match": et}).status_code == 304
        v = requests.get(f"{BASE_URL}{m['url']}?w=480")
        assert v.headers["Content-Type"].startswith("image/webp")
        p = sa.patch(f"{API}/admin/media/{m['id']}", json={"name": "TEST_renamed", "alt": "alt text"})
        assert p.json()["name"] == "TEST_renamed"
        assert sa.get(f"{API}/admin/media/{m['id']}/usage").status_code == 200
        c = sa.post(f"{API}/admin/media/{m['id']}/crop", json={"x": 0, "y": 0, "w": 0.5, "h": 0.5})
        assert c.status_code == 200 and c.json()["width"] == 700
    finally:
        assert sa.delete(f"{API}/admin/media/{m['id']}").status_code == 200
    assert sa.post(f"{API}/admin/media", files={"file": ("x.exe", b"MZ", "application/x-msdownload")}).status_code == 415


# ---- Leads ----
def test_lead_requires_consent():
    r = requests.post(f"{API}/public/leads", data={"name": "TEST_NoConsent", "email": "delivered@resend.dev"})
    assert r.status_code == 400


def test_lead_crud_email_export(sa):
    r = requests.post(f"{API}/public/leads", data={"name": "TEST_Lead API", "email": "delivered@resend.dev", "consent": "true",
                                                  "service": "Web Development", "message": "TEST message"})
    assert r.status_code == 200, r.text
    lid = r.json()["id"]
    try:
        assert sa.get(f"{API}/admin/leads/{lid}").json()["name"] == "TEST_Lead API"
        assert sa.patch(f"{API}/admin/leads/{lid}", json={"status": "qualified"}).json()["status"] == "qualified"
        assert sa.patch(f"{API}/admin/leads/{lid}", json={"status": "bogus"}).status_code == 400
        assert len(sa.post(f"{API}/admin/leads/{lid}/notes", json={"text": "TEST note"}).json()["notes"]) == 1
        tpls = sa.get(f"{API}/admin/email-templates").json()
        assert tpls
        e = sa.post(f"{API}/admin/leads/{lid}/email", json={"template_id": tpls[0]["id"]})
        assert e.status_code == 200, e.text
        csv = sa.get(f"{API}/admin/leads/export")
        assert csv.status_code == 200 and "TEST_Lead API" in csv.text
    finally:
        assert sa.delete(f"{API}/admin/leads/{lid}").status_code == 200
    assert sa.get(f"{API}/admin/leads/{lid}").status_code == 404


# ---- Blog ----
def test_blog_draft_hidden_published_visible(sa):
    slug = f"test-post-{int(time.time())}"
    body = {"title": "TEST_Post", "slug": slug, "excerpt": "e", "content": "<p>Hello<script>alert(1)</script></p>", "status": "draft"}
    r = sa.post(f"{API}/admin/posts", json=body)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    try:
        assert "<script" not in r.json()["content"]
        assert requests.get(f"{API}/public/blog/{slug}").status_code == 404
        u = sa.put(f"{API}/admin/posts/{pid}", json={**body, "status": "published"})
        assert u.status_code == 200
        assert requests.get(f"{API}/public/blog/{slug}").status_code == 200
        assert any(p["slug"] == slug for p in requests.get(f"{API}/public/blog").json()["items"])
    finally:
        sa.delete(f"{API}/admin/posts/{pid}")
    assert requests.get(f"{API}/public/blog/{slug}").status_code == 404


def test_editor_cannot_publish_post(editor):
    r = editor.post(f"{API}/admin/posts", json={"title": "TEST_E", "slug": f"test-e-{int(time.time())}", "status": "published"})
    assert r.status_code == 403


# ---- Users ----
def test_users_invite_and_last_super_admin(sa):
    r = sa.post(f"{API}/admin/users/invite", json={"email": "test_invite+clerk_test@example.com", "role": "editor"})
    assert r.status_code == 200
    u = sa.get(f"{API}/admin/users").json()
    assert any(i["email"] == "test_invite+clerk_test@example.com" for i in u["invites"])
    assert sa.delete(f"{API}/admin/users/invite/test_invite+clerk_test@example.com").status_code == 200
    supers = [x for x in u["users"] if x["role"] == "super_admin"]
    if len(supers) == 1:
        rr = sa.patch(f"{API}/admin/users/{supers[0]['user_id']}/role", json={"role": "editor"})
        assert rr.status_code == 409


# ---- Backups / misc ----
def test_backup_download(sa):
    r = sa.get(f"{API}/admin/backup")
    assert r.status_code == 200
    assert r.json()["format"] == "nilgiris-cms-backup-v1"


def test_admin_list_endpoints(sa):
    for p in ["stats", "analytics", "audit", "notifications", "conversations", "security/logins", "media", "posts", "email-templates"]:
        assert sa.get(f"{API}/admin/{p}").status_code == 200, p


def test_sitemap_robots():
    assert "<urlset" in requests.get(f"{API}/sitemap.xml").text
    assert requests.get(f"{API}/robots.txt").status_code == 200
