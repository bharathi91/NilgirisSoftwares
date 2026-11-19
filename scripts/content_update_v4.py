"""Content update v4: real hospital screenshots + features, logo fixes, site languages."""
import os, uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
M = "/api/media/f/"
HOSP = {
    "kr-hospital": {"shots": [M + "801612b13f0c4a61.72fddfda8671.jpg", M + "979776fda50e4512.448c6ae454a8.jpg"],
                    "summary": "Website for KR Hospital, a multi-speciality hospital in Coimbatore serving patients since 1987.",
                    "features": ["Online appointment booking", "Find-a-doctor directory", "24-hour emergency & ambulance contact bar", "Department pages: Cardiology, Laparoscopic & General Surgery, Orthopaedics, Obstetrics & Gynaecology", "News & events, gallery and careers", "Tamil language version"]},
    "dj-hospital": {"shots": [M + "3a0f93e1afe2450b.f55c57b5b77c.jpg", M + "d5a3abdcf7a94287.f4c18c641e8b.jpg"],
                    "summary": "Website for DJ Hospital, Jothipuram, Coimbatore — patient-focused care for every family.",
                    "features": ["Online appointment booking", "Find-a-doctor and department detail pages", "Health check-up packages", "Emergency call (112) banner", "Light and dark display modes", "Tamil language version"]},
    "subbu-hospital": {"shots": [M + "cf8c27ce9f0540bc.9442dfaf4693.jpg", M + "aad0622211294749.81482bbc6647.jpg"],
                       "summary": "Website and patient platform for Subbu Medical Centre and Hospital (SMCH), Coimbatore.",
                       "features": ["Online booking with self-service manage-booking", "Patient portal", "Staff / admin portal", "Doctors, departments and facilities pages", "Health articles", "24-hour emergency contact and Tamil language version"]},
    "savidha-hospital": {"shots": [M + "aa278399cf834094.bb0c69cf95d3.jpg", M + "f265feed6eb249eb.fb30bd944fe2.jpg"],
                         "summary": "Website for Savidha Medical Center & Hospital, Karamadai — mother & child care and multi-speciality.",
                         "features": ["Real-time appointment slots with instant reference number", "Booking tracking", "Staff portal and patient sign-in", "Six languages: English, Tamil, Hindi, Telugu, Malayalam, Kannada", "Medical emergency banner with one-tap call", "Departments and doctors directory"]},
}
LOGOS = {"AWS": "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
         "Framer Motion": "https://cdn.simpleicons.org/framer"}


def apply(d):
    for p in d["projects"]:
        h = HOSP.get(p.get("slug"))
        if h:
            p.update({"screenshots": h["shots"], "cover": h["shots"][0], "coverIllustrative": False, "summary": h["summary"], "description": h["summary"],
                      "features": h["features"], "tech": ["Responsive web design", "Multilingual UI", "Online booking", "Admin dashboard"],
                      "contribution": "Designed, built and launched the hospital's website end-to-end — information architecture, responsive UI, appointment booking flow, multilingual content and ongoing maintenance.",
                      "challenge": "Patients needed a fast, trustworthy way to find the right doctor, understand services and reach the hospital — on any phone and in their own language.",
                      "solution": "A mobile-first site with clear department pages, a guided booking flow and always-visible emergency contacts, with content in Tamil and English managed by the hospital team."})
    for t in d["technologies"]:
        if t["name"] in LOGOS:
            t["image"] = LOGOS[t["name"]]
    d["settings"].setdefault("siteLanguages", ["en", "ta"])
    return d


now = datetime.now(timezone.utc).isoformat()
draft, pub = db.cms.find_one({"key": "draft"}), db.cms.find_one({"key": "published"})
nd, np_ = apply(draft["data"]), apply(pub["data"])
vid = uuid.uuid4().hex
db.versions.insert_one({"id": vid, "at": now, "by": "system", "kind": "publish", "note": "Hospital case studies with real screenshots, logo fixes, Tamil site language", "data": np_})
db.cms.update_one({"key": "published"}, {"$set": {"data": np_, "version_id": vid, "published_at": now, "published_by": "system"}})
db.cms.update_one({"key": "draft"}, {"$set": {"data": nd, "updated_at": now, "updated_by": "system"}, "$inc": {"rev": 1}})
print("ok")
