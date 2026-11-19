"""Portfolio (/portfolio) integration tests: public API + ETag, résumé, contact->leads, sitemap, admin draft/publish/restore, RBAC."""
import copy
import os
import subprocess

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ORIG_HEADLINE = "iOS Mobile Engineer | Swift & Architecture Patterns | High-Quality Mobile Apps"


def _token(email):
    out = subprocess.run(["python3", "/app/scripts/clerk_test_auth.py", "token", email], capture_output=True, text=True, timeout=60)
    return out.stdout.strip().splitlines()[-1]


def _sess(email):
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {_token(email)}"
    return s


@pytest.fixture(scope="module")
def sa():
    return _sess("superadmin+clerk_test@example.com")


@pytest.fixture(scope="module")
def editor():
    return _sess("editor+clerk_test@example.com")


@pytest.fixture(scope="module")
def outsider():
    return _sess("outsider+clerk_test@example.com")


# ---- Public portfolio ----
class TestPublicPortfolio:
    def test_public_portfolio_etag_304(self):
        r = requests.get(f"{API}/public/portfolio")
        assert r.status_code == 200
        j = r.json()
        assert "version" in j and "data" in j
        d = j["data"]
        assert len(d["projects"]) == 12
        assert len(d["experiences"]) == 8
        assert d["resume"]["url"] == "/api/public/portfolio/resume"
        assert "media_id" not in d["resume"]
        etag = r.headers.get("ETag")
        assert etag
        r2 = requests.get(f"{API}/public/portfolio", headers={"If-None-Match": etag})
        assert r2.status_code == 304

    def test_public_site_portfolio_nav(self):
        j = requests.get(f"{API}/public/site").json()
        assert j["portfolio_nav"]["visible"] is True
        assert j["portfolio_nav"]["label"] == "My Portfolio"

    def test_resume_pdf(self):
        r = requests.get(f"{API}/public/portfolio/resume")
        assert r.status_code == 200
        assert r.headers["Content-Type"].startswith("application/pdf")
        assert "attachment" in r.headers.get("Content-Disposition", "")
        assert 350_000 < len(r.content) < 500_000
        assert r.content[:4] == b"%PDF"

    def test_sitemap(self):
        r = requests.get(f"{API}/sitemap.xml")
        assert r.status_code == 200
        x = r.text
        pid = requests.get(f"{API}/public/portfolio").json()["data"]["projects"][0]["id"]
        assert "/portfolio</loc>" in x and "/portfolio/quick-view</loc>" in x
        assert f"/portfolio/work/{pid}</loc>" in x
        assert "/projects/dubai-culture</loc>" in x
        assert "/portfolio/dubai-culture" not in x

    def test_contact_invalid_email(self):
        r = requests.post(f"{API}/public/portfolio/contact", json={"name": "TEST_x", "email": "bad", "message": "hi"})
        assert r.status_code in (400, 429)

    def test_contact_creates_lead(self, sa):
        r = requests.post(f"{API}/public/portfolio/contact", json={"name": "TEST_PF Contact", "email": "delivered@resend.dev",
                                                                     "subject": "TEST subject", "message": "TEST message"})
        assert r.status_code == 200 and r.json()["ok"] is True
        items = sa.get(f"{API}/admin/leads", params={"q": "TEST_PF Contact", "source": "portfolio"}).json()["items"]
        assert items, "portfolio lead not found"
        lead = items[0]
        assert lead["source"] == "portfolio" and lead["service"] == "TEST subject"
        for it in items:
            assert sa.delete(f"{API}/admin/leads/{it['id']}").status_code in (200, 204)
        assert sa.get(f"{API}/admin/leads/{lead['id']}").status_code == 404


# ---- Admin portfolio ----
class TestAdminPortfolio:
    def test_rbac(self, outsider, editor):
        assert outsider.get(f"{API}/admin/portfolio/draft").status_code == 403
        assert editor.get(f"{API}/admin/portfolio/draft").status_code == 200
        assert editor.post(f"{API}/admin/portfolio/publish", json={"note": "x"}).status_code == 403
        assert requests.get(f"{API}/admin/portfolio/draft").status_code in (401, 403)

    def test_stale_rev_409_and_missing_keys_400(self, sa):
        d = sa.get(f"{API}/admin/portfolio/draft").json()
        r = sa.put(f"{API}/admin/portfolio/draft", json={"rev": d["rev"] - 1, "data": d["data"]})
        assert r.status_code == 409
        r = sa.put(f"{API}/admin/portfolio/draft", json={"rev": d["rev"], "data": {"profile": {}}})
        assert r.status_code == 400

    def test_draft_publish_restore_cycle(self, sa):
        before_versions = sa.get(f"{API}/admin/portfolio/versions").json()
        d = sa.get(f"{API}/admin/portfolio/draft").json()
        assert d["data"]["profile"]["headline"] == ORIG_HEADLINE
        orig_pub_ver = d["published_version"]
        data = copy.deepcopy(d["data"])
        data["profile"]["headline"] = "TEST_Headline API"
        r = sa.put(f"{API}/admin/portfolio/draft", json={"rev": d["rev"], "data": data})
        assert r.status_code == 200
        try:
            assert sa.get(f"{API}/admin/portfolio/draft").json()["has_unpublished"] is True
            assert requests.get(f"{API}/public/portfolio").json()["data"]["profile"]["headline"] == ORIG_HEADLINE
            p = sa.post(f"{API}/admin/portfolio/publish", json={"note": "TEST publish"})
            assert p.status_code == 200
            assert requests.get(f"{API}/public/portfolio").json()["data"]["profile"]["headline"] == "TEST_Headline API"
        finally:
            # restore the previously published version
            target = next((v for v in before_versions if v["id"] == orig_pub_ver), before_versions[0])
            rr = sa.post(f"{API}/admin/portfolio/versions/{target['id']}/restore")
            assert rr.status_code == 200
        assert requests.get(f"{API}/public/portfolio").json()["data"]["profile"]["headline"] == ORIG_HEADLINE
        assert sa.get(f"{API}/admin/portfolio/draft").json()["data"]["profile"]["headline"] == ORIG_HEADLINE

    def test_restore_unknown_404(self, sa):
        assert sa.post(f"{API}/admin/portfolio/versions/nope/restore").status_code == 404
