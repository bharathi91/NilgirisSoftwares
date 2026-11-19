import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import _ from "lodash";
import { toast } from "sonner";
import { Trash2, Send, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAdmin } from "./AdminApp";
import { Fields, ListEditor, Panel, Label, Field, confirmAction } from "./fields";
import { ICONS } from "../lib/icons";
import { BACKEND, errMsg } from "../lib/api";

const L = (k, label, type = "text", extra = {}) => ({ k, label, type, ...extra });

function Bind({ path, fields, title, desc, testid }) {
  const { draft, setPath } = useAdmin();
  return <Panel title={title} desc={desc} testid={testid}><Fields fields={fields} obj={_.get(draft.data, path) || {}} prefix={`${path.replace(/\./g, "-")}-`} onChange={(v) => setPath(path, v)} /></Panel>;
}

function BindList({ path, fields, title, desc, itemLabel = "title", addLabel, newItem, summary }) {
  const { draft, setPath } = useAdmin();
  return <Panel title={title} desc={desc} testid={`list-${path}`}><ListEditor items={_.get(draft.data, path) || []} onChange={(v) => setPath(path, v)} fields={fields} itemLabel={itemLabel}
    testid={`list-${path.replace(/\./g, "-")}`} addLabel={addLabel} newItem={newItem} renderSummary={summary} /></Panel>;
}

const LINK = [L("label", "Label"), L("href", "Link (/page or https://…)")];
const CLASS_OPTS = [{ value: "company", label: "Company Project" }, { value: "founder_experience", label: "Founder's Previous Professional Experience" }, { value: "personal", label: "Personal Project" }, { value: "demo", label: "Demonstration Project" }];
const LANGS = { en: "English", ta: "Tamil", hi: "Hindi", ml: "Malayalam", kn: "Kannada", te: "Telugu", ar: "Arabic", fr: "French", de: "German", es: "Spanish" };
const SOCIALS = ["linkedin", "github", "twitter", "instagram", "facebook", "youtube", "whatsapp", "website"];

function ContactConfirm() {
  const { draft } = useAdmin();
  const ok = draft.data.settings.contact.confirmed;
  return <div className={`rounded-xl border p-4 flex gap-3 text-sm ${ok ? "border-primary/50" : "border-amber-500/60 bg-amber-500/5"}`} data-testid="contact-confirm-status">
    {ok ? <CheckCircle2 className="text-primary shrink-0" size={18} /> : <AlertTriangle className="text-amber-400 shrink-0" size={18} />}
    <span>{ok ? "Contact details are confirmed and shown on the public website." : "Contact details are hidden from the public site until you switch on “Confirmed as official contact details” below, then publish."}</span></div>;
}

function Settings() {
  const { api } = useAdmin();
  const testMail = async () => { try { await api.post("/admin/test-email"); toast.success("Test email sent to your admin email"); } catch (e) { toast.error(errMsg(e)); } };
  return <div className="grid lg:grid-cols-2 gap-5">
    <Bind path="settings" title="Brand" fields={[L("companyName", "Company name"), L("displayName", "Display name"), L("tagline", "Tagline"), L("headline", "Primary headline"), L("logo", "Logo", "image"), L("favicon", "Favicon", "image")]} />
    <div className="space-y-5"><ContactConfirm /><Bind path="settings.contact" title="Contact details" fields={[L("email", "Email"), L("phone", "Phone"), L("whatsapp", "WhatsApp number"), L("address", "Address", "textarea"), L("confirmed", "Confirmed as official contact details", "switch")]} /></div>
    <Bind path="settings" title="Locale" fields={[L("defaultLanguage", "Default language", "select", { options: Object.keys(LANGS) }), L("timezone", "Time zone (e.g. Asia/Kolkata)"), L("dateFormat", "Date format")]} />
    <Bind path="settings.whatsappButton" title="WhatsApp button" desc="Floating button on every page that opens a WhatsApp chat with a pre-filled message." fields={[L("enabled", "Show WhatsApp button", "switch"), L("number", "WhatsApp number (with country code)"), L("message", "Pre-filled message", "textarea"), L("label", "Button tooltip")]} />
    <Bind path="settings.maintenance" title="Maintenance mode" desc="When enabled and published, visitors see only the maintenance message." fields={[L("enabled", "Enable maintenance mode", "switch"), L("message", "Message", "textarea")]} />
    <Bind path="settings.analytics" title="Analytics" desc="First-party, cookie-free analytics. Visitors are counted with a daily rotating anonymous hash." fields={[L("enabled", "Collect page views", "switch")]} />
    <Bind path="settings.cookieConsent" title="Cookie notice" fields={[L("enabled", "Show notice", "switch"), L("text", "Notice text", "textarea")]} />
    <Panel title="Email & notifications" desc="Emails are sent through the managed email service; credentials stay on the server." actions={<Button size="sm" variant="outline" onClick={testMail} data-testid="send-test-email"><Send size={13} className="mr-1" />Send test</Button>}>
      <NotifFields /></Panel>
    <Bind path="settings" title="Legal" fields={[L("privacyPolicy", "Privacy policy", "textarea", { rows: 8 }), L("terms", "Terms and conditions", "textarea", { rows: 8 })]} />
  </div>;
}

function NotifFields() {
  const { draft, setPath } = useAdmin();
  const n = draft.data.settings.notifications || {}, e = draft.data.settings.email || {};
  return <div className="space-y-4">
    <Field f={L("emails", "Notify these emails about new leads (empty = Super Admins)", "tags")} value={n.emails} onChange={(v) => setPath("settings.notifications.emails", v)} testid="notify-emails" />
    <Field f={L("onLead", "Email on new enquiry", "switch")} value={n.onLead} onChange={(v) => setPath("settings.notifications.onLead", v)} testid="notify-onlead" />
    <Field f={L("onHandover", "Email on chat handover", "switch")} value={n.onHandover} onChange={(v) => setPath("settings.notifications.onHandover", v)} testid="notify-onhandover" />
    <Field f={L("replyTo", "Reply-to address for lead emails")} value={e.replyTo} onChange={(v) => setPath("settings.email.replyTo", v)} testid="email-replyto" />
  </div>;
}

function Seo() {
  const { draft, setPath } = useAdmin();
  const [i, setI] = useState(0);
  const p = draft.data.pages[i];
  return <div className="grid lg:grid-cols-2 gap-5">
    <Bind path="seo" title="Site-wide SEO" fields={[L("siteTitle", "Site title"), L("titleTemplate", "Title template (%s = page title)"), L("siteUrl", "Site URL (https://yourdomain.com)"), L("description", "Default meta description", "textarea"),
      L("keywords", "Default keywords"), L("ogImage", "Default social sharing image", "image"), L("robots", "robots.txt", "textarea", { rows: 4 }), L("structuredData", "Structured data (JSON-LD, optional)", "textarea", { rows: 5 })]} />
    <Panel title="Page SEO" desc="Each page can override the defaults." testid="page-seo-panel">
      <Label>Page</Label><select className="admin-select mb-4" value={i} onChange={(e) => setI(+e.target.value)} data-testid="seo-page-select">{draft.data.pages.map((x, k) => <option key={x.id} value={k}>{x.title}</option>)}</select>
      <Fields fields={[L("title", "Page title"), L("description", "Meta description", "textarea"), L("keywords", "Keywords"), L("canonical", "Canonical URL"), L("ogImage", "Open Graph image", "image"),
        L("ogTitle", "Social sharing title"), L("ogDescription", "Social sharing description", "textarea"), L("noindex", "Hide from search engines", "switch"), L("jsonld", "Structured data (JSON-LD)", "textarea")]}
        obj={p.seo || {}} prefix="pseo-" onChange={(v) => setPath(`pages[${i}].seo`, v)} />
      <p className="text-xs text-muted-foreground mt-4">URL slug is edited in All Pages. Sitemap: <a className="text-primary underline" href={`${BACKEND}/api/sitemap.xml`} target="_blank" rel="noreferrer">/api/sitemap.xml</a> · robots: <a className="text-primary underline" href={`${BACKEND}/api/robots.txt`} target="_blank" rel="noreferrer">/api/robots.txt</a></p>
    </Panel></div>;
}

function Submissions() {
  const { api, can, reload } = useAdmin();
  const [items, setItems] = useState([]);
  const load = () => api.get("/admin/testimonial-submissions").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line
  const link = `${window.location.origin}/share-feedback`;
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); load(); } catch (e) { toast.error(errMsg(e)); } };
  return <Panel title="Collect testimonials" desc="Send this link to your hospital clients. Submissions arrive here; approved ones are added to the list below as verified (then Publish)." testid="testimonial-submissions">
    <div className="flex gap-2 mb-4"><input readOnly value={link} className="admin-select" data-testid="feedback-link" />
      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }} data-testid="copy-feedback-link">Copy link</Button></div>
    <div className="space-y-2">{items.map((t) => <div key={t.id} className="rounded-xl border p-3 text-sm" data-testid={`submission-${t.id}`}>
      <p className="italic">“{t.quote}”</p><p className="text-xs text-muted-foreground mt-1">{t.name}{t.role ? `, ${t.role}` : ""}{t.company ? ` · ${t.company}` : ""} · {t.email} · {new Date(t.created_at).toLocaleDateString()}</p>
      {t.status === "pending" && can("content.write") ? <div className="flex gap-2 mt-2"><Button size="sm" onClick={() => act(async () => { await api.post(`/admin/testimonial-submissions/${t.id}/approve`); await reload(); }, "Approved and added — publish to show it")} data-testid={`approve-${t.id}`}>Approve</Button>
        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => act(() => api.delete(`/admin/testimonial-submissions/${t.id}`), "Rejected")} data-testid={`reject-${t.id}`}>Reject</Button></div>
        : <span className="text-xs uppercase tracking-wider text-primary">{t.status}</span>}</div>)}
      {!items.length && <p className="text-sm text-muted-foreground">No submissions yet.</p>}</div></Panel>;
}

function SiteLanguages() {
  const { api, draft, setPath, can } = useAdmin();
  const [st, setSt] = useState([]);
  const load = () => api.get("/admin/translations/status").then((r) => setSt(r.data));
  useEffect(() => { load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, []); // eslint-disable-line
  const langs = draft.data.settings.siteLanguages || ["en", "ta"];
  return <Panel title="Website languages" desc="Visitors switch the whole website with the language button in the header. Content is translated automatically by AI each time you publish." testid="site-languages">
    <div className="flex flex-wrap gap-2">{Object.entries(LANGS).map(([k, v]) => <label key={k} className={`rounded-xl border px-3 py-2 text-sm cursor-pointer ${langs.includes(k) ? "border-primary bg-primary/10" : ""}`}>
      <input type="checkbox" className="mr-2 accent-primary" disabled={k === "en"} checked={langs.includes(k)} onChange={() => setPath("settings.siteLanguages", langs.includes(k) ? langs.filter((x) => x !== k) : [...langs, k])} data-testid={`site-lang-${k}`} />{v}</label>)}</div>
    <div className="mt-4 space-y-2">{st.map((x) => <div key={x.lang} className="flex items-center gap-3 text-sm" data-testid={`tr-status-${x.lang}`}>
      <b>{LANGS[x.lang] || x.lang}</b><span className="text-muted-foreground">{x.running ? "Translating…" : x.up_to_date ? `Up to date · ${x.coverage}% translated` : "Out of date"}</span>
      {can("publish") && <Button size="sm" variant="outline" onClick={async () => { await api.post(`/admin/translations/${x.lang}/regenerate`); toast.success("Translation started"); setTimeout(load, 1500); }} data-testid={`tr-regen-${x.lang}`}>Translate now</Button>}</div>)}</div>
  </Panel>;
}

function Languages() {
  const { draft, setPath } = useAdmin();
  const ai = draft.data.ai;
  const toggle = (k) => setPath("ai.languages", ai.languages.includes(k) ? ai.languages.filter((x) => x !== k) : [...ai.languages, k]);
  return <div className="space-y-5"><SiteLanguages /><Panel title="Assistant languages" desc="Visitors can pick any enabled language; the assistant replies in it.">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">{Object.entries(LANGS).map(([k, v]) => <label key={k} className={`rounded-xl border p-3 text-sm cursor-pointer ${ai.languages.includes(k) ? "border-primary bg-primary/10" : ""}`}>
      <input type="checkbox" className="mr-2 accent-primary" checked={ai.languages.includes(k)} onChange={() => toggle(k)} data-testid={`lang-${k}`} />{v}</label>)}</div>
    <div className="mt-5 max-w-xs"><Field f={L("defaultLanguage", "Default language", "select", { options: ai.languages.map((k) => ({ value: k, label: LANGS[k] || k })) })} value={ai.defaultLanguage} onChange={(v) => setPath("ai.defaultLanguage", v)} testid="ai-default-language" /></div>
  </Panel></div>;
}

function Conversations() {
  const { api } = useAdmin();
  const [items, setItems] = useState([]), [open, setOpen] = useState(null);
  const load = () => api.get("/admin/conversations").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line
  return <div className="grid lg:grid-cols-[380px_1fr] gap-5">
    <Bind path="ai" title="Conversation settings" fields={[L("storeConversations", "Store conversations for review", "switch"), L("retentionDays", "Delete conversations after (days, 0 = keep)", "number")]} />
    <Panel title={`Conversations (${items.length})`} desc="Only conversations stored while storage was on appear here.">
      <div className="space-y-2 max-h-[65vh] overflow-y-auto">{items.map((c) => <div key={c.id} className="rounded-xl border p-3" data-testid={`conversation-${c.id}`}>
        <div className="flex items-center gap-2"><button className="flex-1 text-left text-sm" onClick={() => setOpen(open === c.id ? null : c.id)}>{c.messages?.[0]?.content?.slice(0, 80) || "(empty)"}
          <span className="block text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleString()} · {c.messages?.length || 0} messages · {c.language}{c.handover ? " · handed over" : ""}</span></button>
          <Button size="icon" variant="ghost" className="text-red-400" onClick={async () => { if (await confirmAction("Delete this conversation?")) { await api.delete(`/admin/conversations/${c.id}`); load(); } }} data-testid={`conversation-del-${c.id}`}><Trash2 size={14} /></Button></div>
        {open === c.id && <div className="mt-3 space-y-2">{c.messages.map((m, i) => <p key={i} className={`text-sm rounded-lg p-2 ${m.role === "user" ? "bg-primary/10" : "bg-muted"}`}><b className="text-xs uppercase mr-2">{m.role}</b>{m.content}</p>)}</div>}
      </div>)}{!items.length && <p className="text-sm text-muted-foreground">No conversations yet.</p>}</div></Panel></div>;
}

const SCREENS = {
  navigation: () => <div className="grid lg:grid-cols-[360px_1fr] gap-5"><div className="space-y-5">
    <Bind path="navigation" title="Header" fields={[L("sticky", "Sticky header", "switch"), L("layout", "Layout", "select", { options: ["split", "center"] }), L("ctaLabel", "Header button label"), L("ctaHref", "Header button link")]} />
    <Bind path="settings" title="Logo" fields={[L("logo", "Header logo", "image"), L("displayName", "Name next to logo")]} /></div>
    <BindList path="navigation.items" title="Menu items" desc="Drag to reorder. Links are validated when you publish." itemLabel="label" addLabel="Add menu item"
      newItem={() => ({ label: "New link", href: "/", visible: true, external: false, children: [] })}
      fields={[...LINK, L("visible", "Visible", "switch"), L("children", "Dropdown items", "list", { itemLabel: "label", fields: [...LINK, L("visible", "Visible", "switch")] })]} /></div>,
  footer: () => <div className="grid lg:grid-cols-2 gap-5"><Bind path="footer" title="Footer" fields={[L("about", "About text", "textarea"), L("copyright", "Copyright ({year} = current year)"), L("showSocial", "Show social icons", "switch")]} />
    <div className="space-y-5"><BindList path="footer.columns" title="Columns" fields={[L("title", "Column title"), L("links", "Links", "list", { itemLabel: "label", fields: LINK })]} newItem={() => ({ title: "Column", links: [] })} />
      <BindList path="footer.legal" title="Legal links" itemLabel="label" fields={LINK} /></div></div>,
  about: () => <div className="grid lg:grid-cols-2 gap-5"><Bind path="about" title="Company" fields={[L("intro", "Introduction", "textarea", { rows: 4 }), L("vision", "Vision", "textarea"), L("mission", "Mission", "textarea"), L("philosophy", "Company philosophy", "textarea")]} />
    <BindList path="about.values" title="Core values" fields={[L("title", "Value"), L("text", "Description", "textarea")]} /></div>,
  founder: () => <div className="grid lg:grid-cols-2 gap-5">
    <div className="space-y-5">
      <Bind path="founder" title="Founder profile" fields={[L("name", "Name"), L("title", "Title"), L("photo", "Photo", "image"), L("bio", "Biography", "textarea", { rows: 6 }), L("expertise", "Technical expertise", "tags"), L("domains", "Industries", "tags"), L("education", "Education"), L("verified", "Details verified", "switch")]} />
      <Bind path="founder.links" title="Profiles" fields={[L("portfolio", "Personal portfolio URL"), L("linkedin", "LinkedIn URL"), L("github", "GitHub URL"), L("stackoverflow", "Stack Overflow URL"), L("medium", "Medium URL")]} /></div>
    <div className="space-y-5"><BindList path="founder.experience" title="Professional journey" itemLabel="company" fields={[L("role", "Role"), L("company", "Company"), L("period", "Period"), L("summary", "Summary", "textarea")]} />
      <BindList path="founder.achievements" title="Key achievements" itemLabel="label" fields={[L("value", "Value"), L("label", "Label")]} newItem={() => ({ value: "", label: "" })} /></div></div>,
  services: () => <BindList path="services" title="Services" desc="Featured services appear first on the homepage." fields={[L("title", "Title"), L("slug", "Slug"), L("icon", "Icon", "select", { options: Object.keys(ICONS) }), L("summary", "Summary", "textarea"), L("href", "Link to"), L("features", "Features", "tags"), L("visible", "Visible", "switch"), L("featured", "Featured", "switch")]}
    newItem={() => ({ title: "New service", slug: "new-service", icon: "Sparkles", summary: "", href: "/contact", features: [], visible: true, featured: false })} />,
  projects: () => <BindList path="projects" title="Projects" desc="Always classify ownership correctly — never present previous-employer work as company work." itemLabel="name"
    summary={(p) => <>{p.name} <span className="text-xs text-muted-foreground">· {CLASS_OPTS.find((c) => c.value === p.classification)?.label}{p.featured ? " · featured" : ""}{p.visible === false ? " · hidden" : ""}</span></>}
    newItem={() => ({ name: "New project", slug: `project-${Date.now().toString(36)}`, category: "", classification: "company", platform: "Web", description: "", cover: "", coverIllustrative: false, tech: [], screenshots: [], features: [], contribution: "", link: "", featured: false, visible: true, summary: "", challenge: "", solution: "", results: [], story: "" })}
    fields={[L("name", "Project name"), L("slug", "Case study URL (/portfolio/…)"), L("category", "Category"), L("classification", "Classification", "select", { options: CLASS_OPTS }), L("platform", "Platform"), L("description", "Short description", "textarea"),
      L("cover", "Cover image", "image"), L("coverIllustrative", "Cover is an illustrative (not real) image", "switch"),
      L("tech", "Technology stack", "tags"), L("screenshots", "Screenshots", "images"), L("features", "Features", "tags"), L("contribution", "Contribution / what we delivered", "textarea"), L("link", "External link"), L("featured", "Featured", "switch"), L("visible", "Visible", "switch"),
      L("summary", "Case study: summary", "textarea"), L("challenge", "Case study: the challenge", "textarea"), L("solution", "Case study: our approach", "textarea"),
      L("results", "Case study: results (only verified numbers)", "list", { itemLabel: "label", fields: [L("value", "Value (e.g. 40%)"), L("label", "Label")] }), L("story", "Case study: full story", "rich")]} />,
  technologies: () => <BindList path="technologies" title="Technologies" itemLabel="name" summary={(t) => <>{t.name} <span className="text-xs text-muted-foreground">· {t.category}</span></>}
    fields={[L("name", "Name"), L("image", "Logo image (SVG/PNG URL or upload)", "image"), L("category", "Category", "select", { options: ["Frontend", "Backend", "iOS", "Android", "Databases", "DevOps", "AI", "Cloud", "Security"] })]} newItem={() => ({ name: "New technology", category: "Frontend" })} />,
  testimonials: () => <div className="space-y-5"><Submissions /><BindList path="testimonials" title="Testimonials" desc="Only add testimonials you can verify. Unverified ones stay hidden." itemLabel="name"
    fields={[L("name", "Name"), L("role", "Role"), L("company", "Company"), L("quote", "Quote", "textarea"), L("verified", "Verified", "switch")]} newItem={() => ({ name: "", role: "", company: "", quote: "", verified: false })} /></div>,
  faqs: () => <BindList path="faqs" title="FAQs" itemLabel="q" fields={[L("q", "Question"), L("a", "Answer", "textarea")]} newItem={() => ({ q: "New question", a: "" })} />,
  components: () => <BindList path="components" title="Reusable components" desc="Save any section from the Page Builder with “Reuse”, then insert it on any page via Add section." itemLabel="name" fields={[L("name", "Name")]} newItem={() => ({ name: "Call to action", section: { type: "cta", visible: true, props: { title: "Ready to start?", subtitle: "", buttons: [{ label: "Contact us", href: "/contact", variant: "primary" }] }, style: {} } })} />,
  animations: () => <Bind path="animations" title="Animations" desc="Applies site-wide; each section's entrance style is set in the Page Builder. Visitors with reduced-motion preferences see no animation." fields={[L("enabled", "Enable animations", "switch"), L("duration", "Duration (seconds)", "number"), L("distance", "Movement distance (px)", "number"), L("stagger", "Stagger delay (seconds)", "number")]} />,
  social: () => <BindList path="settings.social" title="Social links" itemLabel="platform" fields={[L("platform", "Platform", "select", { options: SOCIALS }), L("url", "URL")]} newItem={() => ({ platform: "linkedin", url: "" })} />,
  redirects: () => <BindList path="redirects" title="Redirects" desc="Visitors opening the old path are sent to the new one." itemLabel="from" summary={(r) => `${r.from || "?"} → ${r.to || "?"}`} fields={[L("from", "From path (/old-page)"), L("to", "To (/new-page or https://…)"), L("code", "Type", "select", { options: ["301", "302"] })]} newItem={() => ({ from: "/old", to: "/", code: "301" })} />,
  settings: Settings,
  seo: Seo,
  "ai-chat": () => <div className="grid lg:grid-cols-2 gap-5"><Bind path="ai" title="Chat assistant" desc="Powered by GPT-6 Luna, grounded in your published content and knowledge base." fields={[L("chatEnabled", "Enable chat on website", "switch"), L("greeting", "Greeting", "textarea")]} />
    <Bind path="ai.availability" title="Availability" fields={[L("mode", "Mode", "select", { options: [{ value: "always", label: "Always on" }, { value: "hours", label: "Working hours only" }] }), L("start", "Start (HH:MM)"), L("end", "End (HH:MM)"), L("offlineMessage", "Offline message", "textarea")]} />
    <Bind path="ai.leadCapture" title="Lead capture" fields={[L("enabled", "Ask for contact details", "switch"), L("afterMessages", "After this many visitor messages", "number")]} />
    <Bind path="ai.handover" title="Human handover" fields={[L("enabled", "Show “Talk to a human” button", "switch"), L("message", "Handover message", "textarea")]} /></div>,
  "ai-voice": () => <div className="space-y-5 max-w-3xl"><div className="rounded-xl border border-amber-500/60 bg-amber-500/5 p-4 text-sm flex gap-3" data-testid="voice-status"><AlertTriangle size={18} className="text-amber-400 shrink-0" />
    Voice is not active: no speech-recognition or text-to-speech backend is configured. Settings below are stored and ready for a self-hosted speech provider; the website will not show a microphone until one is connected and tested.</div>
    <Bind path="ai.voice" title="Voice assistant" fields={[L("provider", "Speech provider", "select", { options: [{ value: "none", label: "Not configured" }, { value: "self_hosted", label: "Self-hosted (endpoint required)" }] }), L("voice", "Voice", "select", { options: ["female", "male"] }), L("languages", "Voice languages", "tags")]} /></div>,
  "ai-languages": Languages,
  "ai-knowledge": () => <BindList path="ai.knowledge" title="Knowledge base" desc="Private facts the assistant can use (pricing approach, process, policies). Not shown on the website." fields={[L("title", "Topic"), L("content", "Content", "textarea", { rows: 5 })]} newItem={() => ({ title: "New topic", content: "" })} />,
  "ai-conversations": Conversations,
};

export default function ContentScreens() {
  const { screen } = useParams();
  const S = SCREENS[screen];
  if (!S) return <p className="text-muted-foreground" data-testid="screen-not-found">Screen not found. <ExternalLink size={12} className="inline" /></p>;
  return <div data-testid={`screen-${screen}`}><S /></div>;
}
