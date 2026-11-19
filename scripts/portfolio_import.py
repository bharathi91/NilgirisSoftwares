"""Import Website 1 (thenilgirissoftwares.com public data) as the /portfolio page and move company projects to /projects."""
import asyncio
import json
import sys

import requests

sys.path.insert(0, "/app/backend")
import server as S  # noqa: E402

SRC = "https://thenilgirissoftwares.com"
CT = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif", "svg": "image/svg+xml"}


def walk_strings(o, out):
    if isinstance(o, dict):
        for v in o.values():
            walk_strings(v, out)
    elif isinstance(o, list):
        for v in o:
            walk_strings(v, out)
    elif isinstance(o, str) and o.startswith("/api/files/"):
        out.add(o)


async def store(data, ctype, name):
    rec = await S.store_media(data, ctype, name, "portfolio", "import")
    rec.update({"alt": "", "deleted": False, "created_at": S.iso(), "updated_at": S.iso()})
    await S.db.media.insert_one(dict(rec))
    return rec


async def import_portfolio():
    if await S.get_cms("pf:published"):
        print("portfolio already imported, skipping")
        return
    S.svc.init_storage()
    src = requests.get(f"{SRC}/api/public/site", timeout=30).json()
    json.dump(src, open("/app/backups/website1_public_site.json", "w"), indent=1)
    paths = set()
    walk_strings(src, paths)
    mapping = {}
    for p in sorted(paths):
        r = requests.get(SRC + p, timeout=60)
        ext = p.rsplit(".", 1)[-1].lower()
        if r.status_code != 200 or ext not in CT:
            print("skip", p, r.status_code)
            continue
        rec = await store(r.content, CT[ext], p.rsplit("/", 1)[-1])
        mapping[p] = rec["url"]
    raw = json.dumps(src)
    for a, b in mapping.items():
        raw = raw.replace(a, b)
    data = json.loads(raw)
    data.pop("published_at", None)
    r = requests.get(f"{SRC}/api/public/resume", timeout=60)
    res = data.get("resume") or {}
    if r.status_code == 200 and r.headers.get("content-type", "").startswith("application/pdf"):
        rec = await store(r.content, "application/pdf", res.get("filename") or "resume.pdf")
        data["resume"] = {"available": True, "filename": res.get("filename") or "resume.pdf", "size": rec["size"], "media_id": rec["id"], "updated_at": S.iso()}
    else:
        data["resume"] = {"available": False}
    data.setdefault("certifications", [])
    data.setdefault("testimonials", [])
    data["settings"] = {"showInNav": True, "navLabel": "My Portfolio"}
    data["seo"]["canonical"] = "https://thenilgirissoftwares.com/portfolio"
    vid = S.nid()
    await S.db.portfolio_versions.insert_one({"id": vid, "at": S.iso(), "by": "import", "kind": "publish", "note": "Imported from thenilgirissoftwares.com", "data": data})
    await S.db.cms.insert_one({"key": "pf:published", "data": data, "version_id": vid, "published_at": S.iso(), "published_by": "import"})
    await S.db.cms.insert_one({"key": "pf:draft", "data": data, "rev": 1, "updated_at": S.iso(), "updated_by": "import"})
    print(f"imported portfolio: {len(mapping)} files, resume={data['resume'].get('available')}")


def move_projects(d):
    raw = json.dumps(d)
    raw = raw.replace('"/portfolio/', '"/projects/').replace('"/portfolio"', '"/projects"').replace('"/portfolio#', '"/projects#')
    d = json.loads(raw)
    for p in d["pages"]:
        if p["slug"] == "portfolio":
            p["slug"] = "projects"
    d["seo"]["siteUrl"] = "https://thenilgirissoftwares.com"
    return d


async def migrate_company():
    pub = await S.get_cms("published")
    if not any(p["slug"] == "portfolio" for p in pub["data"]["pages"]):
        print("company projects already on /projects")
        return
    new = move_projects(pub["data"])
    draft = await S.get_cms("draft")
    new_draft = move_projects(draft["data"])
    vid = S.nid()
    await S.db.versions.insert_one({"id": vid, "at": S.iso(), "by": "migration", "kind": "publish", "note": "Company projects moved from /portfolio to /projects", "data": new})
    await S.db.cms.update_one({"key": "published"}, {"$set": {"data": new, "version_id": vid, "published_at": S.iso(), "published_by": "migration"}})
    await S.db.cms.update_one({"key": "draft"}, {"$set": {"data": new_draft, "updated_at": S.iso(), "updated_by": "migration"}, "$inc": {"rev": 1}})
    for lg in new["settings"].get("siteLanguages", ["en", "ta"]):
        if lg != "en":
            await S.translate_site(lg)
    print("company projects moved to /projects, version", vid)


async def main():
    await import_portfolio()
    await migrate_company()


asyncio.run(main())
