"""One-off content update: verified founder data, projects with case studies, 10-slide hero, WhatsApp button."""
import os, uuid, copy
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
F = "https://thenilgirissoftwares.com/api/files/careerfolio/images/"
U = "https://images.unsplash.com/"
Q = "?crop=entropy&fm=jpg&q=80&w=1800"
GEN = "https://static.prod-images.emergentagent.com/jobs/9f922789-4c93-44dc-ae40-ef77aa35f9cc/images/"
GOLF, GPS, HOSP = GEN + "5f24e7ae0fadd993de97c39e53f5bb4c0afda12e1ecd65b2b9fbec9f61ebb8b5.jpeg", GEN + "ec625e97e1b59c9a54fa07d509d813a17e1dcd736370013e7fe6c5a7032fc42b.jpeg", GEN + "a6e3b3477e642798196d63fbf37a55d0548f4ad9b0fe51d67b3774d59cf4993a.jpeg"
iid = lambda: uuid.uuid4().hex[:10]
GOV = ["New features built with product owners, UI/UX designers, backend engineers and QA", "REST API and third-party SDK integrations", "Native Swift and UIKit app on the MVVM architecture", "CI/CD, App Store deployments and release management"]
HEALTH = ["Appointment scheduling", "Patient records", "Telehealth", "Provider search", "Secure messaging and notifications", "REST API integrations"]
LEAD = ["Architecture, design and implementation in Swift and UIKit", "Requirements gathering and technical feasibility analysis with the client", "Unit testing and enforced coding standards", "Code reviews and developer mentoring"]


def proj(name, slug, category, platform, cls, desc, cover, shots, features, tech, link, contribution, featured, illustrative=False, challenge="", solution=""):
    return {"id": iid(), "name": name, "slug": slug, "category": category, "platform": platform, "classification": cls, "description": desc,
            "cover": cover, "coverIllustrative": illustrative, "screenshots": shots, "features": features, "tech": tech, "link": link,
            "contribution": contribution, "featured": featured, "visible": True, "summary": desc, "challenge": challenge, "solution": solution, "results": [], "story": ""}


PROJECTS = [
    proj("Dubai Culture", "dubai-culture", "Government · Arts & Culture", "iOS", "founder_experience", "iOS application for the Dubai Government's Arts & Culture Authority.",
         F + "721d9c4b-b6ee-4d80-9f1a-369d6ddbc8ea.jpg", [F + "01ab642e-fe63-4dd1-8534-429608886359.png", F + "fed08e68-aef0-4977-bec3-9118d8233f77.jpg"], GOV, ["Swift", "UIKit", "MVVM"],
         "https://apps.apple.com/in/app/dubai-culture-%D8%AF%D8%A8%D9%8A-%D9%84%D9%84%D8%AB%D9%82%D8%A7%D9%81%D8%A9/id926793557",
         "As Senior iOS Developer at SMI Technology LLC, led design, development and maintenance; mentored iOS developers, ran code reviews and drove technical design decisions.", True),
    proj("Dubai Public Library", "dubai-public-library", "Government · Library", "iOS", "founder_experience", "iOS application for the Dubai Government's Arts & Culture Authority.",
         F + "706a89c3-70f8-4c10-a672-d3f21fff2d67.jpg", [F + "338a2161-e6c6-4902-8c66-7460b2f49158.png", F + "0fd9a3b2-ff8f-4cb7-a309-e0c1ed607567.png"], GOV, ["Swift", "UIKit", "MVVM"],
         "https://apps.apple.com/in/app/dubai-library-%D9%85%D9%83%D8%AA%D8%A8%D8%A9-%D8%AF%D8%A8%D9%8A/id921365930", "Led iOS development at SMI Technology LLC alongside the Dubai Culture app.", True),
    proj("MoneyGram", "moneygram", "Fintech", "iOS", "founder_experience", "Fintech and Digital Money Transfer platform serving global customers.",
         F + "14e695d7-43c7-4a49-8d45-ee950dce1b2a.jpg", [F + "f40d9c6b-71cd-47b0-a365-a888b683d9b4.jpg", F + "45138cee-36d9-41e7-8f15-4677c04a9943.jpg", F + "bb38202c-4c5e-431c-bd86-2e656b8c9aaa.jpg"],
         ["Secure sign-in and authentication", "Payment flows and money transfer features", "REST API and third-party SDK integrations", "Native Swift and UIKit app on the MVVM architecture"], ["Swift", "UIKit", "MVVM"],
         "https://apps.apple.com/us/app/moneygram-money-transfers-app/id867619606", "Senior iOS Developer via Spearhead Technology India — built and maintained secure, high-performance features within a large Agile team.", True),
    proj("Sentara", "sentara", "Healthcare", "iOS", "founder_experience", "Healthcare iOS application.", F + "3b1c9dfb-eb6c-45e5-ad29-c3ee9d68646c.jpg",
         [F + "c2e52b07-8aae-42a4-902b-61f4c0f8b23c.png", F + "e12da626-dcf8-452d-b918-9b70a52c5313.png"], HEALTH, ["Swift", "UIKit", "MVVM"], "https://apps.apple.com/us/app/sentara/id490172455",
         "Senior Software Engineer at Photon Interactive — patient-centric features built with clinicians, product owners and UX, following healthcare standards.", True),
    proj("Optima Health", "optima-health", "Healthcare", "iOS", "founder_experience", "Healthcare iOS application.", F + "6d10c673-f7e6-4fb9-829f-be4455e59ae0.jpg",
         [F + "83276d60-900f-4c88-8550-abac9520a5d5.png", F + "2e1a962f-d72b-40d6-ae15-5f9620b055dc.png", F + "aa537c90-40a3-42a6-8ec5-99f204dcaf95.png"], HEALTH, ["Swift", "UIKit", "MVVM"],
         "https://apps.apple.com/us/app/optima-health/id853146367", "Senior Software Engineer at Photon Interactive.", False),
    proj("ID Pal", "id-pal", "Identity Verification", "iOS", "founder_experience", "Identity verification iOS app.", F + "09b846e6-7635-4b07-9066-b0d31dbed84e.jpg",
         [F + "c6feff95-3dce-491d-b618-0886b85ba3a7.png", F + "99147f39-3de7-4a26-bdf4-eeb43e2d8e60.png"], LEAD, ["Swift", "UIKit"], "https://apps.apple.com/ie/app/id-pal/id1123152331",
         "Lead iOS Developer at App Innovation Technologies — led design, development and delivery while managing a team of iOS developers.", True),
    proj("PaceUP!", "paceup", "Fitness", "iOS", "founder_experience", "Fitness iOS app.", F + "cfa81c55-9462-4304-84fa-fe253385d136.jpg",
         [F + "8da64606-bac9-4c1e-9671-d926f133d39e.png", F + "35c470b5-56d1-44f9-8feb-e42cab898eae.png"], LEAD, ["Swift", "UIKit"], "https://apps.apple.com/us/app/paceup/id1188739081",
         "Lead iOS Developer at App Innovation Technologies.", False),
    proj("CallProof", "callproof", "Sales CRM", "iOS", "founder_experience", "CRM iOS app.", F + "f85c6974-6226-4e37-b493-630e93755b30.jpg",
         [F + "845ef9f8-2eae-4920-9c61-b2e719d735f3.png", F + "c3c2c0b5-e631-4a8c-abf9-da08f10b38f7.png"], [], ["Swift", "UIKit"], "https://apps.apple.com/us/app/callproof-crm/id545096552", "", False),
    proj("GolfApp", "golfapp", "Sports", "iOS", "founder_experience", "Native GolfApp iOS application.", GOLF, [], [], ["Swift", "UIKit", "Cocoa Touch", "Instruments"], "",
         "Software Analyst at CoStrategix Technologies — developed and maintained the app using Swift, UIKit, Interface Builder and Instruments.", False, True),
    proj("Trackyfy", "trackyfy", "GPS Tracking", "iOS", "founder_experience", "GPS tracking application built from scratch.", GPS, [], [], ["Objective-C", "UIKit", "GPS"], "",
         "Sole iOS developer at Tatya Global — designed, developed and delivered the app from scratch; improved user engagement by 15%.", False, True),
    proj("KR Hospital", "kr-hospital", "Healthcare website", "Web", "company", "Hospital website delivered by The Nilgiris Softwares.", HOSP, [], [], [], "https://thenilgirissoftwares.org/", "", True, True),
    proj("DJ Hospital", "dj-hospital", "Healthcare website", "Web", "company", "Hospital website delivered by The Nilgiris Softwares.", HOSP, [], [], [], "https://thenilgirissoftwares.net/", "", True, True),
    proj("Subbu Hospital", "subbu-hospital", "Healthcare website", "Web", "company", "Hospital website delivered by The Nilgiris Softwares.", HOSP, [], [], [], "https://thenilgirissoftwares.info/", "", False, True),
    proj("Savidha Hospital", "savidha-hospital", "Healthcare website", "Web", "company", "Hospital website delivered by The Nilgiris Softwares.", HOSP, [], [], [], "https://nilgirissoftware.com/", "", False, True),
    proj("Strongbox", "strongbox", "Open Source", "iOS library", "personal", "Contribution to the open-source Strongbox iOS library (GitHub Arctic Code Vault Contributor badge).", "", [], [], ["Swift", "Keychain"], "https://github.com/granoff/Strongbox", "Open-source contributor.", False),
    proj("Next-Level Localization", "next-level-localization", "Open Source", "iOS library", "personal", "Open-source iOS localization library.", "", [], [], ["Swift"], "https://github.com/bharathi91/NextLevelLocalization", "Author.", False),
    proj("BK Stepper Slider", "bk-stepper-slider", "Open Source", "iOS library", "personal", "Open-source stepper progress component for iOS.", "", [], [], ["Swift", "UIKit"], "https://github.com/bharathi91/BKStepperProgress", "Author.", False),
    proj("Drag View", "drag-view", "Open Source", "iOS library", "personal", "Open-source draggable view component for iOS.", "", [], [], ["Swift", "UIKit"], "https://github.com/bharathi91/dragView", "Author.", False),
]

EXP = [("Senior iOS developer", "SMI Technology LLC — Dubai Culture, Dubai Public Library", "01/2026 — Present", "Leads design, development and maintenance of the Dubai Culture and Dubai Public Library iOS apps for the Dubai Government's Arts & Culture Authority; mentors iOS developers and drives technical design."),
       ("Senior iOS developer", "Spearhead Technology India Pvt Ltd — MoneyGram", "02/2024 — 05/2025", "Developed MoneyGram's iOS app, a fintech and digital money transfer platform serving global customers."),
       ("Senior Developer Mobile Solutions, Level 2", "Publicis Sapient — Banking application", "06/2022 — 12/2023", "Secure, high-performance iOS banking applications using Swift, UIKit and MVVM."),
       ("Senior Software Engineer", "Photon Interactive Pvt Ltd — Sentara & Optima Health", "01/2021 — 06/2022", "Secure, scalable healthcare iOS apps built with clinicians, product owners and UX designers."),
       ("Lead iOS Developer", "App Innovation Technologies — IDPal & PaceUP!", "08/2019 — 01/2021", "Led design and delivery of IDPal and PaceUP!, managing a team of iOS developers."),
       ("Software Analyst", "CoStrategix Technologies Pvt Ltd — GolfApp", "04/2016 — 08/2017", "Developed and maintained the GolfApp native iOS application."),
       ("Software Engineer", "Tatya Global Pvt Ltd — Trackyfy", "08/2015 — 04/2016", "Sole iOS developer of the Trackyfy GPS tracking app; improved engagement by 15%."),
       ("Mobile developer, Level 2", "Compindia Infotech Pvt Ltd", "03/2014 — 08/2015", "Started native iOS development with Swift, UIKit and Xcode.")]


def slide(kind, eyebrow, title, subtitle, image, cta, cta2=("Start Your Project", "/contact")):
    return {"id": iid(), "kind": kind, "eyebrow": eyebrow, "title": title, "subtitle": subtitle, "image": image, "mobileImage": "", "video": "", "poster": "", "overlay": 55,
            "ctaLabel": cta[0], "ctaHref": cta[1], "cta2Label": cta2[0], "cta2Href": cta2[1], "enabled": True}


SLIDES = [
    slide("image", "The Nilgiris Softwares · Ooty", "Building Tomorrow's Digital Experiences, Today.", "We create powerful websites, intuitive mobile applications, and intelligent software solutions that help businesses innovate, grow, and succeed.", f"{U}photo-1491497895121-1334fc14d8c9{Q}", ("Explore Our Services", "/web-development")),
    slide("image", "Nilgiri Mountain Railway", "Engineered to climb, built to last.", "Like the heritage rack railway that has climbed our hills for over a century, we build software with precision, patience and endurance.", f"{U}photo-1707655315272-33a54a771068{Q}", ("About Us", "/about")),
    slide("image", "Ooty Lake", "Calm minds write clean code.", "Fresh mountain air and focused, senior engineers — the quiet advantage behind every product we ship.", f"{U}photo-1711553186754-0cfbdfe38b8d{Q}", ("Meet the Founder", "/about")),
    slide("image", "iOS Engineering", "Native iPhone apps in Swift & SwiftUI.", "A decade of App Store releases across fintech, government, healthcare and fitness.", f"{U}photo-1633250391894-397930e3f5f2{Q}", ("iOS Development", "/ios-development")),
    slide("image", "Android Engineering", "Kotlin & Jetpack Compose, done right.", "Fast, modern Android apps with clean architecture and Play Store-ready releases.", f"{U}photo-1423784346385-c1d4dac9893a{Q}", ("Android Development", "/android-development")),
    slide("image", "Web Platforms", "Websites that work as hard as you do.", "Corporate sites, hospital systems, booking and e-commerce platforms with full admin control.", f"{U}photo-1518773553398-650c184e0bb3{Q}", ("Web Development", "/web-development")),
    slide("image", "Artificial Intelligence", "AI assistants that answer, book and qualify.", "Multilingual chatbots and intelligent workflows for clinics, stores and service teams.", f"{U}photo-1677442135703-1787eea5ce01{Q}", ("AI Solutions", "/ai-solutions")),
    slide("image", "Cloud & DevOps", "Secure, scalable infrastructure.", "Docker, CI/CD and cloud deployments with monitoring, backups and security built in.", "https://images.pexels.com/photos/17489157/pexels-photo-17489157.jpeg?auto=compress&cs=tinysrgb&w=1800", ("Technologies", "/technologies")),
    slide("image", "The Blue Mountains", "From the Queen of Hills, for the 🌍", "Engineering Digital Experiences. Empowering Businesses Worldwide.", f"{U}photo-1455157823797-3019317cbcf0{Q}", ("View Portfolio", "/portfolio")),
    slide("text", "Start today", "Have an idea worth building?", "Tell us about it — we reply within one business day.", f"{U}photo-1638886540342-240980f60d25{Q}", ("Start Your Project", "/contact"), ("WhatsApp us", "https://wa.me/919585483215")),
]


def apply(d):
    d["projects"] = copy.deepcopy(PROJECTS)
    f = d["founder"]
    f.update({"name": "Bharathi Kumar N", "title": "Founder · Senior iOS Mobile Engineer", "photo": F + "4a575dab-fee1-468b-a025-39ddc86f70f0.jpg",
              "bio": "Senior iOS developer with 10 years of experience in mobile application development and software engineering, expert in Swift and Objective-C. Managed app updates and rollouts for high-profile applications including MoneyGram and Dubai Culture, and significantly improved performance and user experience across many iOS apps.",
              "expertise": ["Swift", "SwiftUI", "Objective-C", "UIKit", "MVVM", "Clean Architecture", "Combine", "CI/CD", "App Store deployments", "REST APIs", "Firebase"],
              "domains": ["Fintech", "Government", "Healthcare", "Banking", "Identity verification", "Fitness"],
              "experience": [{"id": iid(), "role": r, "company": c, "period": p, "summary": s} for r, c, p, s in EXP],
              "achievements": [{"id": iid(), "value": "10+", "label": "iOS app launches delivered with cross-functional teams"}, {"id": iid(), "value": "30%", "label": "App performance gain from architecture patterns across 4 projects"},
                               {"id": iid(), "value": "4", "label": "iOS applications delivered as team lead"}, {"id": iid(), "value": "★", "label": "GitHub Arctic Code Vault Contributor (Strongbox)"}],
              "education": "B.Tech — Sri Ramakrishna Engineering College (2013)", "verified": True})
    f["links"] = {"portfolio": "https://thenilgirissoftwares.com", "linkedin": "https://www.linkedin.com/in/bharathi91", "github": "https://github.com/bharathi91",
                  "stackoverflow": "https://stackoverflow.com/users/3480944/bharathi-kumar", "medium": "https://medium.com/@codewithbharathi"}
    hero = next(s for s in d["pages"][0]["sections"] if s["type"] == "hero_carousel")
    hero["props"]["slides"] = copy.deepcopy(SLIDES)
    d["settings"]["whatsappButton"] = {"enabled": True, "number": "+91 9585483215", "message": "Hi! I'd like to discuss a project with The Nilgiris Softwares.", "label": "Chat on WhatsApp"}
    return d


now = datetime.now(timezone.utc).isoformat()
draft, pub = db.cms.find_one({"key": "draft"}), db.cms.find_one({"key": "published"})
nd, np_ = apply(draft["data"]), apply(pub["data"])
vid = uuid.uuid4().hex
db.versions.insert_one({"id": vid, "at": now, "by": "system", "kind": "publish", "note": "Verified founder data, case studies, 10 hero slides, WhatsApp button", "data": np_})
db.cms.update_one({"key": "published"}, {"$set": {"data": np_, "version_id": vid, "published_at": now, "published_by": "system"}})
db.cms.update_one({"key": "draft"}, {"$set": {"data": nd, "updated_at": now, "updated_by": "system"}, "$inc": {"rev": 1}})
print("updated", len(np_["projects"]), "projects", len(SLIDES), "slides")
