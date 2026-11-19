"""v5: MoneyGram logo, localise Website-1 image hotlinks, founder links -> /portfolio."""
import asyncio
import json
import sys

import requests

sys.path.insert(0, "/app/backend")
import server as S  # noqa: E402

LOGO = "https://customer-assets-wrfwihn1.emergentagent.net/job_nilgiris-cms--51w5867w/artifacts/20c7f6cb36e6333b_moneygramlogo.jpeg"
OLD = "https://thenilgirissoftwares.com/api/files/careerfolio/images/"


async def main():
    S.svc.init_storage()
    rec = await S.db.media.find_one({"name": "moneygram-logo.jpg", "deleted": False}, {"_id": 0})
    if not rec:
        rec = await S.store_media(requests.get(LOGO, timeout=30).content, "image/jpeg", "moneygram-logo.jpg", "portfolio", "migration")
        rec.update({"alt": "MoneyGram logo", "deleted": False, "created_at": S.iso(), "updated_at": S.iso()})
        await S.db.media.insert_one(dict(rec))
    logo = rec["url"]
    files = {m["name"]: m["url"] async for m in S.db.media.find({"folder": "portfolio", "deleted": False}, {"name": 1, "url": 1})}

    def fix_company(d):
        raw = json.dumps(d)
        for name, url in files.items():
            raw = raw.replace(OLD + name, url)
        d = json.loads(raw)
        for p in d["projects"]:
            if p.get("slug") == "moneygram":
                p["cover"] = logo
                p["logo"] = logo

        def walk(o, path=""):
            if isinstance(o, dict):
                for k, v in o.items():
                    if isinstance(v, str) and v.rstrip("/") == "https://thenilgirissoftwares.com" and path + k != "seo.siteUrl":
                        o[k] = "/portfolio"
                    else:
                        walk(v, path + k + ".")
            elif isinstance(o, list):
                for v in o:
                    walk(v, path)
        walk(d)
        return d

    pub, draft = await S.get_cms("published"), await S.get_cms("draft")
    new, nd = fix_company(pub["data"]), fix_company(draft["data"])
    left = json.dumps(new).count(OLD)
    vid = S.nid()
    await S.db.versions.insert_one({"id": vid, "at": S.iso(), "by": "migration", "kind": "publish", "note": "Local copies of portfolio images, MoneyGram logo, founder links to /portfolio", "data": new})
    await S.db.cms.update_one({"key": "published"}, {"$set": {"data": new, "version_id": vid, "published_at": S.iso(), "published_by": "migration"}})
    await S.db.cms.update_one({"key": "draft"}, {"$set": {"data": nd, "updated_at": S.iso(), "updated_by": "migration"}, "$inc": {"rev": 1}})
    print("company published", vid, "remaining hotlinks", left)

    def fix_pf(d):
        for p in d["projects"]:
            if p["title"] == "MoneyGram":
                p["icon"] = logo
        return d
    pp, pd = await S.get_cms("pf:published"), await S.get_cms("pf:draft")
    newp = fix_pf(pp["data"])
    pvid = S.nid()
    await S.db.portfolio_versions.insert_one({"id": pvid, "at": S.iso(), "by": "migration", "kind": "publish", "note": "MoneyGram logo updated", "data": newp})
    await S.db.cms.update_one({"key": "pf:published"}, {"$set": {"data": newp, "version_id": pvid, "published_at": S.iso(), "published_by": "migration"}})
    await S.db.cms.update_one({"key": "pf:draft"}, {"$set": {"data": fix_pf(pd["data"])}, "$inc": {"rev": 1}})
    print("portfolio published", pvid)
    for lg in new["settings"].get("siteLanguages", ["en", "ta"]):
        if lg != "en":
            await S.translate_site(lg)


asyncio.run(main())
