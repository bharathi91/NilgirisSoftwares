import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Show, UserButton, useClerk } from "@clerk/react";
import _ from "lodash";
import { toast } from "sonner";
import { LayoutDashboard, BarChart3, Activity, PenTool, Files, Home, Menu, PanelBottom, Palette, Images, Puzzle, Wand2, Building2, UserRound, Briefcase, FolderKanban, Cpu, Quote, Newspaper, HelpCircle,
  Inbox, Users, Mail, Bell, Bot, Mic, Languages, BookOpen, MessagesSquare, Search, Share2, TrendingUp, Shuffle, ShieldCheck, KeyRound, Settings, Lock, ScrollText, DatabaseBackup, History, Rocket, Eye, Save, Undo2, X, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useAdminApi, errMsg } from "../lib/api";
import { ConfirmHost, confirmAction } from "./fields";

const Builder = lazy(() => import("./PageBuilder"));
const Content = lazy(() => import("./ContentScreens"));
const Theme = lazy(() => import("./ThemeEditor"));
const Media = lazy(() => import("./MediaLibrary"));
const Business = lazy(() => import("./Business"));
const Blog = lazy(() => import("./Blog"));
const Ops = lazy(() => import("./Ops"));

const Ctx = createContext(null);
export const useAdmin = () => useContext(Ctx);
export const usePath = (path) => {
  const { draft, setPath } = useAdmin();
  return [_.get(draft.data, path), (v) => setPath(path, v)];
};

export const NAV = [
  ["Overview", [["dashboard", "Dashboard", LayoutDashboard, "content.read"], ["analytics", "Analytics", BarChart3, "analytics.read"], ["activity", "Recent Activity", Activity, "audit.read"]]],
  ["Website Management", [["builder", "Visual Page Builder", PenTool, "content.write"], ["pages", "All Pages", Files, "content.read"], ["homepage", "Homepage", Home, "content.write"],
    ["navigation", "Header & Navigation", Menu, "content.write"], ["footer", "Footer", PanelBottom, "content.write"], ["themes", "Themes & Design", Palette, "content.write"],
    ["media", "Media Library", Images, "content.read"], ["components", "Reusable Components", Puzzle, "content.write"], ["animations", "Animations", Wand2, "content.write"]]],
  ["Content Management", [["about", "About Company", Building2, "content.write"], ["founder", "Founder Profile", UserRound, "content.write"], ["services", "Services", Briefcase, "content.write"],
    ["projects", "Projects", FolderKanban, "content.write"], ["technologies", "Technologies", Cpu, "content.write"], ["testimonials", "Testimonials", Quote, "content.write"],
    ["blog", "Blog", Newspaper, "content.read"], ["faqs", "FAQs", HelpCircle, "content.write"]]],
  ["Business Management", [["inquiries", "Contact Inquiries", Inbox, "leads.read"], ["leads", "Leads & CRM", Users, "leads.read"], ["email-templates", "Email Templates", Mail, "leads.read"], ["notifications", "Notifications", Bell, "content.read"]]],
  ["AI Management", [["ai-chat", "Chat Assistant", Bot, "ai.manage"], ["ai-voice", "Voice Assistant", Mic, "ai.manage"], ["ai-languages", "Languages", Languages, "ai.manage"],
    ["ai-knowledge", "Knowledge Base", BookOpen, "ai.manage"], ["ai-conversations", "Conversation Settings", MessagesSquare, "ai.manage"]]],
  ["Marketing", [["seo", "SEO", Search, "content.write"], ["social", "Social Links", Share2, "content.write"], ["marketing-analytics", "Analytics", TrendingUp, "analytics.read"], ["redirects", "Redirects", Shuffle, "content.write"]]],
  ["Administration", [["users", "Admin Users", ShieldCheck, "users.manage"], ["roles", "Roles & Permissions", KeyRound, "users.manage"], ["settings", "Global Settings", Settings, "settings.manage"],
    ["security", "Security", Lock, "users.manage"], ["audit", "Audit Logs", ScrollText, "audit.read"], ["backups", "Backups", DatabaseBackup, "backup"],
    ["versions", "Version History", History, "content.read"], ["publish", "Publish & Rollback", Rocket, "content.read"]]],
];
const ALL = NAV.flatMap(([, items]) => items);

function AdminProvider({ children }) {
  const api = useAdminApi();
  const [me, setMe] = useState(null), [meErr, setMeErr] = useState(null), [draft, setDraft] = useState(null), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api.get("/admin/draft"); setDraft(r.data); setDirty(false); }, [api]);
  useEffect(() => {
    api.get("/me").then((r) => { setMe(r.data); if (r.data.permissions.length) load().catch((e) => toast.error(errMsg(e))); }).catch((e) => setMeErr(errMsg(e)));
  }, []); // eslint-disable-line
  useEffect(() => { const f = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", f); return () => window.removeEventListener("beforeunload", f); }, [dirty]);
  const can = (p) => !!me && (me.permissions.includes("*") || me.permissions.includes(p));
  const update = (fn) => { setDraft((d) => { const data = structuredClone(d.data); fn(data); return { ...d, data }; }); setDirty(true); };
  const setPath = (path, v) => update((d) => _.set(d, path, v));
  const save = async () => {
    setBusy(true);
    try { const r = await api.put("/admin/draft", { rev: draft.rev, data: draft.data }); setDraft((d) => ({ ...d, rev: r.data.rev, updated_at: r.data.updated_at, has_unpublished: true })); setDirty(false); toast.success("Draft saved"); return true; }
    catch (e) { toast.error(errMsg(e)); return false; } finally { setBusy(false); }
  };
  const publish = async (note = "") => {
    if (dirty && !(await save())) return;
    if (!(await confirmAction("Publish the current draft to the live website?", "Publish changes"))) return;
    setBusy(true);
    try { await api.post("/admin/publish", { note }); await load(); toast.success("Published — the live site is updated"); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const discard = async () => {
    if (!(await confirmAction("Discard all unpublished changes and go back to the live version?"))) return;
    try { await api.post("/admin/draft/discard"); await load(); toast.success("Changes discarded"); } catch (e) { toast.error(errMsg(e)); }
  };
  const submit = async () => { if (dirty && !(await save())) return; await api.post("/admin/draft/submit", { note: "" }); toast.success("Submitted for approval"); };
  return <Ctx.Provider value={{ api, me, meErr, draft, dirty, busy, can, update, setPath, save, publish, discard, submit, reload: load }}>{children}</Ctx.Provider>;
}

function Restricted({ msg }) {
  const { signOut } = useClerk();
  return <div className="min-h-screen flex items-center justify-center p-6 admin-root"><div className="max-w-md text-center rounded-2xl border bg-card p-8" data-testid="access-restricted">
    <Lock className="mx-auto text-primary" /><h1 className="font-heading text-2xl mt-4">Access restricted</h1>
    <p className="text-muted-foreground mt-3 text-sm">{msg || "This account is not authorised to manage the website. Only approved administrator emails can sign in."}</p>
    <Button className="mt-6" onClick={() => signOut({ redirectUrl: "/admin/login" })} data-testid="restricted-signout">Sign out</Button></div></div>;
}

function Sidebar({ open, setOpen }) {
  const { can } = useAdmin();
  return (<>
    {open && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={`admin-sidebar ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`} data-testid="admin-sidebar">
      <div className="flex items-center justify-between px-5 h-16 border-b"><a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2.5" data-testid="admin-view-site">
        <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-heading font-extrabold flex items-center justify-center">N</span><span className="font-heading text-sm">Nilgiris CMS</span></a>
        <button className="lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">{NAV.map(([group, items]) => {
        const vis = items.filter((i) => can(i[3]));
        if (!vis.length) return null;
        return <div key={group}><p className="px-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{group}</p>
          {vis.map(([k, label, I]) => <NavLink key={k} to={`/admin/${k}`} onClick={() => setOpen(false)} className={({ isActive }) => `admin-nav ${isActive ? "active" : ""}`} data-testid={`admin-nav-${k}`}><I size={16} />{label}</NavLink>)}</div>;
      })}</nav>
    </aside></>);
}

function TopBar({ setOpen }) {
  const { draft, dirty, busy, save, publish, discard, submit, can, me } = useAdmin();
  const loc = useLocation(), nav = useNavigate();
  const key = loc.pathname.split("/")[2] || "dashboard";
  const label = ALL.find((x) => x[0] === key)?.[1] || "Admin";
  return (<header className="sticky top-0 z-30 h-16 border-b bg-background/85 backdrop-blur-xl flex items-center gap-3 px-4 md:px-6">
    <button className="lg:hidden" onClick={() => setOpen(true)} data-testid="admin-menu-toggle"><Menu size={20} /></button>
    <h1 className="font-heading text-base md:text-lg truncate" data-testid="admin-page-title">{label}</h1>
    {draft && <Badge variant="outline" className={`hidden md:inline-flex ${dirty ? "border-amber-500 text-amber-400" : draft.has_unpublished ? "border-sky-500 text-sky-400" : "border-primary text-primary"}`} data-testid="draft-status">
      {dirty ? "Unsaved changes" : draft.has_unpublished ? "Draft not published" : "Live is up to date"}</Badge>}
    <div className="ml-auto flex items-center gap-1.5 md:gap-2">
      {can("content.write") && key !== "builder" && <Button variant="ghost" size="sm" onClick={() => nav("/admin/builder")} className="hidden xl:inline-flex" data-testid="edit-website-button"><PenTool size={15} className="mr-1.5" />Edit Website</Button>}
      <Button variant="ghost" size="sm" onClick={() => window.open("/preview", "_blank")} title="Preview saved draft in a new tab" data-testid="preview-button"><Eye size={15} className="md:mr-1.5" /><span className="hidden md:inline">Preview</span></Button>
      {can("content.write") && <>
        <Button variant="ghost" size="sm" onClick={discard} disabled={!draft?.has_unpublished && !dirty} data-testid="discard-button"><Undo2 size={15} className="md:mr-1.5" /><span className="hidden md:inline">Discard</span></Button>
        <Button variant="secondary" size="sm" onClick={save} disabled={!dirty || busy} data-testid="save-draft-button"><Save size={15} className="md:mr-1.5" /><span className="hidden md:inline">Save Draft</span></Button></>}
      {can("publish") ? <Button size="sm" onClick={() => publish()} disabled={busy || (!dirty && !draft?.has_unpublished)} data-testid="publish-button"><Rocket size={15} className="md:mr-1.5" /><span className="hidden md:inline">Publish</span></Button>
        : can("content.write") && <Button size="sm" onClick={submit} data-testid="submit-approval-button">Submit</Button>}
      <div className="pl-1" title={`${me?.email} · ${me?.role}`}><UserButton /></div>
    </div></header>);
}

const Loading = () => <div className="p-10 text-muted-foreground text-sm" data-testid="admin-loading">Loading…</div>;

function Shell() {
  const { me, meErr, draft, dirty, save } = useAdmin();
  const [open, setOpen] = useState(false);
  useEffect(() => { const f = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); if (dirty) save(); } }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [dirty, save]);
  if (meErr) return <Restricted msg={meErr} />;
  if (!me) return <Loading />;
  if (!me.permissions.length) return <Restricted />;
  return (<div className="admin-root min-h-screen">
    <Sidebar open={open} setOpen={setOpen} />
    <div className="lg:pl-[264px]"><TopBar setOpen={setOpen} />
      <main className="p-4 md:p-6 lg:p-8 max-w-[1600px]">{!draft ? <Loading /> : <Suspense fallback={<Loading />}><Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="builder" element={<Builder />} />
        <Route path="homepage" element={<Builder initialSlug="/" />} />
        <Route path="pages" element={<Builder mode="pages" />} />
        <Route path="themes" element={<Theme />} />
        <Route path="media" element={<Media />} />
        <Route path="blog" element={<Blog />} />
        {["inquiries", "leads", "email-templates", "notifications"].map((k) => <Route key={k} path={k} element={<Business screen={k} />} />)}
        {["dashboard", "analytics", "marketing-analytics", "activity", "users", "roles", "security", "audit", "backups", "versions", "publish"].map((k) => <Route key={k} path={k} element={<Ops screen={k} />} />)}
        <Route path=":screen" element={<Content />} />
      </Routes></Suspense>}</main></div>
  </div>);
}

export default function AdminApp() {
  return (<>
    <Show when="signed-in"><AdminProvider><Shell /><ConfirmHost /></AdminProvider></Show>
    <Show when="signed-out"><Navigate to="/admin/login" replace /></Show>
  </>);
}
