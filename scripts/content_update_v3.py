"""Content update v3: tech logos, why-choose-us images, about carousel + richer copy, founder links to portfolio."""
import os, uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
U, Q = "https://images.unsplash.com/", "?crop=entropy&fm=jpg&q=80&w=1800"
DI = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/"
LOGO = {"React": "react/react-original", "TypeScript": "typescript/typescript-original", "Tailwind CSS": "tailwindcss/tailwindcss-original", "Next.js": "nextjs/nextjs-original",
        "Framer Motion": "framermotion/framermotion-original", "Python": "python/python-original", "FastAPI": "fastapi/fastapi-original", "Node.js": "nodejs/nodejs-original",
        "GraphQL": "graphql/graphql-plain", "Swift": "swift/swift-original", "SwiftUI": "swift/swift-original", "UIKit": "apple/apple-original", "Combine": "swift/swift-original",
        "Core Data": "apple/apple-original", "Kotlin": "kotlin/kotlin-original", "Jetpack Compose": "jetpackcompose/jetpackcompose-original", "Coroutines": "kotlin/kotlin-original",
        "Room": "android/android-original", "MongoDB": "mongodb/mongodb-original", "PostgreSQL": "postgresql/postgresql-original", "Firebase": "firebase/firebase-original",
        "Redis": "redis/redis-original", "Docker": "docker/docker-original", "GitHub Actions": "githubactions/githubactions-original", "Fastlane": "apple/apple-original",
        "Nginx": "nginx/nginx-original", "AWS": "amazonwebservices/amazonwebservices-original-wordmark", "Google Cloud": "googlecloud/googlecloud-original",
        "Firebase Hosting": "firebase/firebase-original", "REST APIs": "fastapi/fastapi-original"}
WHY = {"Security-first": f"{U}photo-1768839721176-2fa91fdce725{Q}", "Performance obsessed": f"{U}photo-1518773553398-650c184e0bb3{Q}",
       "Clear communication": f"{U}photo-1588196749597-9ff075ee6b5b{Q}", "Long-term partner": f"{U}photo-1521791136064-7986c2920216{Q}"}
ABOUT_IMGS = [f"{U}photo-1491497895121-1334fc14d8c9{Q}", f"{U}photo-1707655315272-33a54a771068{Q}", f"{U}photo-1615803697515-3cb782c2a65a{Q}",
              f"{U}photo-1633250391894-397930e3f5f2{Q}", f"{U}photo-1677442135703-1787eea5ce01{Q}"]
ABOUT_BODY = ("The Nilgiris Softwares Private Limited designs and builds websites, mobile applications and custom software for businesses around the world — from a studio in Ooty, the Queen of Hills.\n\n"
              "Our foundation is more than a decade of hands-on iOS engineering on App Store apps in fintech, government, healthcare, banking, identity verification and fitness. "
              "We bring that same discipline to every web platform, Android app and AI assistant we build: clean architecture, secure integrations and performance you can feel.\n\n"
              "We work as a small senior team with direct access to the engineers building your product, weekly demos, honest estimates and long-term support after launch — so your software stays reliable as your business grows.")
PORTFOLIO = "https://thenilgirissoftwares.com"


def apply(d):
    for t in d["technologies"]:
        if t["name"] in LOGO:
            t["image"] = f"{DI}{LOGO[t['name']]}.svg"
    home = d["pages"][0]["sections"]
    for s in home:
        if s["type"] == "feature_cards":
            for it in s["props"]["items"]:
                if it["title"] in WHY:
                    it["image"] = WHY[it["title"]]
        if s["type"] == "text_block" and s["props"].get("eyebrow") == "About the company":
            s["props"].update({"body": ABOUT_BODY, "images": ABOUT_IMGS, "imagePosition": "right"})
        if s["type"] == "founder":
            s["props"]["buttonLabel"] = "Meet the founder"
            s["props"]["buttonHref"] = PORTFOLIO
        if s["type"] == "hero_carousel":
            for sl in s["props"]["slides"]:
                if sl["ctaLabel"] == "Meet the Founder":
                    sl["ctaHref"] = PORTFOLIO
    d["founder"].setdefault("links", {})["portfolio"] = PORTFOLIO
    return d


now = datetime.now(timezone.utc).isoformat()
draft, pub = db.cms.find_one({"key": "draft"}), db.cms.find_one({"key": "published"})
nd, np_ = apply(draft["data"]), apply(pub["data"])
vid = uuid.uuid4().hex
db.versions.insert_one({"id": vid, "at": now, "by": "system", "kind": "publish", "note": "Tech logos, why-choose-us images, about carousel, founder portfolio link", "data": np_})
db.cms.update_one({"key": "published"}, {"$set": {"data": np_, "version_id": vid, "published_at": now, "published_by": "system"}})
db.cms.update_one({"key": "draft"}, {"$set": {"data": nd, "updated_at": now, "updated_by": "system"}, "$inc": {"rev": 1}})
print("ok")
