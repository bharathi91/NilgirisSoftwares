"""Iteration 5: Tamil site translation API, translation admin status/regenerate, testimonial submission flow, hospital case-study data."""
import os
import subprocess

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
HOSPITALS = ["kr-hospital", "dj-hospital", "subbu-hospital", "savidha-hospital"]


def _token(email):
    out = subprocess.run(["python3", "/app/scripts/clerk_test_auth.py", "token", email], capture_output=True, text=True, timeout=60)
    return out.stdout.strip().splitlines()[-1]


@pytest.fixture(scope="module")
def sa():
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {_token('superadmin+clerk_test@example.com')}"
    return s


@pytest.fixture(scope="module")
def en():
    return requests.get(f"{API}/public/site").json()


@pytest.fixture(scope="module")
def ta():
    return requests.get(f"{API}/public/site", params={"lang": "ta"}).json()


# --- Tamil public site ---
class TestTamilSite:
    def test_ta_lang_and_version(self, en, ta):
        assert ta.get("lang") == "ta", f"translating={ta.get('translating')}"
        assert ta["version"] == en["version"]

    def test_ta_nav_is_tamil(self, ta):
        labels = [i["label"] for i in ta["data"]["navigation"]["items"]]
        assert any(any("\u0B80" <= ch <= "\u0BFF" for ch in l) for l in labels), labels

    def test_brand_names_unchanged(self, en, ta):
        assert ta["data"]["settings"]["companyName"] == en["data"]["settings"]["companyName"]
        assert [p["name"] for p in ta["data"]["projects"]] == [p["name"] for p in en["data"]["projects"]]
        assert [t["name"] for t in ta["data"]["technologies"]] == [t["name"] for t in en["data"]["technologies"]]

    def test_hrefs_slugs_unchanged(self, en, ta):
        assert [p["slug"] for p in ta["data"]["projects"]] == [p["slug"] for p in en["data"]["projects"]]
        assert [i["href"] for i in ta["data"]["navigation"]["items"]] == [i["href"] for i in en["data"]["navigation"]["items"]]

    def test_unknown_lang_returns_english(self, en):
        r = requests.get(f"{API}/public/site", params={"lang": "zz"})
        assert r.status_code == 200
        assert r.json()["data"]["navigation"] == en["data"]["navigation"]

    def test_ta_etag_304(self):
        r = requests.get(f"{API}/public/site", params={"lang": "ta"})
        et = r.headers.get("ETag")
        assert et and et.endswith('-ta"')
        r2 = requests.get(f"{API}/public/site", params={"lang": "ta"}, headers={"If-None-Match": et})
        assert r2.status_code == 304


# --- Admin translation status ---
class TestTranslationAdmin:
    def test_status(self, sa):
        r = sa.get(f"{API}/admin/translations/status")
        assert r.status_code == 200
        ta = [x for x in r.json() if x["lang"] == "ta"][0]
        assert ta["up_to_date"] is True and ta["coverage"] >= 90

    def test_regen_requires_auth(self):
        assert requests.post(f"{API}/admin/translations/ta/regenerate").status_code in (401, 403)

    def test_status_requires_auth(self):
        assert requests.get(f"{API}/admin/translations/status").status_code in (401, 403)


# --- Testimonials ---
class TestTestimonials:
    def test_validation_short_quote(self):
        r = requests.post(f"{API}/public/testimonials", json={"name": "TEST_x", "email": "a@b.com", "quote": "short", "consent": True})
        assert r.status_code == 422

    def test_submit_and_reject(self, sa):
        r = requests.post(f"{API}/public/testimonials", json={"name": "TEST_ApiUser", "role": "QA", "company": "TEST_Org", "email": "test_api@example.com",
                                                             "quote": "TEST_ api testimonial quote long enough", "consent": True})
        assert r.status_code == 200 and r.json()["ok"] is True
        items = sa.get(f"{API}/admin/testimonial-submissions").json()
        mine = [i for i in items if i["name"] == "TEST_ApiUser"]
        assert mine and mine[0]["status"] == "pending" and "_id" not in mine[0]
        tid = mine[0]["id"]
        assert sa.delete(f"{API}/admin/testimonial-submissions/{tid}").status_code == 200
        items = sa.get(f"{API}/admin/testimonial-submissions").json()
        assert [i for i in items if i["id"] == tid][0]["status"] == "rejected"

    def test_no_consent_400(self):
        r = requests.post(f"{API}/public/testimonials", json={"name": "TEST_x", "email": "a@b.com", "quote": "long enough quote here", "consent": False})
        assert r.status_code in (400, 429)

    def test_admin_list_requires_auth(self):
        assert requests.get(f"{API}/admin/testimonial-submissions").status_code in (401, 403)

    def test_approve_unknown_404(self, sa):
        assert sa.post(f"{API}/admin/testimonial-submissions/nope/approve").status_code in (404, 409)  # atomic claim returns 409


# --- Hospital case studies ---
class TestHospitals:
    @pytest.mark.parametrize("slug", HOSPITALS)
    def test_hospital_data(self, en, slug):
        p = [x for x in en["data"]["projects"] if x["slug"] == slug][0]
        assert p["classification"] == "company"
        assert p.get("features") and p.get("challenge") and p.get("solution") and p.get("contribution") and p.get("link")
        assert len(p.get("screenshots") or []) >= 2
        assert not p.get("coverIllustrative")
        for u in p["screenshots"][:2]:
            url = u if u.startswith("http") else f"{BASE_URL}{u}"
            assert requests.get(url).status_code == 200, url

    def test_aws_framer_logos(self, en):
        techs = {t["name"]: t for t in en["data"]["technologies"]}
        for n in [k for k in techs if "AWS" in k or "Framer" in k]:
            assert techs[n].get("image"), n
