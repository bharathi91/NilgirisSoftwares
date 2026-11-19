import uuid


def _id():
    return uuid.uuid4().hex[:10]


U = "https://images.unsplash.com/"
Q = "?crop=entropy&fm=jpg&q=80&w=1800"
IMG = {
    "tea": f"{U}photo-1491497895121-1334fc14d8c9{Q}",
    "fog": f"{U}photo-1455157823797-3019317cbcf0{Q}",
    "code": f"{U}photo-1518773553398-650c184e0bb3{Q}",
    "office": f"{U}photo-1615803697515-3cb782c2a65a{Q}",
    "phone": f"{U}photo-1633250391894-397930e3f5f2{Q}",
    "silhouette": f"{U}photo-1423784346385-c1d4dac9893a{Q}",
    "monitors": f"{U}photo-1514168757508-07ffe9ae125b{Q}",
}

DEFAULT_STYLE = {
    "bg": "base", "bgColor": "", "bgImage": "", "overlay": 60,
    "paddingY": {"m": 64, "t": 88, "d": 112},
    "align": {"m": "left", "t": "left", "d": "left"},
    "maxWidth": "normal", "minHeight": 0,
    "columns": {"m": 1, "t": 2, "d": 3},
    "titleSize": {"m": 30, "t": 40, "d": 52},
    "hide": {"m": False, "t": False, "d": False},
    "animation": "fade-up",
}


def sec(type_, props, **style):
    s = {**DEFAULT_STYLE, **style}
    return {"id": _id(), "type": type_, "visible": True, "props": props, "style": s}


def header(eyebrow, title, subtitle, image=""):
    return sec("page_header", {"eyebrow": eyebrow, "title": title, "subtitle": subtitle, "image": image},
               paddingY={"m": 96, "t": 120, "d": 150})


def cards(eyebrow, title, subtitle, items, bg="base", cols=3):
    return sec("feature_cards", {"eyebrow": eyebrow, "title": title, "subtitle": subtitle,
                                 "items": [{"icon": i[0], "title": i[1], "text": i[2]} for i in items]},
               bg=bg, columns={"m": 1, "t": 2, "d": cols})


def cta(title="Have an idea worth building?", subtitle="Tell us about your project. We reply within one business day."):
    return sec("cta", {"title": title, "subtitle": subtitle, "buttons": [
        {"label": "Start Your Project", "href": "/contact", "variant": "primary"},
        {"label": "View Portfolio", "href": "/portfolio", "variant": "ghost"}]}, bg="surface")


def page(slug, title, desc, sections):
    return {"id": _id(), "slug": slug, "title": title, "sections": sections,
            "seo": {"title": f"{title} | The Nilgiris Softwares", "description": desc, "keywords": "",
                    "canonical": "", "ogImage": "", "ogTitle": "", "ogDescription": "", "noindex": False,
                    "jsonld": ""}}


def slide(kind, eyebrow, title, subtitle, image="", cta=("Explore Our Services", "/web-development"),
          cta2=("Start Your Project", "/contact")):
    return {"id": _id(), "kind": kind, "eyebrow": eyebrow, "title": title, "subtitle": subtitle,
            "image": image, "mobileImage": "", "video": "", "poster": "", "overlay": 55,
            "ctaLabel": cta[0], "ctaHref": cta[1], "cta2Label": cta2[0], "cta2Href": cta2[1], "enabled": True}


SERVICE_ITEMS = [
    ("web-development", "Website Design & Development", "Globe", "Fast, accessible, search-friendly websites and web apps built to convert."),
    ("ios-development", "iOS App Development", "Smartphone", "Native Swift and SwiftUI apps engineered for performance, security and App Store success."),
    ("android-development", "Android App Development", "TabletSmartphone", "Kotlin and Jetpack Compose apps that feel native on every Android device."),
    ("cross-platform", "Cross-Platform Apps", "Layers", "One codebase, two stores — pragmatic cross-platform delivery when it fits."),
    ("custom-software", "Custom Software", "Code2", "Bespoke software shaped around the way your business actually works."),
    ("ai-solutions", "AI Web Apps, Chatbots & Assistants", "Sparkles", "Intelligent assistants and workflows that answer, book and qualify — around the clock."),
    ("enterprise", "Enterprise Solutions", "Building2", "Secure integrations, identity, and compliance-ready architecture for larger teams."),
    ("hospital-systems", "Hospital Management Systems", "HeartPulse", "Appointments, records and billing workflows designed for clinical teams."),
    ("ecommerce", "E-commerce Development", "ShoppingBag", "Storefronts, catalogues and checkouts that are quick to manage and quick to buy from."),
    ("maintenance", "Maintenance & Support", "Wrench", "Monitoring, updates and fixes so your product stays healthy after launch."),
]

PROJECTS = [
    ("Dubai Culture", "Government & Culture", "iOS"),
    ("Dubai Public Library", "Government & Culture", "iOS"),
    ("MoneyGram", "Finance", "iOS"),
    ("Sentara / Optima Health", "Healthcare", "iOS"),
    ("IDPal", "Identity Verification", "iOS"),
    ("PaceUP!", "Fitness", "iOS"),
    ("GolfApp", "Sports", "iOS"),
    ("Trackyfi", "Productivity", "iOS"),
    ("KR Hospital", "Healthcare", "Web"),
    ("DJ Hospital", "Healthcare", "Web"),
]

TECH = {
    "Frontend": ["React", "TypeScript", "Tailwind CSS", "Next.js", "Framer Motion"],
    "Backend": ["Python", "FastAPI", "Node.js", "REST APIs", "GraphQL"],
    "iOS": ["Swift", "SwiftUI", "UIKit", "Combine", "Core Data", "MVVM", "Clean Architecture"],
    "Android": ["Kotlin", "Jetpack Compose", "Coroutines", "Room"],
    "Databases": ["MongoDB", "PostgreSQL", "Firebase", "Redis"],
    "DevOps": ["Docker", "GitHub Actions", "Fastlane", "Nginx"],
    "AI": ["LLM Integration", "Chatbots", "Speech Interfaces", "RAG"],
    "Cloud": ["AWS", "Google Cloud", "Firebase Hosting"],
    "Security": ["OAuth 2.0", "Keychain", "SSL Pinning", "Biometrics"],
}


def service_page(slug, title, desc, items, image):
    return page(slug, title, desc, [
        header("Services", title, desc, image),
        cards("What we deliver", "Capabilities", "", items, cols=3),
        sec("tech_stack", {"eyebrow": "Stack", "title": "Technologies we use", "subtitle": "", "categories": []}, bg="surface"),
        sec("process", {"eyebrow": "How we work", "title": "From idea to launch", "steps": PROCESS}),
        cta(),
    ])


PROCESS = [
    {"title": "Discover", "text": "We listen, map goals and define a clear, costed scope."},
    {"title": "Design", "text": "Wireframes and high-fidelity designs validated with you early."},
    {"title": "Build", "text": "Short sprints, weekly demos and transparent progress."},
    {"title": "Test", "text": "Automated and manual QA across devices and edge cases."},
    {"title": "Launch", "text": "Store submissions, deployments and monitoring set up."},
    {"title": "Support", "text": "Ongoing maintenance, improvements and technical support."},
]

FAQS = [
    ("How long does a typical project take?", "Small websites take 2–4 weeks; mobile apps and custom software usually take 8–16 weeks depending on scope."),
    ("Do you work with clients outside India?", "Yes. We work remotely with clients worldwide and overlap with your working hours for calls."),
    ("Who owns the source code?", "You do. On final payment, all source code and assets are handed over to you."),
    ("Can you maintain an app built by someone else?", "Yes. We start with a code audit, then propose a maintenance and improvement plan."),
    ("How do you price projects?", "Fixed-price for well-defined scopes, or monthly retainers for ongoing development."),
]


def default_content():
    home = page("/", "Home", "Websites, mobile apps and intelligent software from the Nilgiris, for the world.", [
        sec("hero_carousel", {
            "autoplay": True, "interval": 6000, "transition": "fade", "height": 88,
            "slides": [
                slide("image", "The Nilgiris Softwares", "Building Tomorrow's Digital Experiences, Today.",
                      "We create powerful websites, intuitive mobile applications, and intelligent software solutions that help businesses innovate, grow, and succeed.", IMG["tea"]),
                slide("image", "iOS & Android", "Apps people love to open.", "Native Swift, SwiftUI and Kotlin apps engineered for speed, security and scale.", IMG["phone"], ("iOS Development", "/ios-development")),
                slide("image", "Web Platforms", "Websites that work as hard as you do.", "Corporate sites, dashboards, booking and e-commerce platforms.", IMG["code"], ("Web Development", "/web-development")),
                slide("image", "AI Solutions", "Assistants that answer, book and qualify.", "AI chatbots and intelligent workflows for clinics, stores and service teams.", IMG["monitors"], ("AI Solutions", "/ai-solutions")),
                slide("text", "Made in the Queen of Hills", "Engineering Digital Experiences. Empowering Businesses Worldwide.", "Made with ❤️ in the Queen of Hills, for the 🌍", IMG["fog"], ("About Us", "/about")),
            ]}, paddingY={"m": 0, "t": 0, "d": 0}),
        sec("text_block", {"eyebrow": "About the company", "title": "A focused engineering studio from Ooty.",
                           "body": "The Nilgiris Softwares Private Limited designs and builds websites, mobile applications and custom software for businesses around the world. We combine a decade of hands-on mobile engineering with modern web and AI tooling to ship products that are reliable, secure and easy to grow.",
                           "image": IMG["office"], "imagePosition": "right",
                           "buttons": [{"label": "More about us", "href": "/about", "variant": "ghost"}]}),
        sec("services_grid", {"eyebrow": "Core services", "title": "Everything you need to ship.", "subtitle": "From first sketch to App Store release and beyond.", "limit": 6}, bg="surface"),
        cards("Why choose us", "Senior engineering, without the agency overhead.", "", [
            ("ShieldCheck", "Security-first", "Experience with healthcare, finance and identity-verification apps where security is non-negotiable."),
            ("Gauge", "Performance obsessed", "Fast load times, smooth animations and efficient code on every device."),
            ("MessagesSquare", "Clear communication", "Weekly demos, shared boards and direct access to the engineer building your product."),
            ("Handshake", "Long-term partner", "We stay after launch with maintenance, monitoring and improvements."),
        ], cols=4),
        sec("tech_stack", {"eyebrow": "Technology", "title": "Modern, proven tools.", "subtitle": "", "categories": []}, bg="surface"),
        sec("projects", {"eyebrow": "Selected work", "title": "Featured projects", "subtitle": "Each project is labelled clearly as company work or the founder's previous professional experience.", "mode": "featured", "filterable": False}),
        sec("process", {"eyebrow": "Methodology", "title": "How we deliver", "steps": PROCESS}, bg="surface"),
        sec("founder", {"eyebrow": "Leadership", "title": "Meet the founder", "showFull": False}),
        sec("testimonials", {"eyebrow": "Testimonials", "title": "What clients say"}, bg="surface"),
        sec("faq", {"eyebrow": "FAQ", "title": "Questions, answered."}),
        cta(),
    ])
    about = page("about", "About Us", "Our story, vision, mission and values.", [
        header("About us", "Engineering from the Queen of Hills.", "Made with ❤️ in the Queen of Hills, for the 🌍", IMG["fog"]),
        sec("about", {"showValues": True}),
        sec("founder", {"eyebrow": "Founder", "title": "Leadership", "showFull": True}, bg="surface"),
        sec("tech_stack", {"eyebrow": "Expertise", "title": "Technical expertise", "subtitle": "", "categories": []}),
        cta(),
    ])
    web = service_page("web-development", "Website Development", "Corporate, healthcare, booking and e-commerce platforms that load fast and convert.", [
        ("Building", "Corporate websites", "Premium brand sites with CMS control."), ("Store", "Business websites", "Clear, fast sites for growing businesses."),
        ("HeartPulse", "Healthcare websites", "Doctor listings, appointments and patient info."), ("Hospital", "Hospital management systems", "OPD, billing, pharmacy and records."),
        ("ShoppingCart", "E-commerce platforms", "Catalogues, carts and payments."), ("CalendarCheck", "Booking platforms", "Slots, reminders and confirmations."),
        ("LayoutDashboard", "Admin dashboards", "Data-rich internal tools."), ("Code2", "Custom web apps", "Tailored workflows and portals."), ("Wrench", "Website maintenance", "Updates, backups and monitoring.")], IMG["code"])
    ios = service_page("ios-development", "iOS Application Development", "Native iPhone and iPad apps built with Swift, SwiftUI and UIKit.", [
        ("Swords", "Swift & SwiftUI", "Modern declarative UI with Swift concurrency."), ("Layers", "UIKit", "Mature, flexible UI for complex apps."),
        ("Boxes", "MVVM & Clean Architecture", "Testable, maintainable code."), ("Plug", "API integration", "REST, GraphQL and enterprise integrations."),
        ("Database", "Core Data & Firebase", "Offline storage and realtime sync."), ("KeyRound", "Authentication", "Biometrics, OAuth and SSO."),
        ("ShieldCheck", "Application security", "Keychain, SSL pinning, jailbreak detection."), ("Rocket", "App Store deployment", "Review-ready submissions."), ("Wrench", "Maintenance", "iOS updates and new features.")], IMG["phone"])
    android = service_page("android-development", "Android Application Development", "Kotlin and Jetpack Compose apps for phones and tablets.", [
        ("Code2", "Kotlin", "Concise, safe, modern Android code."), ("Layers", "Jetpack Compose", "Declarative, beautiful UI."),
        ("Boxes", "Android architecture", "MVVM, Hilt, Room and coroutines."), ("Plug", "API integration", "Robust networking and caching."),
        ("Bell", "Push notifications", "Firebase Cloud Messaging."), ("KeyRound", "Authentication", "Secure sign-in flows."),
        ("Rocket", "Google Play deployment", "Store listing and release tracks."), ("Gauge", "Performance optimization", "Startup, memory and battery tuning.")], IMG["silhouette"])
    ai = service_page("ai-solutions", "AI Solutions", "Chatbots, assistants and intelligent workflows that work for your customers 24/7.", [
        ("Bot", "AI chatbots", "Website and WhatsApp assistants trained on your content."), ("Mic", "AI voice assistants", "Spoken conversations for phone and web."),
        ("Languages", "Multilingual support", "English, Tamil and more."), ("Workflow", "Intelligent workflows", "Automate repetitive back-office work."),
        ("Hospital", "Hospital AI receptionists", "Answer patient questions and route calls."), ("CalendarClock", "Appointment automation", "Booking, reminders and rescheduling."),
        ("Server", "Self-hosted AI", "Private models on your own infrastructure.")], IMG["monitors"])
    portfolio = page("portfolio", "Portfolio", "Projects, clearly labelled by ownership.", [
        header("Portfolio", "Work & experience", "Every entry is labelled as company work, the founder's previous professional experience, a personal project or a demonstration."),
        sec("projects", {"eyebrow": "", "title": "", "subtitle": "", "mode": "all", "filterable": True}),
        cta(),
    ])
    tech = page("technologies", "Technologies", "The tools and platforms we build with.", [
        header("Technologies", "Our technology stack", "Interactive overview of the languages, frameworks and platforms we use."),
        sec("tech_stack", {"eyebrow": "", "title": "", "subtitle": "", "categories": []}),
        cta(),
    ])
    blog = page("blog", "Blog", "Insights on mobile, web and AI engineering.", [
        header("Blog", "Insights & updates", "Notes on building mobile apps, web platforms and AI products."),
        sec("blog_list", {"title": "", "limit": 9, "showSearch": True}),
    ])
    contact = page("contact", "Contact", "Start your project with The Nilgiris Softwares.", [
        header("Contact", "Let's build something great.", "Share a few details and we'll get back within one business day."),
        sec("contact_form", {"title": "Project enquiry", "subtitle": "", "showDetails": True}),
        sec("faq", {"eyebrow": "FAQ", "title": "Before you ask"}, bg="surface"),
    ])
    nav_items = [
        {"id": _id(), "label": "Home", "href": "/", "visible": True, "external": False, "children": []},
        {"id": _id(), "label": "About", "href": "/about", "visible": True, "external": False, "children": []},
        {"id": _id(), "label": "Services", "href": "/web-development", "visible": True, "external": False, "children": [
            {"id": _id(), "label": "Website Development", "href": "/web-development", "visible": True, "external": False},
            {"id": _id(), "label": "iOS Development", "href": "/ios-development", "visible": True, "external": False},
            {"id": _id(), "label": "Android Development", "href": "/android-development", "visible": True, "external": False},
            {"id": _id(), "label": "AI Solutions", "href": "/ai-solutions", "visible": True, "external": False}]},
        {"id": _id(), "label": "Portfolio", "href": "/portfolio", "visible": True, "external": False, "children": []},
        {"id": _id(), "label": "Technologies", "href": "/technologies", "visible": True, "external": False, "children": []},
        {"id": _id(), "label": "Blog", "href": "/blog", "visible": True, "external": False, "children": []},
        {"id": _id(), "label": "Contact", "href": "/contact", "visible": True, "external": False, "children": []},
    ]
    default_theme = {"id": "nilgiri-night", "name": "Nilgiri Night", "mode": "dark", "tokens": {
        "bg": "#080D12", "surface": "#111B23", "card": "#0E161D", "primary": "#2DBE87", "secondary": "#1B7F5C",
        "accent": "#68E0B5", "text": "#F7FAFC", "muted": "#94A3B0", "border": "#1E2C36", "header": "#080D12",
        "footer": "#060A0E", "buttonText": "#04110B", "hover": "#68E0B5", "shadow": "#000000",
        "gradientFrom": "#2DBE87", "gradientTo": "#68E0B5",
        "fontHeading": "Syne", "fontBody": "Figtree", "baseSize": 16, "headingWeight": 700, "bodyWeight": 400,
        "radius": 14, "spacing": 1, "container": 1240}}
    light = {"id": "morning-mist", "name": "Morning Mist", "mode": "light", "tokens": {
        **default_theme["tokens"], "bg": "#F5F8F6", "surface": "#E8EFEB", "card": "#FFFFFF", "text": "#0B1A14",
        "muted": "#4B5F56", "border": "#D3DED8", "header": "#F5F8F6", "footer": "#0B1A14", "primary": "#1B9E6C",
        "accent": "#1B7F5C", "buttonText": "#FFFFFF", "hover": "#14825A"}}
    return {
        "settings": {
            "companyName": "The Nilgiris Softwares Private Limited", "displayName": "The Nilgiris Softwares",
            "tagline": "Made with ❤️ in the Queen of Hills, for the 🌍",
            "headline": "Engineering Digital Experiences. Empowering Businesses Worldwide.",
            "logo": "", "favicon": "",
            "contact": {"email": "bharathi91m@gmail.com", "phone": "+91 9585483215", "whatsapp": "+919585483215",
                        "address": "Ooty, The Nilgiris, Tamil Nadu, India", "confirmed": False},
            "social": [{"id": _id(), "platform": "linkedin", "url": "https://www.linkedin.com/in/bharathi91"},
                       {"id": _id(), "platform": "github", "url": "https://github.com/bharathi91"}],
            "defaultLanguage": "en", "timezone": "Asia/Kolkata", "dateFormat": "dd MMM yyyy",
            "maintenance": {"enabled": False, "message": "We're polishing things up. Back shortly."},
            "analytics": {"enabled": True, "respectDnt": True},
            "cookieConsent": {"enabled": True, "text": "We use privacy-friendly analytics without third-party cookies."},
            "privacyPolicy": "Privacy policy draft — edit in Admin → Global Settings.",
            "terms": "Terms and conditions draft — edit in Admin → Global Settings.",
            "notifications": {"emails": [], "onLead": True, "onHandover": True},
            "email": {"replyTo": ""},
        },
        "theme": {"activeId": "nilgiri-night", "darkId": "nilgiri-night", "lightId": "morning-mist", "allowToggle": True,
                  "defaultMode": "dark", "presets": [default_theme, light]},
        "animations": {"enabled": True, "duration": 0.7, "distance": 28, "stagger": 0.08},
        "navigation": {"sticky": True, "layout": "split", "ctaLabel": "Start Your Project", "ctaHref": "/contact", "items": nav_items},
        "footer": {
            "about": "Websites, mobile apps and intelligent software — engineered in Ooty for clients worldwide.",
            "columns": [
                {"id": _id(), "title": "Services", "links": [{"label": "Website Development", "href": "/web-development"}, {"label": "iOS Development", "href": "/ios-development"}, {"label": "Android Development", "href": "/android-development"}, {"label": "AI Solutions", "href": "/ai-solutions"}]},
                {"id": _id(), "title": "Company", "links": [{"label": "About", "href": "/about"}, {"label": "Portfolio", "href": "/portfolio"}, {"label": "Blog", "href": "/blog"}, {"label": "Contact", "href": "/contact"}]},
            ],
            "copyright": "© {year} The Nilgiris Softwares Private Limited. All rights reserved.",
            "legal": [{"label": "Privacy Policy", "href": "/privacy"}, {"label": "Terms", "href": "/terms"}],
            "showSocial": True,
        },
        "pages": [home, about, web, ios, android, ai, portfolio, tech, blog, contact],
        "services": [{"id": _id(), "slug": s[0], "title": s[1], "icon": s[2], "summary": s[3], "features": [],
                      "href": f"/{s[0]}" if s[0] in ("web-development", "ios-development", "android-development", "ai-solutions") else "/contact",
                      "visible": True, "featured": i < 6} for i, s in enumerate(SERVICE_ITEMS)],
        "projects": [{"id": _id(), "name": p[0], "category": p[1], "platform": p[2], "classification": "founder_experience",
                      "description": "Details pending verification from the founder's portfolio.", "tech": ["Swift"] if p[2] == "iOS" else [],
                      "screenshots": [], "features": [], "contribution": "", "link": "", "featured": i < 6, "visible": True}
                     for i, p in enumerate(PROJECTS)],
        "technologies": [{"id": _id(), "name": n, "category": c} for c, names in TECH.items() for n in names],
        "testimonials": [],
        "faqs": [{"id": _id(), "q": q, "a": a} for q, a in FAQS],
        "about": {
            "intro": "The Nilgiris Softwares Private Limited is an information technology and software development company headquartered in Ooty, the Queen of Hills.",
            "vision": "To be a trusted engineering partner for businesses worldwide — proving world-class software can be built anywhere.",
            "mission": "Deliver secure, beautiful and dependable digital products with honest timelines and long-term support.",
            "values": [{"title": "Craft", "text": "We care about the details users feel."}, {"title": "Integrity", "text": "Clear scopes, honest estimates, real ownership."},
                       {"title": "Security", "text": "Privacy and safety by default."}, {"title": "Partnership", "text": "We succeed when you do."}],
            "philosophy": "Small senior teams, short feedback loops and software that is easy to maintain.",
        },
        "founder": {
            "name": "Bharathi Kumar", "title": "Founder & Lead iOS Software Engineer", "photo": "",
            "bio": "Senior / Lead iOS software engineer with approximately 10+ years of iOS development experience (subject to verification). Expertise in Swift, SwiftUI, UIKit, mobile application architecture, enterprise integrations and application security, with experience across healthcare, finance, government services, fitness and identity verification.",
            "experience": [], "expertise": ["Swift", "SwiftUI", "UIKit", "Mobile architecture", "Enterprise integrations", "Application security"],
            "domains": ["Healthcare", "Finance", "Government services", "Fitness", "Identity verification"],
            "links": {"linkedin": "https://www.linkedin.com/in/bharathi91", "github": "https://github.com/bharathi91"},
            "verified": False,
        },
        "components": [],
        "seo": {"siteTitle": "The Nilgiris Softwares", "titleTemplate": "%s | The Nilgiris Softwares",
                "description": "Websites, iOS & Android apps, AI chatbots and custom software from Ooty, India — for businesses worldwide.",
                "keywords": "software company Ooty, iOS app development, Android app development, website development, AI chatbot",
                "ogImage": IMG["tea"], "robots": "User-agent: *\nAllow: /\nDisallow: /admin", "structuredData": "", "siteUrl": ""},
        "redirects": [],
        "ai": {"chatEnabled": True, "greeting": "Hi! I'm the Nilgiris Softwares assistant. Ask me about our services, projects or how to start a project.",
               "availability": {"mode": "always", "start": "09:00", "end": "19:00", "offlineMessage": "We're offline right now — leave your details and we'll reply soon."},
               "languages": ["en", "ta"], "defaultLanguage": "en",
               "knowledge": [{"id": _id(), "title": "Engagement models", "content": "Fixed-price projects for clear scopes; monthly retainers for ongoing development and maintenance."}],
               "leadCapture": {"enabled": True, "afterMessages": 3},
               "handover": {"enabled": True, "message": "Want to talk to a person? Leave your details and our team will reach out."},
               "retentionDays": 90, "storeConversations": True,
               "voice": {"enabled": False, "provider": "none", "voice": "female", "languages": ["en", "ta"]}},
    }


DEFAULT_TEMPLATES = [
    {"name": "Thank you for your enquiry", "subject": "Thanks for contacting {company}",
     "body": "Hi {name},\n\nThank you for reaching out about {service}. We've received your enquiry and will get back to you within one business day.\n\nWarm regards,\n{company}"},
    {"name": "Schedule a call", "subject": "Let's schedule a quick call — {company}",
     "body": "Hi {name},\n\nThanks for your interest in {service}. We'd love to understand your requirements better. Could you share two or three time slots that work for a 30-minute call?\n\nBest,\n{company}"},
    {"name": "Proposal sent", "subject": "Your project proposal from {company}",
     "body": "Hi {name},\n\nWe've prepared a proposal for your {service} project and will share it with you shortly. Happy to walk you through it.\n\nRegards,\n{company}"},
]
