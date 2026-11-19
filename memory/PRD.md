# PRD — The Nilgiris Softwares Private Limited: Corporate Website + Super Admin CMS

## Original problem statement
A premium, mobile-first corporate website for The Nilgiris Softwares Private Limited (Ooty), with a full Super Admin CMS. The public site is rendered from the database, and every editable element has an admin control. Content follows a Draft → Preview → Publish → Rollback workflow. The project also covers a visual page builder, theme editor, media library, leads CRM, blog, SEO, AI chat assistant, roles, audit logs, backups and analytics. Tagline: "Made with ❤️ in the Queen of Hills, for the 🌍".

## User choices
- Sign-in through Emergent-managed Clerk (email + password). Super Admin allowlist: bharathi91m@gmail.com, bharathi92m@gmail.com, shanthi91m@gmail.com (ADMIN_EMAIL). All other emails have no access unless a Super Admin invites them.
- AI chat runs on GPT-6 Luna with the Emergent LLM key. The voice assistant was not wanted; its screen honestly says it is not configured.
- Email goes through Emergent managed Resend. Files are kept in Emergent Object Storage.
- Visitors get a dark/light mode toggle (added on request).

## Architecture
- Backend: FastAPI (server.py, services.py, seed.py, clerk_auth.py) with MongoDB. Draft and published content are each one CMS document (`cms` collection), and every publish is snapshotted in `versions`. Other collections: leads, posts, media, users, invites, audit, login_events, analytics, chat_sessions, notifications, email_templates.
- Frontend: React (CRA) with Tailwind, Framer Motion and shadcn. The public renderer is schema-driven: 21 section types with per-breakpoint styles. Admin screens are lazy-loaded. The builder preview is a same-origin iframe at /preview/* that talks to the admin through postMessage.
- Media is served at /api/media/f/{id}.{hash}.{ext} with immutable caching, an ETag, Range support and webp variants (480/1200px).

## Implemented (2026-11-19)
- The public site has every requested page, a 5-slide hero carousel, a portfolio with ownership classification and filters, a blog, a contact form with an attachment, the chat widget, SEO meta and JSON-LD, sitemap and robots, cookie notice, maintenance mode, redirects and the dark/light toggle.
- The admin has all 41 sidebar screens working. It covers the page builder (add, delete, reorder, hide, duplicate, reuse sections, inline text edit, device preview) and all pages (create, rename, change URL, duplicate, delete). Themes support presets plus dark/light. Navigation, footer, content collections, the media library (upload, replace, crop, rename, folders, usage, soft delete) and the blog are all editable.
- Leads CRM covers statuses, notes, assignment, follow-up, template emails, CSV export and an activity log. There are also email templates, notifications and AI settings (knowledge base, languages, availability, lead capture, handover, retention, conversation review), plus SEO, social links and redirects.
- Administration includes users and roles (5 roles enforced on the server, invites, session revoke, protection of the last Super Admin), login history, audit logs, backup and restore, version history with compare and restore, and a publish page with diff, discard and submit-for-approval.
- Fixed after testing: chat widget crash, blog post route, weak-ETag 304, notification settings now read from the published content, toast position.

## Iteration 2 (2026-11-19)
- Imported the founder's details from thenilgirissoftwares.com: photo, 8 roles, achievements and education. Founder links (button, name, photo, hero slide) now go to https://thenilgirissoftwares.com.
- 18 projects now show their real App Store screenshots. GolfApp, Trackyfy and the 4 hospital sites (company projects) use generated covers tagged "Illustrative image". Each project has a case study page at /portfolio/<slug>.
- The hero carousel now has 10 slides about Ooty and engineering. There is a floating WhatsApp button (on/off in admin settings). Technology chips show tech logos, the "Why choose us" cards have images, and the About section has longer text and a 5-image carousel.
- Fixed: founder photo cropping (now shown at its natural size), case study pages open at the top, and the next-slide button on mobile is no longer covered.
- Content updates were applied with /app/scripts/content_update_v2.py and v3.py, then published as new versions.

## Iteration 3 (2026-11-19)
- Tamil website: a header language toggle switches the whole site. Published content is AI-translated with GPT-6 Luna and cached per published version (cms key tr:<lang>). Translation reruns on each publish, and the "Website languages" panel in admin Languages shows progress and a "Translate now" button. Fixed interface text comes from lib/i18n.js.
- Testimonials: clients submit at /share-feedback. An admin approves the submission (it becomes a verified testimonial in the draft), then publishes.
- Logos: AWS and Framer Motion fixed, and all logos sit on white badges.
- Hospital case studies: real screenshots of the 4 live sites (in the media library), plus features, challenge, approach and what was delivered. The founder-experience badge is now green like company projects. Project thumbnails no longer crop logos (fitted image on a blurred background).
- Header fixes: no overflow on mobile, and no wrapping in Tamil.

## Backlog
- P1: Verify the founder's details and projects, add photos and screenshots, and confirm the contact details. The original site blocked automated import.
- P1: Translation retry for failed batches; restrict regenerate to enabled languages; allow manual edits of Tamil translations
- P1: Blog schedule timezone (datetime-local is treated as UTC). The All Pages slug input commits only on blur.
- P2: Media toolbar search width, wrapping of the header button, portfolio header gap, cookie banner overlap.
- P2: Voice assistant once a self-hosted speech backend exists. Optional email 2FA in Clerk. Per-role content assignment for editors.
- P2: Docker/VPS deployment documentation and an admin user guide.

## Iteration 4 — Website consolidation (2026-11-19)
- Phases 1–5 approved (analysis, backup, portfolio integration, CMS, preview testing). Phases 6–7 (deploy to .com, release .me) wait for user approval. No domain or DNS changes made.
- Backups: /app/backups (db json, code tgz, website1_source.zip, website1_public_site.json).
- Website 1 source (career-profile-hub ZIP) migrated as real components to frontend/src/portfolio (namespaced classes and fonts: pf-*). Routes: /portfolio, /portfolio/work/:id, /portfolio/quick-view and /portfolio/preview. Legacy /work/:id and /quick-view redirect.
- Company projects moved from /portfolio to /projects; old /portfolio/<slug> links redirect.
- Backend: pf:draft and pf:published in cms, with versions in portfolio_versions. Public endpoints: /api/public/portfolio (ETag, hides items marked not visible), /api/public/portfolio/resume, and /api/public/portfolio/contact (creates a lead with source portfolio plus an email alert). Admin: /api/admin/portfolio/{draft,publish,discard,versions,versions/{id}/restore}. /api/public/site includes portfolio_nav.
- Admin "Portfolio Management" (admin/PortfolioAdmin.jsx) covers profile, sections, projects, skills, experience, achievements and education, résumé, contact and buttons, nav, SEO, colours and versions.
- Data and images were copied into Object Storage (scripts/portfolio_import.py). Company hotlinks to the old .com files were replaced and founder links now go to /portfolio (scripts/content_update_v5.py). MoneyGram now uses the user's logo.
- Test iteration 6: backend 45/46 (the one failure is the outside email 429 rate limit) and the frontend passes. Visibility-switch bug fixed afterwards.

## Pending (portfolio)
- P0 on approval: deploy to thenilgirissoftwares.com. Website 1's Emergent project must first release .com. Then detach .me.
- P1: Translate "My Portfolio" in Tamil. Warn before a version restore overwrites unpublished draft edits. Return 404 on portfolio publish when no draft exists. Make the mobile menu cover the full screen on /portfolio.
