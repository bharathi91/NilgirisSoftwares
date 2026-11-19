import { useCallback, useEffect, useRef, useState } from "react";
import _ from "lodash";
import { toast } from "sonner";
import { Eye, Rocket, Save, Undo2, Upload, FileText, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { errMsg } from "../lib/api";
import { useAdmin } from "./AdminApp";
import { Fields, ListEditor, Panel, confirmAction } from "./fields";

const T = (k, label, type = "text", extra = {}) => ({ k, label, type, ...extra });
const VIS = T("visible", "Show on the page", "switch");

const F = {
  profile: [T("name", "Full name"), T("headline", "Headline"), T("tagline", "Tagline", "textarea"), T("summary", "Summary", "textarea", { rows: 4 }),
    T("summary_points", "About bullet points", "tags"), T("photo", "Profile photo", "image"), T("intro_video", "Intro video (optional)", "video"), T("location", "Location"), T("availability", "Availability note")],
  contact: [T("email", "Email"), T("phone", "Phone"), T("linkedin", "LinkedIn URL"), T("github", "GitHub URL"), T("website", "Website URL")],
  site: [T("brand", "Brand name (top-left)"), T("hero_eyebrow", "Hero eyebrow"), T("hero_title", "Hero carousel title"), T("hero_photo_caption", "Photo caption"),
    T("hero_photo_subcaption", "Photo sub-caption"), T("marquee", "Scrolling skills strip", "tags"), T("hero_autoplay", "Auto-play hero carousel", "switch"),
    T("hero_interval", "Carousel interval (seconds)", "number"), T("hero_per_screen", "Apps per hero screen", "number"), T("hero_show_code", "Show Swift code card", "switch"), T("footer_text", "Footer text")],
  sections: [VIS, T("eyebrow", "Eyebrow"), T("title", "Title"), T("subtitle", "Subtitle", "textarea"),
    T("blocks", "Button blocks (custom sections)", "list", { itemLabel: "type", fields: [T("buttons", "Buttons", "list", { itemLabel: "label", fields: [T("label", "Label"), T("url", "URL")] })] })],
  projects: [VIS, T("title", "Project name"), T("category", "Category"), T("role", "My role"), T("description", "Short description", "textarea"), T("bullets", "Key features", "tags"),
    T("tags", "Technologies", "tags"), T("icon", "App icon", "image"), T("image", "Cover image", "image"), T("screenshots", "Screenshots", "images"), T("video", "Demo video", "video"),
    T("challenges", "Challenges", "textarea"), T("results", "Results", "textarea"), T("app_store", "App Store URL"), T("play_store", "Play Store URL"), T("link", "Website link"),
    T("link_label", "Website link label"), T("repo", "GitHub repo URL"), T("featured", "Featured", "switch"), T("in_hero", "Show in hero carousel", "switch")],
  skills: [VIS, T("title", "Group title"), T("description", "Description"), T("items", "Skills", "tags")],
  experiences: [VIS, T("role", "Role"), T("company", "Company"), T("start", "Start (MM/YYYY)"), T("end", "End (empty = Present)"), T("location", "Location"),
    T("summary", "Summary", "textarea"), T("bullets", "Highlights", "tags"), T("tags", "Tags", "tags"), T("logo", "Company logo", "image"), T("url", "Company URL")],
  achievements: [VIS, T("metric", "Metric (e.g. 30%)"), T("title", "Title"), T("description", "Description", "textarea")],
  education: [VIS, T("institution", "Institution"), T("degree", "Degree"), T("field", "Field"), T("start", "Start"), T("end", "End"), T("location", "Location"), T("description", "Description", "textarea")],
  buttons: [VIS, T("label", "Label"), T("url", "URL (use 'resume' for the résumé download)"), T("placements", "Where it shows (hero, summary, quicklinks, contact, footer, header)", "tags"), T("new_tab", "Open in new tab", "switch")],
  nav_items: [VIS, T("label", "Label"), T("href", "Link (#about, #skills …)"), T("new_tab", "Open in new tab", "switch")],
  seo: [T("title", "Page title"), T("description", "Meta description", "textarea"), T("keywords", "Keywords"), T("og_image", "Social share image", "image"), T("canonical", "Canonical URL"), T("noindex", "Hide from search engines", "switch")],
  settings: [T("showInNav", "Show 'My Portfolio' in the company header", "switch"), T("navLabel", "Header label")],
};

function usePortfolioDraft() {
  const { api } = useAdmin();
  const [draft, setDraft] = useState(null), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api.get("/admin/portfolio/draft"); setDraft(r.data); setDirty(false); }, [api]);
  useEffect(() => { load().catch((e) => toast.error(errMsg(e))); }, [load]);
  const set = (path, v) => { setDraft((d) => { const data = structuredClone(d.data); _.set(data, path, v); return { ...d, data }; }); setDirty(true); };
  const save = async () => {
    setBusy(true);
    try { const r = await api.put("/admin/portfolio/draft", { rev: draft.rev, data: draft.data }); setDraft((d) => ({ ...d, rev: r.data.rev, has_unpublished: true })); setDirty(false); toast.success("Portfolio draft saved"); return true; }
    catch (e) { toast.error(errMsg(e)); return false; } finally { setBusy(false); }
  };
  const publish = async () => {
    if (dirty && !(await save())) return;
    if (!(await confirmAction("Publish the portfolio draft to the live /portfolio page?", "Publish portfolio"))) return;
    try { await api.post("/admin/portfolio/publish", { note: "" }); await load(); toast.success("Portfolio published"); } catch (e) { toast.error(errMsg(e)); }
  };
  const discard = async () => {
    if (!(await confirmAction("Discard unpublished portfolio changes?"))) return;
    try { await api.post("/admin/portfolio/discard"); await load(); toast.success("Changes discarded"); } catch (e) { toast.error(errMsg(e)); }
  };
  const preview = async () => { if (dirty && !(await save())) return; window.open("/portfolio/preview", "_blank"); };
  return { draft, dirty, busy, set, save, publish, discard, preview, load };
}

function Toolbar({ p }) {
  const { can } = useAdmin();
  return <div className="flex flex-wrap items-center gap-2 mb-6" data-testid="pf-toolbar">
    <Badge variant="outline" data-testid="pf-status" className={p.dirty ? "border-amber-500 text-amber-400" : p.draft.has_unpublished ? "border-sky-500 text-sky-400" : "border-primary text-primary"}>
      {p.dirty ? "Unsaved changes" : p.draft.has_unpublished ? "Draft not published" : "Live is up to date"}</Badge>
    <div className="ml-auto flex flex-wrap gap-2">
      <Button variant="ghost" size="sm" onClick={p.preview} data-testid="pf-preview"><Eye size={15} className="mr-1.5" />Preview</Button>
      <Button variant="ghost" size="sm" onClick={p.discard} disabled={!p.draft.has_unpublished && !p.dirty} data-testid="pf-discard"><Undo2 size={15} className="mr-1.5" />Discard</Button>
      <Button variant="secondary" size="sm" onClick={p.save} disabled={!p.dirty || p.busy} data-testid="pf-save"><Save size={15} className="mr-1.5" />Save draft</Button>
      {can("publish") && <Button size="sm" onClick={p.publish} disabled={p.busy || (!p.dirty && !p.draft.has_unpublished)} data-testid="pf-publish"><Rocket size={15} className="mr-1.5" />Publish portfolio</Button>}
    </div></div>;
}

function ResumePanel({ p }) {
  const { api } = useAdmin();
  const ref = useRef(), [busy, setBusy] = useState(false);
  const r = p.draft.data.resume || {};
  const upload = async (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") return toast.error("Please choose a PDF file");
    const fd = new FormData(); fd.append("file", f); fd.append("folder", "portfolio");
    setBusy(true);
    try { const res = await api.post("/admin/media", fd); p.set("resume", { available: true, filename: f.name, size: res.data.size, media_id: res.data.id, url: res.data.url, updated_at: new Date().toISOString() }); toast.success("Résumé uploaded — save and publish to make it live"); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); ref.current.value = ""; }
  };
  return <Panel title="Résumé" desc="Visitors download this from the 'Download Résumé' buttons." testid="pf-resume-panel">
    <div className="flex flex-wrap items-center gap-3">
      <FileText className="text-primary" /><div className="flex-1 min-w-[200px]"><p className="text-sm" data-testid="pf-resume-name">{r.available ? r.filename : "No résumé uploaded"}</p>
        {r.available && <p className="text-xs text-muted-foreground">{Math.round((r.size || 0) / 1024)} KB · updated {String(r.updated_at || "").slice(0, 10)}</p>}</div>
      {r.available && <Button variant="outline" size="sm" onClick={() => p.set("resume", { ...r, available: false })} data-testid="pf-resume-hide">Hide download</Button>}
      <Button size="sm" onClick={() => ref.current.click()} disabled={busy} data-testid="pf-resume-upload"><Upload size={15} className="mr-1.5" />{busy ? "Uploading…" : r.available ? "Replace PDF" : "Upload PDF"}</Button>
      <input ref={ref} type="file" accept="application/pdf" hidden onChange={(e) => upload(e.target.files[0])} data-testid="pf-resume-input" />
    </div></Panel>;
}

function Versions({ p }) {
  const { api, can } = useAdmin();
  const [items, setItems] = useState([]);
  const load = useCallback(() => api.get("/admin/portfolio/versions").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e))), [api]);
  useEffect(() => { load(); }, [load, p.draft.published_version]);
  const restore = async (v) => {
    if (!(await confirmAction(`Restore the portfolio version from ${v.at.slice(0, 16).replace("T", " ")}? It goes live immediately.`, "Restore version"))) return;
    try { await api.post(`/admin/portfolio/versions/${v.id}/restore`); await p.load(); toast.success("Version restored"); } catch (e) { toast.error(errMsg(e)); }
  };
  return <Panel title="Published versions" desc="Every portfolio publish is saved. Restore any of them." testid="pf-versions">
    <div className="divide-y">{items.map((v) => <div key={v.id} className="flex flex-wrap items-center gap-3 py-3" data-testid={`pf-version-${v.id}`}>
      <div className="flex-1 min-w-[200px]"><p className="text-sm">{v.note || (v.kind === "rollback" ? "Rollback" : "Published")} {v.id === p.draft.published_version && <Badge className="ml-2">Live</Badge>}</p>
        <p className="text-xs text-muted-foreground">{v.at.slice(0, 16).replace("T", " ")} · {v.by}</p></div>
      {can("publish") && v.id !== p.draft.published_version && <Button variant="outline" size="sm" onClick={() => restore(v)} data-testid={`pf-restore-${v.id}`}><RotateCcw size={14} className="mr-1.5" />Restore</Button>}
    </div>)}</div></Panel>;
}

const list = (p, key, label, title, addLabel) => <Panel title={title} testid={`pf-panel-${key}`}>
  <ListEditor items={p.draft.data[key] || []} onChange={(v) => p.set(key, v)} fields={F[key]} itemLabel={label} testid={`pf-${key}`} addLabel={addLabel}
    renderSummary={(it) => <span className={it.visible === false ? "opacity-50" : ""}>{it[label] || it.title || it.label || "Untitled"}{it.type ? ` · ${it.type}` : ""}{it.company ? ` · ${it.company}` : ""}{it.visible === false ? " (hidden)" : ""}</span>} />
</Panel>;

const obj = (p, key, fields, title, desc) => <Panel title={title} desc={desc} testid={`pf-panel-${key}`}>
  <Fields fields={fields} obj={p.draft.data[key]} prefix={`pf-${key}-`} onChange={(v) => p.set(key, v)} /></Panel>;

const TABS = [
  ["profile", "Profile", (p) => <>{obj(p, "profile", F.profile, "Personal profile")}{obj(p, "site", F.site, "Hero & page text")}</>],
  ["sections", "Sections", (p) => list(p, "sections", "title", "Sections — drag or use arrows to reorder, switch off to hide", "Add section")],
  ["projects", "Projects", (p) => list(p, "projects", "title", "Projects", "Add project")],
  ["skills", "Skills", (p) => list(p, "skills", "title", "Skill groups", "Add skill group")],
  ["experience", "Experience", (p) => list(p, "experiences", "role", "Work experience", "Add role")],
  ["more", "Achievements & education", (p) => <div className="space-y-6">{list(p, "achievements", "title", "Key achievements", "Add achievement")}{list(p, "education", "institution", "Education", "Add education")}</div>],
  ["resume", "Résumé & contact", (p) => <div className="space-y-6"><ResumePanel p={p} />{obj(p, "profile", F.contact, "Contact information")}{list(p, "buttons", "label", "Buttons & links", "Add button")}</div>],
  ["settings", "Navigation & SEO", (p) => <div className="space-y-6">{obj(p, "settings", F.settings, "Company header", "Controls the 'My Portfolio' item in the main website header.")}
    {list(p, "nav_items", "label", "Portfolio menu", "Add menu item")}{obj(p, "seo", F.seo, "SEO")}
    <Panel title="Colours" testid="pf-panel-theme"><div className="grid md:grid-cols-2 gap-6">{["light", "dark"].map((m) => <div key={m}><p className="text-sm mb-3 capitalize">{m} mode</p>
      <Fields fields={["primary", "accent", "background", "secondary", "text"].map((k) => T(k, k, "color"))} obj={p.draft.data.theme?.[m]} prefix={`pf-theme-${m}-`} onChange={(v) => p.set(`theme.${m}`, v)} /></div>)}</div></Panel></div>],
  ["versions", "Versions", (p) => <Versions p={p} />],
];

export default function PortfolioAdmin() {
  const p = usePortfolioDraft();
  useEffect(() => { const f = (e) => { if (p.dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", f); return () => window.removeEventListener("beforeunload", f); }, [p.dirty]);
  if (!p.draft) return <p className="text-sm text-muted-foreground" data-testid="pf-loading">Loading portfolio…</p>;
  return <div data-testid="portfolio-admin">
    <p className="text-sm text-muted-foreground mb-4 max-w-3xl">Everything on the <a href="/portfolio" target="_blank" rel="noreferrer" className="text-primary underline">/portfolio</a> page. This has its own draft, publish and version history, separate from the company website.</p>
    <Toolbar p={p} />
    <Tabs defaultValue="profile"><TabsList className="flex-wrap h-auto mb-6">{TABS.map(([k, l]) => <TabsTrigger key={k} value={k} data-testid={`pf-tab-${k}`}>{l}</TabsTrigger>)}</TabsList>
      {TABS.map(([k, , render]) => <TabsContent key={k} value={k} className="space-y-6">{render(p)}</TabsContent>)}</Tabs>
  </div>;
}
