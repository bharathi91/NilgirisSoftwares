import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, Trash2, Plus, GripVertical, Monitor, Tablet, Smartphone, ChevronUp, ChevronDown, Puzzle, PenTool, ExternalLink, Navigation } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAdmin } from "./AdminApp";
import { Fields, Field, Label, Panel, confirmAction } from "./fields";
import { SECTION_TYPES, STYLE_FIELDS, RESPONSIVE_FIELDS, newSection, DEFAULT_STYLE } from "../lib/sectionSchemas";
import { uid } from "../lib/api";

const DEV = { d: ["Desktop", Monitor, "100%"], t: ["Tablet", Tablet, "820px"], m: ["Mobile", Smartphone, "390px"] };
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clone = (o) => JSON.parse(JSON.stringify(o));

function AddSection({ open, setOpen, onAdd, components }) {
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Add a section</DialogTitle></DialogHeader>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
      {Object.entries(SECTION_TYPES).map(([k, v]) => <button key={k} onClick={() => { onAdd(newSection(k)); setOpen(false); }} className="rounded-xl border p-3 text-left text-sm hover:border-primary hover:bg-accent transition-colors" data-testid={`add-section-${k}`}>{v.label}</button>)}
      {components.map((c) => <button key={c.id} onClick={() => { onAdd({ ...clone(c.section), id: uid() }); setOpen(false); }} className="rounded-xl border border-dashed border-primary/60 p-3 text-left text-sm hover:bg-accent" data-testid={`add-component-${c.id}`}><Puzzle size={13} className="inline mr-1.5 text-primary" />{c.name}</button>)}
    </div></DialogContent></Dialog>;
}

function SectionEditor({ s, onChange }) {
  const [bp, setBp] = useState("d");
  const st = { ...DEFAULT_STYLE, ...s.style };
  const def = SECTION_TYPES[s.type];
  return <Tabs defaultValue="content"><TabsList className="w-full"><TabsTrigger value="content" className="flex-1" data-testid="editor-tab-content">Content</TabsTrigger>
    <TabsTrigger value="style" className="flex-1" data-testid="editor-tab-style">Style</TabsTrigger><TabsTrigger value="responsive" className="flex-1" data-testid="editor-tab-responsive">Responsive</TabsTrigger></TabsList>
    <TabsContent value="content" className="pt-3">{def?.fields?.length ? <Fields fields={def.fields} obj={s.props} prefix="sec-" onChange={(props) => onChange({ ...s, props })} /> : <p className="text-sm text-muted-foreground">This section pulls its content from the matching Content Management screen.</p>}</TabsContent>
    <TabsContent value="style" className="pt-3"><Fields fields={STYLE_FIELDS} obj={st} prefix="style-" onChange={(style) => onChange({ ...s, style })} /></TabsContent>
    <TabsContent value="responsive" className="pt-3 space-y-4">
      <div className="flex gap-1">{Object.entries(DEV).map(([k, [l, I]]) => <Button key={k} size="sm" variant={bp === k ? "default" : "outline"} onClick={() => setBp(k)} data-testid={`resp-bp-${k}`}><I size={14} className="mr-1" />{l}</Button>)}</div>
      {RESPONSIVE_FIELDS.map((f) => <Field key={f.k} f={f} value={st[f.k]?.[bp]} testid={`resp-${f.k}-${bp}`} onChange={(v) => onChange({ ...s, style: { ...st, [f.k]: { ...st[f.k], [bp]: v } } })} />)}
    </TabsContent></Tabs>;
}

function Builder({ initialSlug }) {
  const { draft, update, setPath } = useAdmin();
  const pages = draft.data.pages;
  const [slug, setSlug] = useState(initialSlug || "/"), [sel, setSel] = useState(null), [dev, setDev] = useState("d"), [add, setAdd] = useState(false), [drag, setDrag] = useState(null);
  const frame = useRef(), ready = useRef(false);
  const pIdx = Math.max(0, pages.findIndex((p) => p.slug === slug));
  const page = pages[pIdx];
  const secs = page.sections;
  const send = (m) => frame.current?.contentWindow?.postMessage(m, window.location.origin);
  useEffect(() => { if (ready.current) send({ type: "draft", data: draft.data }); }, [draft.data]); // eslint-disable-line
  useEffect(() => { send({ type: "select", id: sel }); if (sel) send({ type: "scrollTo", id: sel }); }, [sel]); // eslint-disable-line
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data;
      if (d.type === "preview-ready") { ready.current = true; send({ type: "draft", data: draft.data }); send({ type: "select", id: sel }); }
      if (d.type === "select") setSel(d.id);
      if (d.type === "edit") update((data) => { const s = data.pages[pIdx].sections.find((x) => x.id === d.sectionId); if (s && s.props[d.field] !== d.value) s.props[d.field] = d.value; });
      if (d.type === "navigate") { const target = d.href === "/" ? "/" : d.href.replace(/^\//, ""); if (pages.some((p) => p.slug === target)) { setSlug(target); setSel(null); } else toast.info(`Link: ${d.href}`); }
    };
    window.addEventListener("message", onMsg); return () => window.removeEventListener("message", onMsg);
  }); // re-bind each render to keep closures fresh
  const setSecs = (fn) => update((data) => { data.pages[pIdx].sections = fn(data.pages[pIdx].sections); });
  const selected = secs.find((x) => x.id === sel);
  const move = (i, d) => setSecs((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; [l[i], l[j]] = [l[j], l[i]]; return l; });
  const src = `/preview${slug === "/" ? "" : "/" + slug}`;
  return (<div className="grid xl:grid-cols-[300px_1fr_380px] gap-4" data-testid="page-builder">
    <div className="space-y-4">
      <Panel><Label>Page</Label><select className="admin-select" value={slug} onChange={(e) => { setSlug(e.target.value); setSel(null); ready.current = false; }} data-testid="builder-page-select">
        {pages.map((p) => <option key={p.id} value={p.slug}>{p.title} ({p.slug === "/" ? "/" : "/" + p.slug})</option>)}</select></Panel>
      <Panel title="Sections" actions={<Button size="sm" onClick={() => setAdd(true)} data-testid="builder-add-section"><Plus size={14} className="mr-1" />Add</Button>}>
        <div className="space-y-1.5" data-testid="builder-section-list">{secs.map((s, i) => (
          <div key={s.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && drag !== i) setSecs((l) => { const [x] = l.splice(drag, 1); l.splice(i, 0, x); return l; }); setDrag(null); }}
            className={`group flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm cursor-pointer transition-colors ${sel === s.id ? "border-primary bg-primary/10" : "hover:bg-accent"} ${s.visible === false ? "opacity-50" : ""}`} onClick={() => setSel(s.id)} data-testid={`builder-section-${i}`}>
            <GripVertical size={14} className="text-muted-foreground cursor-grab shrink-0" />
            <span className="flex-1 truncate">{SECTION_TYPES[s.type]?.label || s.type}<span className="block text-[11px] text-muted-foreground truncate">{s.props.title || s.props.slides?.[0]?.title || ""}</span></span>
            <button onClick={(e) => { e.stopPropagation(); move(i, -1); }} className="p-1 hover:text-primary" data-testid={`section-up-${i}`}><ChevronUp size={13} /></button>
            <button onClick={(e) => { e.stopPropagation(); move(i, 1); }} className="p-1 hover:text-primary" data-testid={`section-down-${i}`}><ChevronDown size={13} /></button>
            <button onClick={(e) => { e.stopPropagation(); setSecs((l) => l.map((x) => (x.id === s.id ? { ...x, visible: x.visible === false } : x))); }} className="p-1 hover:text-primary" title="Show/hide" data-testid={`section-toggle-${i}`}>{s.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}</button>
            <button onClick={(e) => { e.stopPropagation(); setSecs((l) => { l.splice(i + 1, 0, { ...clone(s), id: uid() }); return l; }); }} className="p-1 hover:text-primary" title="Duplicate" data-testid={`section-dup-${i}`}><Copy size={13} /></button>
            <button onClick={async (e) => { e.stopPropagation(); if (await confirmAction(`Delete the "${SECTION_TYPES[s.type]?.label}" section from ${page.title}?`)) { setSecs((l) => l.filter((x) => x.id !== s.id)); setSel(null); } }} className="p-1 text-red-400 hover:text-red-300" title="Delete" data-testid={`section-del-${i}`}><Trash2 size={13} /></button>
          </div>))}</div>
      </Panel>
    </div>
    <div className="rounded-2xl border bg-card/40 overflow-hidden flex flex-col min-h-[70vh]">
      <div className="flex items-center gap-1 p-2 border-b">{Object.entries(DEV).map(([k, [l, I]]) => <Button key={k} size="sm" variant={dev === k ? "secondary" : "ghost"} onClick={() => setDev(k)} data-testid={`device-${k}`}><I size={15} className="mr-1.5" />{l}</Button>)}
        <span className="ml-auto text-xs text-muted-foreground hidden md:block">Click a section to edit · click text to type directly</span>
        <Button size="sm" variant="ghost" onClick={() => window.open(src, "_blank")} data-testid="builder-open-preview"><ExternalLink size={14} /></Button></div>
      <div className="flex-1 bg-black/30 flex justify-center overflow-auto p-2"><iframe ref={frame} key={slug} src={src} title="Live preview" className="bg-[#080D12] rounded-lg border transition-[width] duration-300 h-[78vh]" style={{ width: DEV[dev][2], maxWidth: "100%" }} data-testid="builder-preview-frame" /></div>
    </div>
    <div className="space-y-4">{selected ? <Panel title={SECTION_TYPES[selected.type]?.label} desc="Changes show instantly in the preview. Save Draft to keep them." testid="section-editor"
      actions={<Button size="sm" variant="outline" onClick={() => { setPath("components", [...(draft.data.components || []), { id: uid(), name: `${SECTION_TYPES[selected.type]?.label} · ${page.title}`, section: clone(selected) }]); toast.success("Saved to Reusable Components"); }} data-testid="save-as-component"><Puzzle size={13} className="mr-1" />Reuse</Button>}>
      <SectionEditor s={selected} onChange={(ns) => setSecs((l) => l.map((x) => (x.id === ns.id ? ns : x)))} /></Panel>
      : <Panel title="Select a section" desc="Pick a section on the left or click it in the preview."><PenTool className="text-muted-foreground" /></Panel>}</div>
    <AddSection open={add} setOpen={setAdd} components={draft.data.components || []} onAdd={(s) => { setSecs((l) => { const at = sel ? l.findIndex((x) => x.id === sel) + 1 : l.length; l.splice(at, 0, s); return l; }); setSel(s.id); }} />
  </div>);
}

function AllPages() {
  const { draft, update } = useAdmin();
  const nav = useNavigate();
  const [title, setTitle] = useState(""), [slug, setSlug] = useState("");
  const pages = draft.data.pages;
  const setPage = (i, patch) => update((d) => { Object.assign(d.pages[i], patch); });
  const create = () => {
    const s = slugify(slug || title);
    if (!title || !s) return toast.error("Give the page a title");
    if (pages.some((p) => p.slug === s)) return toast.error("That URL is already used");
    update((d) => d.pages.push({ id: uid(), slug: s, title, seo: { title: `${title} | ${d.settings.displayName}`, description: "" }, sections: [newSection("page_header"), newSection("text_block"), newSection("cta")].map((x, k) => (k === 0 ? { ...x, props: { ...x.props, title } } : x)) }));
    setTitle(""); setSlug(""); toast.success("Page created — remember to Save Draft");
  };
  const changeSlug = (i, v) => {
    const old = pages[i].slug, ns = old === "/" ? "/" : slugify(v);
    if (!ns || pages.some((p, k) => k !== i && p.slug === ns)) return toast.error("Invalid or duplicate URL");
    update((d) => {
      d.pages[i].slug = ns;
      const fix = (l) => { if (l.href === "/" + old) l.href = "/" + ns; };
      d.navigation.items.forEach((it) => { fix(it); (it.children || []).forEach(fix); });
      d.footer.columns.forEach((c) => c.links.forEach(fix));
    });
  };
  return (<div className="space-y-6">
    <Panel title="Create a page" testid="create-page-panel"><div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
      <Input placeholder="Page title" value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} data-testid="new-page-title" />
      <Input placeholder="url-slug" value={slug} onChange={(e) => setSlug(e.target.value)} data-testid="new-page-slug" />
      <Button onClick={create} data-testid="create-page-button"><Plus size={15} className="mr-1" />Create page</Button></div></Panel>
    <Panel title={`Pages (${pages.length})`}><div className="space-y-2">{pages.map((p, i) => (
      <div key={p.id} className="grid md:grid-cols-[1.2fr_1fr_auto] gap-3 items-center rounded-xl border p-3" data-testid={`page-row-${p.slug === "/" ? "home" : p.slug}`}>
        <Input value={p.title} onChange={(e) => setPage(i, { title: e.target.value })} data-testid={`page-title-input-${i}`} />
        <div className="flex items-center gap-1"><span className="text-muted-foreground text-sm">/</span><Input defaultValue={p.slug === "/" ? "" : p.slug} disabled={p.slug === "/"} placeholder="(home)" onBlur={(e) => e.target.value !== p.slug && changeSlug(i, e.target.value)} data-testid={`page-slug-input-${i}`} /></div>
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => nav(p.slug === "/" ? "/admin/homepage" : "/admin/builder", { state: { slug: p.slug } })} data-testid={`page-edit-${i}`}><PenTool size={13} /></Button>
          <Button size="sm" variant="ghost" title="Add to menu" onClick={() => { update((d) => d.navigation.items.push({ id: uid(), label: p.title, href: p.slug === "/" ? "/" : "/" + p.slug, visible: true, external: false, children: [] })); toast.success("Added to navigation"); }} data-testid={`page-addnav-${i}`}><Navigation size={13} /></Button>
          <Button size="sm" variant="ghost" title="Duplicate" onClick={() => update((d) => { const c = clone(p); c.id = uid(); c.slug = `${p.slug === "/" ? "home" : p.slug}-copy-${uid().slice(0, 4)}`; c.title = `${p.title} (copy)`; c.sections.forEach((s) => (s.id = uid())); d.pages.splice(i + 1, 0, c); })} data-testid={`page-dup-${i}`}><Copy size={13} /></Button>
          <Button size="sm" variant="ghost" className="text-red-400" disabled={p.slug === "/"} onClick={async () => { if (await confirmAction(`Delete the page "${p.title}"? Menu links pointing to it will fail validation until updated.`)) update((d) => d.pages.splice(i, 1)); }} data-testid={`page-del-${i}`}><Trash2 size={13} /></Button>
        </div></div>))}</div></Panel>
  </div>);
}

export default function PageBuilder({ mode, initialSlug }) {
  const st = window.history.state?.usr?.slug;
  const slug = useMemo(() => initialSlug || st, [initialSlug, st]);
  return mode === "pages" ? <AllPages /> : <Builder key={slug || "b"} initialSlug={slug} />;
}
