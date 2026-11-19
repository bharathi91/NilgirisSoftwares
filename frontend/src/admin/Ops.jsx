import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { Download, Upload, RotateCcw, GitCompare, UserPlus, LogOut, Trash2, Rocket, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAdmin } from "./AdminApp";
import { Label, Panel, confirmAction } from "./fields";
import { download, errMsg } from "../lib/api";

const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const Stat = ({ label, value, testid, onClick }) => <button onClick={onClick} className="rounded-2xl border bg-card/60 p-5 text-left hover:border-primary transition-colors" data-testid={testid}><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="font-heading text-3xl mt-2">{value}</p></button>;

export function diff(a, b, path = "", out = []) {
  if (out.length > 300) return out;
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  const obj = (x) => x && typeof x === "object";
  if (obj(a) && obj(b) && path.split(".").length < 6) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    keys.forEach((k) => { const lbl = Array.isArray(a) ? (a[k]?.title || a[k]?.name || a[k]?.label || a[k]?.type || k) : k; diff(a[k], b[k], path ? `${path}.${lbl}` : lbl, out); });
  } else out.push({ path, before: a === undefined ? "—" : JSON.stringify(a).slice(0, 220), after: b === undefined ? "—" : JSON.stringify(b).slice(0, 220) });
  return out;
}

const DiffView = ({ rows }) => <div className="space-y-2 max-h-[60vh] overflow-y-auto text-xs" data-testid="diff-view">{rows.length ? rows.map((r, i) => <div key={i} className="rounded-lg border p-2">
  <p className="font-medium text-primary mb-1">{r.path}</p><div className="grid md:grid-cols-2 gap-2"><p className="bg-red-500/10 rounded p-1.5 break-all">{r.before}</p><p className="bg-primary/10 rounded p-1.5 break-all">{r.after}</p></div></div>) : <p className="text-muted-foreground">No differences.</p>}</div>;

function Dashboard() {
  const { api, me, draft } = useAdmin();
  const nav = useNavigate();
  const [s, setS] = useState(null), [act, setAct] = useState([]);
  useEffect(() => { api.get("/admin/stats").then((r) => setS(r.data)); api.get("/admin/audit", { params: { limit: 8 } }).then((r) => setAct(r.data)).catch(() => {}); }, []); // eslint-disable-line
  return <div className="space-y-6">
    <div><h2 className="font-heading text-2xl md:text-3xl">Welcome back{me.name ? `, ${me.name.split(" ")[0]}` : ""}.</h2><p className="text-muted-foreground mt-1 text-sm">Signed in as {me.email} · {me.role.replace("_", " ")}</p></div>
    {s && !s.contact_confirmed && <div className="rounded-xl border border-amber-500/60 bg-amber-500/5 p-4 text-sm flex gap-3 items-center" data-testid="dashboard-contact-warning"><AlertTriangle size={18} className="text-amber-400" />
      Contact details are not yet confirmed as official, so they're hidden on the website.<Button size="sm" variant="outline" className="ml-auto" onClick={() => nav("/admin/settings")}>Review</Button></div>}
    {draft.has_unpublished && <div className="rounded-xl border border-sky-500/50 bg-sky-500/5 p-4 text-sm flex gap-3 items-center"><Rocket size={18} className="text-sky-400" />You have draft changes that are not live yet.<Button size="sm" variant="outline" className="ml-auto" onClick={() => nav("/admin/publish")}>Review & publish</Button></div>}
    {s && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Stat label="New leads" value={s.leads_new} testid="stat-new-leads" onClick={() => nav("/admin/leads")} /><Stat label="Leads (7 days)" value={s.leads_week} testid="stat-leads-week" onClick={() => nav("/admin/leads")} />
      <Stat label="Page views (7 days)" value={s.views_week} testid="stat-views-week" onClick={() => nav("/admin/analytics")} /><Stat label="Pages" value={s.pages} testid="stat-pages" onClick={() => nav("/admin/pages")} />
      <Stat label="Projects" value={s.projects} testid="stat-projects" onClick={() => nav("/admin/projects")} /><Stat label="Blog posts" value={s.posts} testid="stat-posts" onClick={() => nav("/admin/blog")} />
      <Stat label="Media files" value={s.media} testid="stat-media" onClick={() => nav("/admin/media")} /><Stat label="Unread notifications" value={s.unread_notifications} testid="stat-notifications" onClick={() => nav("/admin/notifications")} /></div>}
    <Panel title="Recent activity">{act.map((a) => <p key={a.id} className="text-sm py-1.5 border-b last:border-0"><span className="text-muted-foreground text-xs mr-2">{fmt(a.at)}</span>{a.email} — {a.action} {a.target && <span className="text-muted-foreground">{String(a.target).slice(0, 40)}</span>}</p>)}{!act.length && <p className="text-sm text-muted-foreground">No activity yet.</p>}</Panel>
  </div>;
}

function Analytics() {
  const { api } = useAdmin();
  const [start, setStart] = useState(day(29)), [end, setEnd] = useState(day(0)), [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/analytics", { params: { start, end } }).then((r) => setD(r.data)).catch((e) => toast.error(errMsg(e))); }, [start, end]); // eslint-disable-line
  const exp = async () => { const r = await api.get("/admin/analytics/export", { params: { start, end }, responseType: "blob" }); download(r.data, `analytics-${start}-${end}.csv`); };
  const List = ({ title, rows }) => <Panel title={title}>{rows.length ? rows.map((r) => <div key={r.key} className="flex justify-between text-sm py-1.5 border-b last:border-0"><span className="truncate">{r.key}</span><span className="text-muted-foreground">{r.count}</span></div>) : <p className="text-sm text-muted-foreground">No data in this period.</p>}</Panel>;
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3 items-end"><label><Label>From</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} data-testid="analytics-start" /></label>
      <label><Label>To</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} data-testid="analytics-end" /></label>
      <Button variant="outline" onClick={exp} data-testid="analytics-export"><Download size={14} className="mr-1" />CSV report</Button>
      <p className="text-xs text-muted-foreground md:ml-auto max-w-sm">Real first-party data only. Bots, admin pages and “Do Not Track” visitors are excluded; no cookies or IP addresses are stored.</p></div>
    {d && <><div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">{[["Visitors", d.visitors], ["Page views", d.views], ["Form submissions", d.contact_submissions], ["All leads", d.leads], ["Won", d.won], ["Conversion %", d.conversion], ["Chat messages", d.chats]].map(([l, v]) => <Stat key={l} label={l} value={v} testid={`analytics-${l.toLowerCase().replace(/\W+/g, "-")}`} />)}</div>
      <Panel title="Traffic & leads"><div className="h-72"><ResponsiveContainer><AreaChart data={d.daily}><CartesianGrid stroke="#1E2C36" /><XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B0" }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B0" }} />
        <Tooltip contentStyle={{ background: "#111B23", border: "1px solid #1E2C36" }} /><Area dataKey="views" stroke="#2DBE87" fill="#2DBE8733" /><Area dataKey="visitors" stroke="#68E0B5" fill="#68E0B522" /><Area dataKey="leads" stroke="#E0B568" fill="#E0B56822" /></AreaChart></ResponsiveContainer></div></Panel>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5"><List title="Most visited pages" rows={d.top_pages} /><List title="Traffic sources" rows={d.sources} /><List title="Devices" rows={d.devices} />
        <Panel title="Popular services (from leads)"><div className="h-48"><ResponsiveContainer><BarChart data={d.services} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="key" width={110} tick={{ fontSize: 10, fill: "#94A3B0" }} /><Bar dataKey="count" fill="#2DBE87" radius={4} /></BarChart></ResponsiveContainer></div></Panel></div>
      <p className="text-xs text-muted-foreground">Voice assistant interactions: {d.voice} (voice is not configured).</p></>}
  </div>;
}

function Users() {
  const { api, me } = useAdmin();
  const [d, setD] = useState(null), [email, setEmail] = useState(""), [role, setRole] = useState("admin");
  const load = () => api.get("/admin/users").then((r) => setD(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line
  const run = async (fn, msg) => { try { await fn(); toast.success(msg); load(); } catch (e) { toast.error(errMsg(e)); } };
  if (!d) return null;
  return <div className="space-y-5">
    <Panel title="Invite an administrator" desc="The person receives a secure sign-up invitation email, verifies their address and sets their own password. Their role applies on first sign-in.">
      <div className="grid md:grid-cols-[1fr_200px_auto] gap-3"><Input placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="invite-email" />
        <select className="admin-select" value={role} onChange={(e) => setRole(e.target.value)} data-testid="invite-role">{d.roles.filter((r) => r !== "none").map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</select>
        <Button onClick={() => run(async () => { const r = await api.post("/admin/users/invite", { email, role, redirect_url: `${window.location.origin}/sign-up` }); if (!r.data.email_sent) toast.warning("Invitation saved, but the email could not be sent — ask them to sign up at /sign-up"); setEmail(""); }, "Invitation created")} data-testid="invite-submit"><UserPlus size={15} className="mr-1" />Invite</Button></div>
      {!!d.invites.length && <div className="mt-4 space-y-1">{d.invites.map((i) => <div key={i.email} className="flex items-center gap-2 text-sm"><Badge variant="outline">pending</Badge>{i.email} · {i.role}
        <Button size="sm" variant="ghost" className="text-red-400 ml-auto" onClick={() => run(() => api.delete(`/admin/users/invite/${encodeURIComponent(i.email)}`), "Invitation revoked")} data-testid={`invite-revoke-${i.email}`}>Revoke</Button></div>)}</div>}
    </Panel>
    <Panel title="Administrators" desc={`Always Super Admin: ${d.super_admin_emails.join(", ")}. Everyone else has no access unless invited or given a role.`}>
      <div className="space-y-2">{d.users.map((u) => <div key={u.user_id} className="grid md:grid-cols-[1fr_180px_auto] gap-3 items-center rounded-xl border p-3" data-testid={`user-row-${u.email}`}>
        <div><p className="font-medium text-sm">{u.name || u.email}{u.user_id === me.user_id && <span className="text-xs text-primary ml-2">you</span>}</p><p className="text-xs text-muted-foreground">{u.email} · last login {fmt(u.last_login)}</p></div>
        <select className="admin-select" value={u.role} onChange={(e) => run(() => api.patch(`/admin/users/${u.user_id}/role`, { role: e.target.value }), "Role updated")} data-testid={`user-role-${u.email}`}>{d.roles.map((r) => <option key={r} value={r}>{r === "none" ? "no access (disabled)" : r.replace("_", " ")}</option>)}</select>
        <div className="flex gap-1"><Button size="sm" variant="ghost" title="Sign out everywhere" onClick={() => run(() => api.post(`/admin/users/${u.user_id}/revoke-sessions`), "Sessions revoked")} data-testid={`user-revoke-${u.email}`}><LogOut size={14} /></Button>
          <Button size="sm" variant="ghost" className="text-red-400" disabled={u.user_id === me.user_id} onClick={async () => { if (await confirmAction(`Remove all admin access for ${u.email}? Their account history is kept for audit.`)) run(() => api.delete(`/admin/users/${u.user_id}`), "Access removed"); }} data-testid={`user-remove-${u.email}`}><Trash2 size={14} /></Button></div>
      </div>)}</div></Panel></div>;
}

function Roles() {
  const { api } = useAdmin();
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/users").then((r) => setD(r.data)); }, []); // eslint-disable-line
  const all = ["content.read", "content.write", "publish", "media.write", "blog.write", "blog.publish", "leads.read", "leads.write", "analytics.read", "ai.manage", "audit.read", "users.manage", "settings.manage", "backup"];
  if (!d) return null;
  return <Panel title="Roles & permissions" desc="Enforced on the server for every request. Content Editors save drafts and submit them for approval; only Super Admins publish and restore.">
    <div className="overflow-x-auto"><table className="text-sm w-full" data-testid="roles-table"><thead><tr><th className="text-left py-2">Permission</th>{Object.keys(d.permissions).filter((r) => r !== "none").map((r) => <th key={r} className="px-3 capitalize">{r.replace("_", " ")}</th>)}</tr></thead>
      <tbody>{all.map((p) => <tr key={p} className="border-t"><td className="py-2 text-muted-foreground">{p}</td>{Object.entries(d.permissions).filter(([r]) => r !== "none").map(([r, ps]) => <td key={r} className="text-center">{ps.includes("*") || ps.includes(p) ? "✓" : ""}</td>)}</tr>)}</tbody></table></div></Panel>;
}

function Security() {
  const { api } = useAdmin();
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/security/logins").then((r) => setRows(r.data)); }, []); // eslint-disable-line
  return <div className="space-y-5"><Panel title="Security overview"><ul className="text-sm space-y-2 text-muted-foreground list-disc pl-5">
    <li>Sign-in is managed by a dedicated identity provider: verified email, secure password hashing, password reset, bot protection and brute-force throttling. New-device sign-ins require an emailed one-time code in production.</li>
    <li>Only the configured Super Admin emails and invited users can access the dashboard; every admin API checks the role on the server.</li>
    <li>Public forms and the chat assistant are rate-limited; uploads are type- and size-checked; rich text is sanitised.</li>
    <li>API keys and email credentials live only on the server and are never sent to the browser.</li></ul></Panel>
    <Panel title="Login history"><div className="overflow-x-auto"><table className="text-sm w-full" data-testid="login-history"><thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">When</th><th>User</th><th>IP</th><th>Device</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.sid} className="border-t"><td className="py-2 pr-3">{fmt(r.at)}</td><td className="pr-3">{r.email}</td><td className="pr-3">{r.ip}</td><td className="text-xs text-muted-foreground truncate max-w-xs">{r.ua}</td></tr>)}</tbody></table></div></Panel></div>;
}

function Audit({ limit = 300 }) {
  const { api } = useAdmin();
  const [rows, setRows] = useState([]), [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => api.get("/admin/audit", { params: { q, limit } }).then((r) => setRows(r.data)), 200); return () => clearTimeout(t); }, [q]); // eslint-disable-line
  return <Panel title={<Input placeholder="Filter by action or email" value={q} onChange={(e) => setQ(e.target.value)} className="md:w-80" data-testid="audit-search" />}>
    <div className="space-y-1" data-testid="audit-list">{rows.map((a) => <div key={a.id} className="grid md:grid-cols-[180px_220px_160px_1fr] gap-2 text-sm py-2 border-b"><span className="text-muted-foreground text-xs">{fmt(a.at)}</span><span className="truncate">{a.email}</span><Badge variant="outline" className="w-fit">{a.action}</Badge><span className="text-xs text-muted-foreground truncate">{a.target} {a.detail ? JSON.stringify(a.detail).slice(0, 120) : ""}</span></div>)}
      {!rows.length && <p className="text-sm text-muted-foreground">No entries.</p>}</div></Panel>;
}

function Backups() {
  const { api, reload } = useAdmin();
  const get = async () => { const r = await api.get("/admin/backup", { responseType: "blob" }); download(r.data, `nilgiris-backup-${day(0)}.json`, "application/json"); toast.success("Backup downloaded"); };
  const restore = async (f) => { if (!f || !(await confirmAction("Restore this backup? Current content, posts, templates and leads with matching IDs will be replaced. A snapshot of the live site is saved first.", "Restore backup"))) return;
    const fd = new FormData(); fd.append("file", f); try { await api.post("/admin/restore", fd); await reload(); toast.success("Backup restored"); } catch (e) { toast.error(errMsg(e)); } };
  return <div className="grid md:grid-cols-2 gap-5"><Panel title="Download backup" desc="Includes draft & published content, blog posts, email templates, media records, leads and invitations. Media files themselves stay in object storage."><Button onClick={get} data-testid="backup-download"><Download size={15} className="mr-1" />Download backup (.json)</Button></Panel>
    <Panel title="Restore from backup" desc="Upload a backup file created by this dashboard."><label className="inline-flex"><input type="file" accept="application/json" hidden onChange={(e) => restore(e.target.files[0])} data-testid="backup-restore-input" /><span className="inline-flex items-center gap-1 rounded-md bg-secondary px-4 py-2 text-sm cursor-pointer"><Upload size={15} />Choose backup file</span></label></Panel></div>;
}

function Versions() {
  const { api, can, draft, reload } = useAdmin();
  const [rows, setRows] = useState([]), [cmp, setCmp] = useState(null);
  const load = () => api.get("/admin/versions").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []); // eslint-disable-line
  const compare = async (v) => { const r = await api.get(`/admin/versions/${v.id}`); setCmp({ v, rows: diff(r.data.data, draft.data) }); };
  const restore = async (v) => { if (!(await confirmAction(`Restore the version from ${fmt(v.at)}? It becomes both the live site and the current draft.`, "Restore version"))) return;
    try { await api.post(`/admin/versions/${v.id}/restore`); await reload(); load(); toast.success("Version restored and published"); } catch (e) { toast.error(errMsg(e)); } };
  return <Panel title="Version history" desc="Every publish and rollback is stored. Compare shows how that version differs from your current draft.">
    <div className="space-y-2" data-testid="versions-list">{rows.map((v, i) => <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3" data-testid={`version-row-${i}`}>
      <Badge variant="outline">{v.kind}</Badge><div className="flex-1 min-w-0"><p className="text-sm">{fmt(v.at)} · {v.by}{v.id === draft.published_version && <span className="text-primary ml-2 text-xs">live</span>}</p>{v.note && <p className="text-xs text-muted-foreground truncate">{v.note}</p>}</div>
      <Button size="sm" variant="outline" onClick={() => compare(v)} data-testid={`version-compare-${i}`}><GitCompare size={13} className="mr-1" />Compare</Button>
      {can("publish") && <Button size="sm" variant="secondary" onClick={() => restore(v)} disabled={v.id === draft.published_version} data-testid={`version-restore-${i}`}><RotateCcw size={13} className="mr-1" />Restore</Button>}</div>)}</div>
    {cmp && <Dialog open onOpenChange={() => setCmp(null)}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Version {fmt(cmp.v.at)} (left) vs current draft (right)</DialogTitle></DialogHeader><DiffView rows={cmp.rows} /></DialogContent></Dialog>}
  </Panel>;
}

function Publish() {
  const { api, draft, dirty, can, publish, discard, submit } = useAdmin();
  const [rows, setRows] = useState(null), [note, setNote] = useState("");
  useEffect(() => { api.get(`/admin/versions/${draft.published_version}`).then((r) => setRows(diff(r.data.data, draft.data))); }, [draft.data, draft.published_version]); // eslint-disable-line
  return <div className="grid lg:grid-cols-[380px_1fr] gap-5">
    <Panel title="Status"><div className="space-y-2 text-sm"><p>Live version published {fmt(draft.published_at)}</p><p>Draft last saved {fmt(draft.updated_at)} by {draft.updated_by}</p>
      {dirty && <p className="text-amber-400">You have unsaved edits in this browser.</p>}
      {draft.submitted && <p className="text-sky-400">Submitted for approval by {draft.submitted.by} · {fmt(draft.submitted.at)}</p>}
      <div className="pt-3 space-y-2">{can("publish") ? <><Input placeholder="What changed? (optional note)" value={note} onChange={(e) => setNote(e.target.value)} data-testid="publish-note" />
        <Button className="w-full" onClick={() => publish(note)} disabled={!dirty && !draft.has_unpublished} data-testid="publish-page-button"><Rocket size={15} className="mr-1" />Publish to live site</Button></>
        : <Button className="w-full" onClick={submit} data-testid="submit-page-button">Submit for approval</Button>}
        <Button variant="ghost" className="w-full" onClick={discard} disabled={!draft.has_unpublished && !dirty} data-testid="discard-page-button">Discard draft changes</Button>
        <Button variant="outline" className="w-full" onClick={() => window.open("/preview", "_blank")} data-testid="preview-page-button">Preview draft</Button></div></div></Panel>
    <Panel title="Changes since the live version" desc="Left: live · right: draft (includes unsaved edits).">{rows ? <DiffView rows={rows} /> : <p className="text-sm">Loading…</p>}</Panel>
  </div>;
}

export default function Ops({ screen }) {
  const M = { dashboard: Dashboard, analytics: Analytics, "marketing-analytics": Analytics, activity: () => <Audit limit={50} />, audit: Audit, users: Users, roles: Roles, security: Security, backups: Backups, versions: Versions, publish: Publish };
  const C = M[screen];
  return <div data-testid={`screen-${screen}`}><C /></div>;
}
