import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Download, Trash2, Search, Paperclip, Send, Plus, Save, Bell } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { useAdmin } from "./AdminApp";
import { Label, Panel, confirmAction } from "./fields";
import { download, errMsg } from "../lib/api";

const ST = { new: "New", contacted: "Contacted", qualified: "Qualified", proposal_sent: "Proposal Sent", negotiation: "Negotiation", won: "Won", lost: "Lost" };
const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

function LeadDetail({ id, onClose, onChanged }) {
  const { api, can } = useAdmin();
  const [l, setL] = useState(null), [note, setNote] = useState(""), [tpls, setTpls] = useState([]), [tpl, setTpl] = useState(""), [sending, setSending] = useState(false);
  const load = () => api.get(`/admin/leads/${id}`).then((r) => setL(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); api.get("/admin/email-templates").then((r) => { setTpls(r.data); setTpl(r.data[0]?.id || ""); }); }, [id]); // eslint-disable-line
  const patch = async (b) => { try { const r = await api.patch(`/admin/leads/${id}`, b); setL(r.data); onChanged(); toast.success("Lead updated"); } catch (e) { toast.error(errMsg(e)); } };
  const w = can("leads.write");
  const getFile = async () => { const r = await api.get(`/admin/media/${l.attachment.id}/download`, { responseType: "blob" }); download(r.data, l.attachment.name); };
  return <Sheet open onOpenChange={(o) => !o && onClose()}><SheetContent className="w-full sm:max-w-xl overflow-y-auto" data-testid="lead-detail">
    {!l ? <p>Loading…</p> : <><SheetHeader><SheetTitle className="font-heading">{l.name}</SheetTitle></SheetHeader>
      <div className="space-y-5 mt-4 text-sm">
        <div className="grid grid-cols-2 gap-3">{[["Email", l.email], ["Phone", l.phone], ["Company", l.company], ["Country", l.country], ["Service", l.service], ["Budget", l.budget], ["Timeline", l.timeline], ["Source", l.source], ["Received", fmt(l.created_at)]].map(([k, v]) =>
          <div key={k}><Label>{k}</Label><p className="break-words">{v || "—"}</p></div>)}</div>
        {l.attachment && <Button size="sm" variant="outline" onClick={getFile} data-testid="lead-attachment"><Paperclip size={13} className="mr-1" />{l.attachment.name}</Button>}
        <div><Label>Message</Label><p className="whitespace-pre-wrap rounded-xl border p-3 max-h-60 overflow-y-auto">{l.message || "—"}</p></div>
        <div className="grid grid-cols-3 gap-3">
          <label><Label>Status</Label><select className="admin-select" disabled={!w} value={l.status} onChange={(e) => patch({ status: e.target.value })} data-testid="lead-status-select">{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label><Label>Assigned to</Label><Input disabled={!w} defaultValue={l.assigned_to} onBlur={(e) => e.target.value !== l.assigned_to && patch({ assigned_to: e.target.value })} data-testid="lead-assigned-input" /></label>
          <label><Label>Follow-up</Label><Input type="date" disabled={!w} value={l.follow_up || ""} onChange={(e) => patch({ follow_up: e.target.value })} data-testid="lead-followup-input" /></label></div>
        {w && <div className="rounded-xl border p-3 space-y-2"><Label>Reply with a template</Label>
          <div className="flex gap-2"><select className="admin-select" value={tpl} onChange={(e) => setTpl(e.target.value)} data-testid="lead-template-select">{tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <Button disabled={!tpl || sending} onClick={async () => { if (!(await confirmAction(`Send "${tpls.find((t) => t.id === tpl)?.name}" to ${l.email}?`, "Send email"))) return; setSending(true);
              try { await api.post(`/admin/leads/${id}/email`, { template_id: tpl }); toast.success("Email sent"); load(); onChanged(); } catch (e) { toast.error(errMsg(e)); } finally { setSending(false); } }} data-testid="lead-send-email"><Send size={14} className="mr-1" />{sending ? "Sending…" : "Send"}</Button></div></div>}
        <div><Label>Notes</Label>{l.notes.map((n) => <div key={n.id} className="rounded-lg bg-muted p-2 mb-2"><p className="whitespace-pre-wrap">{n.text}</p><p className="text-[11px] text-muted-foreground mt-1">{n.by} · {fmt(n.at)}</p></div>)}
          {w && <div className="flex gap-2"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" data-testid="lead-note-input" />
            <Button onClick={async () => { if (!note.trim()) return; const r = await api.post(`/admin/leads/${id}/notes`, { text: note }); setL(r.data); setNote(""); }} data-testid="lead-add-note"><Plus size={14} /></Button></div>}</div>
        <div><Label>Activity</Label><ul className="space-y-1.5 text-xs" data-testid="lead-activity">{[...(l.activity || [])].reverse().map((a, i) => <li key={i}><span className="text-muted-foreground">{fmt(a.at)} · {a.by}</span> — {a.text}</li>)}</ul></div>
        {w && <Button variant="ghost" className="text-red-400" onClick={async () => { if (await confirmAction(`Permanently delete the lead from ${l.name}?`)) { await api.delete(`/admin/leads/${id}`); toast.success("Lead deleted"); onChanged(); onClose(); } }} data-testid="lead-delete"><Trash2 size={14} className="mr-1" />Delete lead</Button>}
      </div></>}</SheetContent></Sheet>;
}

function Leads({ source }) {
  const { api } = useAdmin();
  const [params, setParams] = useSearchParams();
  const [res, setRes] = useState(null), [q, setQ] = useState(""), [status, setStatus] = useState(""), [page, setPage] = useState(1);
  const open = params.get("id");
  const load = () => api.get("/admin/leads", { params: { q, status, page, source } }).then((r) => setRes(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q, status, page, source]); // eslint-disable-line
  const exp = async () => { const r = await api.get("/admin/leads/export", { responseType: "blob" }); download(r.data, "leads.csv"); };
  return <div className="space-y-5">
    {res && <div className="flex flex-wrap gap-2">{[["", "All"], ...Object.entries(ST)].map(([k, v]) => <button key={k} onClick={() => { setStatus(k); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${status === k ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`} data-testid={`lead-filter-${k || "all"}`}>
      {v}{k && <span className="ml-1.5 opacity-70">{res.counts[k]}</span>}</button>)}</div>}
    <Panel actions={<Button variant="outline" size="sm" onClick={exp} data-testid="leads-export"><Download size={14} className="mr-1" />Export CSV</Button>}
      title={<label className="flex items-center gap-2 rounded-md border px-3 w-full md:w-96"><Search size={15} className="text-muted-foreground" /><input className="bg-transparent outline-none py-2 w-full text-sm font-sans" placeholder="Search name, email, company, message" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} data-testid="leads-search" /></label>}>
      <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="leads-table"><thead><tr className="text-left text-xs text-muted-foreground uppercase tracking-wider"><th className="py-2 pr-3">Name</th><th className="pr-3">Service</th><th className="pr-3">Budget</th><th className="pr-3">Status</th><th className="pr-3">Follow-up</th><th>Received</th></tr></thead>
        <tbody>{res?.items.map((l) => <tr key={l.id} onClick={() => setParams({ id: l.id })} className="border-t cursor-pointer hover:bg-accent/50" data-testid={`lead-row-${l.id}`}>
          <td className="py-3 pr-3"><p className="font-medium">{l.name}</p><p className="text-xs text-muted-foreground">{l.email}{l.company ? ` · ${l.company}` : ""}</p></td>
          <td className="pr-3">{l.service || "—"}</td><td className="pr-3">{l.budget || "—"}</td><td className="pr-3"><Badge variant="outline">{ST[l.status]}</Badge></td><td className="pr-3">{l.follow_up || "—"}</td><td className="text-xs text-muted-foreground">{fmt(l.created_at)}</td></tr>)}</tbody></table>
        {res && !res.items.length && <p className="text-sm text-muted-foreground py-8 text-center" data-testid="leads-empty">No leads found.</p>}</div>
      {res?.total > 25 && <div className="flex gap-2 mt-4"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page * 25 >= res.total} onClick={() => setPage(page + 1)}>Next</Button></div>}
    </Panel>
    {open && <LeadDetail id={open} onClose={() => setParams({})} onChanged={load} />}
  </div>;
}

function Templates() {
  const { api, can } = useAdmin();
  const [items, setItems] = useState([]), [sel, setSel] = useState(null);
  const load = () => api.get("/admin/email-templates").then((r) => { setItems(r.data); setSel((s) => s || r.data[0] || null); });
  useEffect(() => { load(); }, []); // eslint-disable-line
  const save = async () => { try { const r = sel.id ? await api.put(`/admin/email-templates/${sel.id}`, sel) : await api.post("/admin/email-templates", sel); setSel(r.data); load(); toast.success("Template saved"); } catch (e) { toast.error(errMsg(e)); } };
  return <div className="grid lg:grid-cols-[280px_1fr] gap-5">
    <Panel title="Templates">{items.map((t) => <button key={t.id} onClick={() => setSel(t)} className={`w-full text-left rounded-lg px-3 py-2 text-sm mb-1 ${sel?.id === t.id ? "bg-primary/15 text-primary" : "hover:bg-accent"}`} data-testid={`template-${t.id}`}>{t.name}</button>)}
      {can("leads.write") && <Button size="sm" variant="outline" className="mt-2" onClick={() => setSel({ name: "New template", subject: "", body: "Hi {name},\n\n" })} data-testid="template-new"><Plus size={13} className="mr-1" />New</Button>}</Panel>
    {sel && <Panel title="Edit template" desc="Placeholders: {name}, {service}, {company}, {budget}, {timeline}. Emails are plain, branded and sent only to the lead's own address.">
      <div className="space-y-3"><label className="block"><Label>Name</Label><Input value={sel.name} onChange={(e) => setSel({ ...sel, name: e.target.value })} data-testid="template-name" /></label>
        <label className="block"><Label>Subject</Label><Input value={sel.subject} onChange={(e) => setSel({ ...sel, subject: e.target.value })} data-testid="template-subject" /></label>
        <label className="block"><Label>Body</Label><Textarea rows={10} value={sel.body} onChange={(e) => setSel({ ...sel, body: e.target.value })} data-testid="template-body" /></label>
        {can("leads.write") && <div className="flex gap-2"><Button onClick={save} data-testid="template-save"><Save size={14} className="mr-1" />Save</Button>
          {sel.id && <Button variant="ghost" className="text-red-400" onClick={async () => { if (await confirmAction(`Delete template "${sel.name}"?`)) { await api.delete(`/admin/email-templates/${sel.id}`); setSel(null); load(); } }} data-testid="template-delete"><Trash2 size={14} /></Button>}</div>}</div></Panel>}
  </div>;
}

function Notifications() {
  const { api } = useAdmin();
  const [items, setItems] = useState([]);
  const load = () => api.get("/admin/notifications").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []); // eslint-disable-line
  return <Panel title="Notifications" desc="Email preferences are in Global Settings → Email & notifications." actions={<Button size="sm" variant="outline" onClick={async () => { await api.post("/admin/notifications/read"); load(); }} data-testid="notifications-mark-read">Mark all read</Button>}>
    <div className="space-y-2" data-testid="notifications-list">{items.map((n) => <a key={n.id} href={n.link || "#"} className={`flex gap-3 rounded-xl border p-3 text-sm ${n.read ? "opacity-60" : "border-primary/50"}`}>
      <Bell size={16} className="text-primary mt-0.5 shrink-0" /><div><p>{n.title}</p>{n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}<p className="text-[11px] text-muted-foreground mt-1">{fmt(n.at)}</p></div></a>)}
      {!items.length && <p className="text-sm text-muted-foreground">No notifications yet.</p>}</div></Panel>;
}

export default function Business({ screen }) {
  if (screen === "inquiries") return <Leads source="contact_form" key="inq" />;
  if (screen === "leads") return <Leads source="" key="leads" />;
  if (screen === "email-templates") return <Templates />;
  return <Notifications />;
}
