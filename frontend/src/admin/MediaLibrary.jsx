import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Copy, Film, FileText, RefreshCw, Crop, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAdmin } from "./AdminApp";
import { Label, Panel, confirmAction } from "./fields";
import { mediaUrl, errMsg } from "../lib/api";

const kb = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

function Detail({ m, onClose, reload }) {
  const { api } = useAdmin();
  const [f, setF] = useState({ name: m.name, alt: m.alt || "", folder: m.folder }), [usage, setUsage] = useState(null), [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100, max_width: 0 });
  const rep = useRef();
  useEffect(() => { api.get(`/admin/media/${m.id}/usage`).then((r) => setUsage(r.data.usage)); }, [m.id]); // eslint-disable-line
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); reload(); onClose(); } catch (e) { toast.error(errMsg(e)); } };
  const isImg = m.content_type.startsWith("image/"), raster = /jpeg|png|webp/.test(m.content_type);
  return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="media-detail">
    <DialogHeader><DialogTitle className="truncate">{m.name}</DialogTitle></DialogHeader>
    <div className="grid md:grid-cols-2 gap-5">
      <div>{isImg ? <img src={mediaUrl(m.url, 1200)} alt={m.alt} className="rounded-xl border w-full" /> : m.content_type.startsWith("video/") ? <video src={mediaUrl(m.url)} controls preload="metadata" className="rounded-xl w-full" /> : <div className="rounded-xl border p-10 text-center"><FileText className="mx-auto" /></div>}
        <p className="text-xs text-muted-foreground mt-2">{m.content_type} · {kb(m.size)}{m.width ? ` · ${m.width}×${m.height}` : ""}{Object.keys(m.variants || {}).length ? ` · thumbnails: ${Object.keys(m.variants).join(", ")}px` : ""}</p>
        <div className="flex gap-2 mt-3"><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(m.url); toast.success("URL copied"); }} data-testid="media-copy-url"><Copy size={13} className="mr-1" />Copy URL</Button>
          <Button size="sm" variant="outline" onClick={() => rep.current.click()} data-testid="media-replace"><RefreshCw size={13} className="mr-1" />Replace file</Button>
          <input ref={rep} type="file" hidden onChange={(e) => { const fd = new FormData(); fd.append("file", e.target.files[0]); act(() => api.post(`/admin/media/${m.id}/replace`, fd), "File replaced — references in the draft were updated"); }} /></div>
        <div className="mt-4"><Label>Used in</Label>{usage === null ? <p className="text-xs">Checking…</p> : usage.length ? <ul className="text-xs space-y-1" data-testid="media-usage">{usage.map((u, i) => <li key={i}><b>{u.where}</b> · {u.path}</li>)}</ul> : <p className="text-xs text-muted-foreground" data-testid="media-usage">Not used anywhere</p>}</div>
      </div>
      <div className="space-y-3">
        <label className="block"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="media-name-input" /></label>
        <label className="block"><Label>Alt text</Label><Input value={f.alt} onChange={(e) => setF({ ...f, alt: e.target.value })} data-testid="media-alt-input" /></label>
        <label className="block"><Label>Folder</Label><Input value={f.folder} onChange={(e) => setF({ ...f, folder: e.target.value })} data-testid="media-folder-input" /></label>
        <Button onClick={() => act(() => api.patch(`/admin/media/${m.id}`, f), "Saved")} data-testid="media-save">Save details</Button>
        {raster && <div className="rounded-xl border p-3 mt-4 space-y-2"><Label>Crop, resize & optimise (%)</Label>
          <div className="grid grid-cols-4 gap-2">{["x", "y", "w", "h"].map((k) => <label key={k} className="text-xs">{k.toUpperCase()}<Input type="number" value={crop[k]} onChange={(e) => setCrop({ ...crop, [k]: +e.target.value })} data-testid={`crop-${k}`} /></label>)}</div>
          <label className="text-xs block">Max width (px, 0 = keep)<Input type="number" value={crop.max_width} onChange={(e) => setCrop({ ...crop, max_width: +e.target.value })} data-testid="crop-maxw" /></label>
          <Button size="sm" variant="secondary" onClick={() => act(() => api.post(`/admin/media/${m.id}/crop`, { x: crop.x / 100, y: crop.y / 100, w: crop.w / 100, h: crop.h / 100, max_width: crop.max_width }), "Image updated")} data-testid="crop-apply"><Crop size={13} className="mr-1" />Apply</Button></div>}
        <Button variant="ghost" className="text-red-400 w-full mt-4" onClick={async () => { if (await confirmAction(usage?.length ? `This file is used in ${usage.length} place(s). Delete anyway?` : "Delete this file?")) act(() => api.delete(`/admin/media/${m.id}`), "Deleted"); }} data-testid="media-delete"><Trash2 size={14} className="mr-1" />Delete file</Button>
      </div></div></DialogContent></Dialog>;
}

export default function MediaLibrary() {
  const { api, can } = useAdmin();
  const [data, setData] = useState({ items: [], folders: [] }), [q, setQ] = useState(""), [folder, setFolder] = useState(""), [kind, setKind] = useState(""), [busy, setBusy] = useState(false), [open, setOpen] = useState(null), [up, setUp] = useState("general");
  const file = useRef();
  const load = () => api.get("/admin/media", { params: { q, folder, kind } }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q, folder, kind]); // eslint-disable-line
  const upload = async (files) => {
    setBusy(true);
    for (const f of files) { const fd = new FormData(); fd.append("file", f); fd.append("folder", up || "general");
      try { await api.post("/admin/media", fd); } catch (e) { toast.error(`${f.name}: ${errMsg(e)}`); } }
    setBusy(false); load(); toast.success("Upload finished");
  };
  return <div className="space-y-5">
    <Panel><div className="flex flex-col md:flex-row gap-3">
      <label className="flex items-center gap-2 flex-1 rounded-md border px-3"><Search size={15} className="text-muted-foreground" /><input className="bg-transparent outline-none py-2 w-full text-sm" placeholder="Search files" value={q} onChange={(e) => setQ(e.target.value)} data-testid="media-search" /></label>
      <select className="admin-select md:w-44" value={folder} onChange={(e) => setFolder(e.target.value)} data-testid="media-folder-filter"><option value="">All folders</option>{data.folders.map((f) => <option key={f}>{f}</option>)}</select>
      <select className="admin-select md:w-36" value={kind} onChange={(e) => setKind(e.target.value)} data-testid="media-kind-filter"><option value="">All types</option><option value="image">Images</option><option value="video">Videos</option><option value="application">Documents</option></select>
      {can("media.write") && <><Input className="md:w-36" value={up} onChange={(e) => setUp(e.target.value)} placeholder="Upload folder" data-testid="media-upload-folder" />
        <Button onClick={() => file.current.click()} disabled={busy} data-testid="media-upload-button"><Upload size={15} className="mr-1.5" />{busy ? "Uploading…" : "Upload"}</Button>
        <input ref={file} type="file" multiple hidden onChange={(e) => upload([...e.target.files])} data-testid="media-upload-input" /></>}
    </div><p className="text-xs text-muted-foreground mt-3">Images get web-optimised 480px & 1200px versions automatically. Files are served with content-hashed URLs and long-term browser/CDN caching; replacing a file creates a new URL so caches refresh instantly.</p></Panel>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3" data-testid="media-grid">{data.items.map((m) => (
      <button key={m.id} onClick={() => setOpen(m)} className="rounded-xl border overflow-hidden text-left bg-card hover:border-primary transition-colors" data-testid={`media-item-${m.id}`}>
        {m.content_type.startsWith("image/") ? <img src={mediaUrl(m.url, 480)} alt={m.alt} loading="lazy" className="aspect-square object-cover w-full" /> : <div className="aspect-square flex items-center justify-center bg-muted">{m.content_type.startsWith("video/") ? <Film /> : <FileText />}</div>}
        <div className="p-2"><p className="text-xs truncate">{m.name}</p><p className="text-[10px] text-muted-foreground">{m.folder} · {kb(m.size)}</p></div></button>))}
      {!data.items.length && <p className="text-sm text-muted-foreground col-span-full py-10 text-center">No files yet.</p>}</div>
    {open && <Detail m={open} onClose={() => setOpen(null)} reload={load} />}
  </div>;
}
