import { useState } from "react";
import { toast } from "sonner";
import { Copy, Trash2, Check, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAdmin } from "./AdminApp";
import { Field, Panel, confirmAction } from "./fields";
import { uid } from "../lib/api";

const COLORS = [["bg", "Background"], ["surface", "Surface / alt sections"], ["card", "Card background"], ["primary", "Primary"], ["secondary", "Secondary"], ["accent", "Accent"], ["text", "Text"], ["muted", "Muted text"],
  ["border", "Borders"], ["header", "Header"], ["footer", "Footer"], ["footerText", "Footer text & icons (empty = automatic)"], ["buttonText", "Button text"], ["hover", "Button hover"], ["shadow", "Shadow"], ["gradientFrom", "Gradient start"], ["gradientTo", "Gradient end"]];
const FONTS = ["Syne", "Figtree", "Bricolage Grotesque", "Fraunces", "Manrope", "Outfit", "DM Serif Display", "Space Mono", "Instrument Serif", "Sora", "Plus Jakarta Sans", "Lora", "Archivo", "Unbounded"];

function Sample({ k }) {
  return <div className="rounded-2xl p-6 border" style={{ background: k.bg, color: k.text, borderColor: k.border, fontFamily: k.fontBody }} data-testid="theme-sample">
    <p style={{ color: k.accent, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" }}>Preview</p>
    <h3 style={{ fontFamily: k.fontHeading, fontWeight: k.headingWeight, fontSize: 28, marginTop: 8 }}>Engineering digital experiences</h3>
    <p style={{ color: k.muted, marginTop: 8 }}>Body text in the muted colour.</p>
    <div style={{ background: k.card, borderRadius: k.radius, border: `1px solid ${k.border}`, padding: 16, marginTop: 16 }}>Card surface</div>
    <button style={{ background: k.primary, color: k.buttonText, borderRadius: 999, padding: "10px 20px", marginTop: 16, fontWeight: 600 }}>Primary button</button>
    <div style={{ height: 6, borderRadius: 6, marginTop: 16, background: `linear-gradient(90deg, ${k.gradientFrom}, ${k.gradientTo})` }} />
  </div>;
}

export default function ThemeEditor() {
  const { draft, update, setPath } = useAdmin();
  const th = draft.data.theme;
  const [sel, setSel] = useState(th.activeId);
  const idx = Math.max(0, th.presets.findIndex((p) => p.id === sel));
  const p = th.presets[idx];
  const setTok = (key, v) => setPath(`theme.presets[${idx}].tokens.${key}`, v);
  const dup = () => { const id = `theme-${uid().slice(0, 6)}`; update((d) => d.theme.presets.push({ ...JSON.parse(JSON.stringify(p)), id, name: `${p.name} copy` })); setSel(id); toast.success("Theme duplicated"); };
  const del = async () => {
    if ([th.activeId, th.darkId, th.lightId].includes(p.id)) return toast.error("This theme is in use — pick another active/dark/light theme first");
    if (await confirmAction(`Delete the theme "${p.name}"?`)) { update((d) => d.theme.presets.splice(idx, 1)); setSel(th.activeId); }
  };
  const darks = th.presets.filter((x) => x.mode === "dark"), lights = th.presets.filter((x) => x.mode === "light");
  return (<div className="grid xl:grid-cols-[300px_1fr_380px] gap-5">
    <div className="space-y-5">
      <Panel title="Theme presets">{th.presets.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`w-full flex items-center gap-3 rounded-xl border p-3 mb-2 text-left transition-colors ${sel === x.id ? "border-primary bg-primary/10" : "hover:bg-accent"}`} data-testid={`theme-preset-${x.id}`}>
        <span className="flex -space-x-1">{["bg", "primary", "accent"].map((c) => <span key={c} className="w-5 h-5 rounded-full border" style={{ background: x.tokens[c] }} />)}</span>
        <span className="flex-1 text-sm">{x.name}<span className="block text-xs text-muted-foreground">{x.mode}{th.activeId === x.id ? " · active" : ""}</span></span></button>)}
        <div className="flex gap-2 mt-2"><Button size="sm" variant="outline" onClick={dup} data-testid="theme-duplicate"><Copy size={13} className="mr-1" />Duplicate</Button>
          <Button size="sm" variant="ghost" className="text-red-400" onClick={del} data-testid="theme-delete"><Trash2 size={13} /></Button></div></Panel>
      <Panel title="Dark & light mode" desc="Visitors can switch between your dark and light theme.">
        <div className="space-y-4">
          <Field f={{ k: "allowToggle", label: "Show dark/light toggle", type: "switch" }} value={th.allowToggle !== false} onChange={(v) => setPath("theme.allowToggle", v)} testid="theme-allow-toggle" />
          <Field f={{ k: "defaultMode", label: "Default for new visitors", type: "select", options: [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "Follow device setting" }] }} value={th.defaultMode || "dark"}
            onChange={(v) => { setPath("theme.defaultMode", v); const t = th.presets.find((x) => x.id === (v === "light" ? th.lightId : th.darkId)); if (v !== "system" && t) setPath("theme.activeId", t.id); }} testid="theme-default-mode" />
          <Field f={{ k: "darkId", label: "Dark theme", type: "select", options: darks.map((x) => ({ value: x.id, label: x.name })) }} value={th.darkId} onChange={(v) => setPath("theme.darkId", v)} testid="theme-dark-id" />
          <Field f={{ k: "lightId", label: "Light theme", type: "select", options: lights.map((x) => ({ value: x.id, label: x.name })) }} value={th.lightId} onChange={(v) => setPath("theme.lightId", v)} testid="theme-light-id" />
        </div></Panel>
    </div>
    <Panel title={<Input value={p.name} onChange={(e) => setPath(`theme.presets[${idx}].name`, e.target.value)} className="font-heading" data-testid="theme-name-input" />}
      actions={th.activeId === p.id ? <span className="text-primary text-sm flex items-center gap-1"><Check size={14} />Active</span> : <Button size="sm" onClick={() => setPath("theme.activeId", p.id)} data-testid="theme-activate"><Plus size={13} className="mr-1" />Use as default</Button>}>
      <div className="mb-5 max-w-xs"><Field f={{ k: "mode", label: "Mode", type: "select", options: ["dark", "light"] }} value={p.mode} onChange={(v) => setPath(`theme.presets[${idx}].mode`, v)} testid="theme-mode" /></div>
      <div className="grid md:grid-cols-2 gap-4">{COLORS.map(([k, l]) => <Field key={k} f={{ k, label: l, type: "color" }} value={p.tokens[k]} onChange={(v) => setTok(k, v)} testid={`theme-color-${k}`} />)}</div>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Field f={{ k: "fontHeading", label: "Heading font", type: "select", options: FONTS }} value={p.tokens.fontHeading} onChange={(v) => setTok("fontHeading", v)} testid="theme-font-heading" />
        <Field f={{ k: "fontBody", label: "Body font", type: "select", options: FONTS }} value={p.tokens.fontBody} onChange={(v) => setTok("fontBody", v)} testid="theme-font-body" />
        {[["baseSize", "Base font size (px)"], ["headingWeight", "Heading weight"], ["bodyWeight", "Body weight"], ["radius", "Border radius (px)"], ["spacing", "Spacing scale"], ["container", "Container width (px)"]].map(([k, l]) =>
          <Field key={k} f={{ k, label: l, type: "number" }} value={p.tokens[k]} onChange={(v) => setTok(k, v)} testid={`theme-${k}`} />)}
      </div></Panel>
    <div className="space-y-3"><Sample k={p.tokens} /><p className="text-xs text-muted-foreground">Open the Visual Page Builder to see this theme across real pages before publishing.</p></div>
  </div>);
}
