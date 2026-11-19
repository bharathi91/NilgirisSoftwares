import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2, Image as ImageIcon, Upload, X, Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Quote, Film } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { mediaUrl, uid, useAdminApi, errMsg } from "../lib/api";

const tid = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-");

// ---------- confirm dialog ----------
let openConfirm = null;
export const confirmAction = (message, title = "Are you sure?") => new Promise((res) => openConfirm?.({ message, title, res }));
export function ConfirmHost() {
  const [s, setS] = useState(null);
  useEffect(() => { openConfirm = setS; return () => { openConfirm = null; }; }, []);
  const close = (v) => { s?.res(v); setS(null); };
  return <AlertDialog open={!!s} onOpenChange={(o) => !o && close(false)}><AlertDialogContent data-testid="confirm-dialog">
    <AlertDialogHeader><AlertDialogTitle>{s?.title}</AlertDialogTitle><AlertDialogDescription>{s?.message}</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter><AlertDialogCancel onClick={() => close(false)} data-testid="confirm-cancel">Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => close(true)} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-ok">Confirm</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}

export const Label = ({ children }) => <span className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{children}</span>;
export const Panel = ({ title, desc, actions, children, testid }) => (
  <section className="rounded-2xl border bg-card/60 p-5 md:p-6" data-testid={testid}>
    {(title || actions) && <div className="flex flex-wrap items-start justify-between gap-3 mb-5"><div>{title && <h3 className="font-heading text-lg">{title}</h3>}{desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}</div>{actions}</div>}
    {children}</section>);

// ---------- media picker ----------
export function MediaPicker({ value, onChange, kind = "image", testid }) {
  const api = useAdminApi();
  const [open, setOpen] = useState(false), [items, setItems] = useState([]), [busy, setBusy] = useState(false), [q, setQ] = useState("");
  const fileRef = useRef();
  const load = () => api.get("/admin/media", { params: { kind: kind === "any" ? "" : kind, q } }).then((r) => setItems(r.data.items)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { if (open) load(); }, [open, q]); // eslint-disable-line
  const upload = async (f) => {
    if (!f) return;
    const fd = new FormData(); fd.append("file", f); fd.append("folder", kind === "video" ? "videos" : "images");
    setBusy(true);
    try { const r = await api.post("/admin/media", fd); onChange(r.data.url); setOpen(false); toast.success("Uploaded"); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (<div className="space-y-2">
    <div className="flex gap-2">
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={kind === "video" ? "Upload or paste a video URL" : "Upload or paste an image URL"} data-testid={testid} />
      <Button type="button" variant="secondary" size="icon" onClick={() => setOpen(true)} title="Choose from library" data-testid={`${testid}-library`}><ImageIcon size={16} /></Button>
      {value && <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} title="Clear" data-testid={`${testid}-clear`}><X size={16} /></Button>}
    </div>
    {value && kind !== "video" && <img src={mediaUrl(value, 480)} alt="" className="h-20 rounded-lg border object-cover" />}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Media library</DialogTitle></DialogHeader>
      <div className="flex gap-2"><Input placeholder="Search files" value={q} onChange={(e) => setQ(e.target.value)} data-testid="media-picker-search" />
        <Button onClick={() => fileRef.current.click()} disabled={busy} data-testid="media-picker-upload"><Upload size={16} className="mr-2" />{busy ? "Uploading…" : "Upload"}</Button>
        <input ref={fileRef} type="file" hidden accept={kind === "video" ? "video/mp4,video/webm" : kind === "image" ? "image/*" : undefined} onChange={(e) => upload(e.target.files[0])} /></div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto mt-2">{items.map((m) => (
        <button key={m.id} onClick={() => { onChange(m.url); setOpen(false); }} className="rounded-xl border overflow-hidden text-left hover:border-primary transition-colors" data-testid={`media-pick-${m.id}`}>
          {m.content_type.startsWith("image/") ? <img src={mediaUrl(m.url, 480)} alt={m.alt} className="aspect-square object-cover w-full" loading="lazy" /> : <div className="aspect-square flex items-center justify-center bg-muted"><Film /></div>}
          <p className="text-xs p-2 truncate">{m.name}</p></button>))}
        {!items.length && <p className="text-sm text-muted-foreground col-span-full py-8 text-center">No files yet — upload one.</p>}</div>
    </DialogContent></Dialog>
  </div>);
}

// ---------- rich text ----------
export function RichEditor({ value, onChange, testid }) {
  const ref = useRef();
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || ""; }, [value]);
  const cmd = (c, v) => { document.execCommand(c, false, v); onChange(ref.current.innerHTML); ref.current.focus(); };
  const tools = [[Bold, () => cmd("bold")], [Italic, () => cmd("italic")], [Heading2, () => cmd("formatBlock", "h2")], [Heading3, () => cmd("formatBlock", "h3")],
    [List, () => cmd("insertUnorderedList")], [ListOrdered, () => cmd("insertOrderedList")], [Quote, () => cmd("formatBlock", "blockquote")],
    [Link2, () => { const u = prompt("Link URL (https://… or /page)"); if (u) cmd("createLink", u); }],
    [ImageIcon, () => { const u = prompt("Image URL (copy from Media Library)"); if (u) cmd("insertImage", mediaUrl(u)); }],
    [Film, () => { const u = prompt("YouTube embed URL (https://www.youtube.com/embed/…)"); if (u) cmd("insertHTML", `<iframe src="${u.replace(/"/g, "")}" width="100%" height="380" allowfullscreen></iframe>`); }]];
  return (<div className="rounded-xl border overflow-hidden">
    <div className="flex flex-wrap gap-1 p-1.5 border-b bg-muted/40">{tools.map(([I, f], i) => <button key={i} type="button" onClick={f} className="p-2 rounded-md hover:bg-accent" data-testid={`${testid}-tool-${i}`}><I size={15} /></button>)}
      <button type="button" onClick={() => cmd("formatBlock", "p")} className="px-2 text-xs rounded-md hover:bg-accent">P</button></div>
    <div ref={ref} contentEditable suppressContentEditableWarning className="rich-area min-h-[220px] p-4 outline-none" onInput={(e) => onChange(e.currentTarget.innerHTML)} data-testid={testid} />
  </div>);
}

// ---------- tags ----------
export function TagsInput({ value = [], onChange, testid }) {
  const [t, setT] = useState("");
  const add = () => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setT(""); };
  return (<div className="rounded-xl border p-2 flex flex-wrap gap-1.5 items-center">
    {value.map((v) => <span key={v} className="text-xs bg-secondary rounded-md px-2 py-1 flex items-center gap-1">{v}<button type="button" onClick={() => onChange(value.filter((x) => x !== v))}><X size={12} /></button></span>)}
    <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add}
      placeholder="Type and press Enter" className="bg-transparent outline-none text-sm flex-1 min-w-[120px] px-1 py-1" data-testid={testid} /></div>);
}

// ---------- generic field ----------
export function Field({ f, value, onChange, testid }) {
  const id = testid || `field-${tid(f.k)}`;
  let el;
  switch (f.type) {
    case "textarea": el = <Textarea rows={f.rows || 3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} data-testid={id} />; break;
    case "number": el = <Input type="number" value={value ?? 0} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} data-testid={id} />; break;
    case "switch": return <label className="flex items-center justify-between gap-4 py-1"><span className="text-sm">{f.label}</span><Switch checked={!!value} onCheckedChange={onChange} data-testid={id} /></label>;
    case "select": el = <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="admin-select" data-testid={id}>
      {(f.options || []).map((o) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}</select>; break;
    case "color": el = <div className="flex gap-2"><input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded-md border bg-transparent cursor-pointer" data-testid={`${id}-picker`} />
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={id} /></div>; break;
    case "image": el = <MediaPicker value={value} onChange={onChange} testid={id} />; break;
    case "video": el = <MediaPicker value={value} onChange={onChange} kind="video" testid={id} />; break;
    case "rich": el = <RichEditor value={value} onChange={onChange} testid={id} />; break;
    case "tags": el = <TagsInput value={value || []} onChange={onChange} testid={id} />; break;
    case "images": el = <div className="space-y-2">{(value || []).map((u, i) => <div key={i} className="flex gap-2 items-center"><img src={mediaUrl(u, 480)} alt="" className="h-12 w-16 object-cover rounded border" /><span className="text-xs truncate flex-1">{u}</span>
      <Button type="button" size="icon" variant="ghost" onClick={() => onChange(value.filter((_, k) => k !== i))} data-testid={`${id}-remove-${i}`}><X size={14} /></Button></div>)}
      <MediaPicker value="" onChange={(u) => u && onChange([...(value || []), u])} testid={`${id}-add`} /></div>; break;
    case "list": el = <ListEditor items={value || []} onChange={onChange} fields={f.fields} itemLabel={f.itemLabel} testid={id} />; break;
    default: el = <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} data-testid={id} />;
  }
  return <label className="block"><Label>{f.label}</Label>{el}{f.help && <p className="text-xs text-muted-foreground mt-1">{f.help}</p>}</label>;
}

export function Fields({ fields, obj = {}, onChange, prefix = "" }) {
  return <div className="space-y-4">{fields.map((f) => <Field key={f.k} f={f} value={obj?.[f.k]} testid={`field-${prefix}${tid(f.k)}`} onChange={(v) => onChange({ ...obj, [f.k]: v })} />)}</div>;
}

const blank = (fields) => Object.fromEntries(fields.map((f) => [f.k, f.type === "switch" ? true : f.type === "list" || f.type === "tags" ? [] : f.type === "number" ? 0 : f.type === "select" ? (typeof f.options?.[0] === "string" ? f.options[0] : f.options?.[0]?.value) : ""]));

export function ListEditor({ items, onChange, fields, itemLabel = "title", testid = "list", newItem, addLabel = "Add item", renderSummary }) {
  const [open, setOpen] = useState(null), [drag, setDrag] = useState(null);
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= items.length) return; const c = [...items]; [c[i], c[j]] = [c[j], c[i]]; onChange(c); };
  const drop = (j) => { if (drag === null || drag === j) return; const c = [...items]; const [x] = c.splice(drag, 1); c.splice(j, 0, x); onChange(c); setDrag(null); };
  const del = async (i) => { if (await confirmAction(`Remove "${items[i][itemLabel] || "this item"}"?`)) onChange(items.filter((_, k) => k !== i)); };
  return (<div className="space-y-2" data-testid={testid}>
    {items.map((it, i) => (
      <div key={it.id || i} className={`rounded-xl border bg-background/40 ${drag === i ? "opacity-50" : ""}`} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(i)}>
        <div className="flex items-center gap-1 px-2 py-2">
          <GripVertical size={15} className="text-muted-foreground cursor-grab shrink-0" />
          <button type="button" className="flex-1 text-left text-sm truncate px-1" onClick={() => setOpen(open === i ? null : i)} data-testid={`${testid}-item-${i}`}>
            {renderSummary ? renderSummary(it) : (it[itemLabel] || it.name || it.label || `Item ${i + 1}`)}</button>
          <button type="button" className="p-1.5 hover:bg-accent rounded" onClick={() => move(i, -1)} aria-label="Move up" data-testid={`${testid}-up-${i}`}><ChevronUp size={14} /></button>
          <button type="button" className="p-1.5 hover:bg-accent rounded" onClick={() => move(i, 1)} aria-label="Move down" data-testid={`${testid}-down-${i}`}><ChevronDown size={14} /></button>
          <button type="button" className="p-1.5 hover:bg-accent rounded" onClick={() => onChange([...items.slice(0, i + 1), { ...JSON.parse(JSON.stringify(it)), id: uid() }, ...items.slice(i + 1)])} aria-label="Duplicate" data-testid={`${testid}-dup-${i}`}><Copy size={14} /></button>
          <button type="button" className="p-1.5 hover:bg-red-500/20 text-red-400 rounded" onClick={() => del(i)} aria-label="Delete" data-testid={`${testid}-del-${i}`}><Trash2 size={14} /></button>
        </div>
        {open === i && <div className="p-4 pt-1 border-t"><Fields fields={fields} obj={it} prefix={`${testid}-${i}-`} onChange={(v) => onChange(items.map((x, k) => (k === i ? v : x)))} /></div>}
      </div>))}
    <Button type="button" variant="outline" size="sm" onClick={() => { onChange([...items, { id: uid(), ...(newItem ? newItem() : blank(fields)) }]); setOpen(items.length); }} data-testid={`${testid}-add`}><Plus size={14} className="mr-1" />{addLabel}</Button>
  </div>);
}
