import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";

const SiteCtx = createContext(null);
export const useSite = () => useContext(SiteCtx);
const CACHE_KEY = "nsw_site_v1";

export function SiteProvider({ preview = false, loadDraft, children }) {
  const [lang, setLangState] = useState(() => (preview ? "en" : localStorage.getItem("nsw_lang") || "en"));
  const [translating, setTranslating] = useState(false);
  const setLang = (l) => { setLangState(l); try { localStorage.setItem("nsw_lang", l); } catch {} };
  const [site, setSite] = useState(() => {
    if (preview) return null;
    try { return JSON.parse(localStorage.getItem(`${CACHE_KEY}_${localStorage.getItem("nsw_lang") || "en"}`)); } catch { return null; }
  });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (preview) {
      const onMsg = (e) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type === "draft") setSite({ version: "draft", data: e.data.data });
        if (e.data?.type === "select") setSelected(e.data.id);
      };
      window.addEventListener("message", onMsg);
      const embedded = window.parent !== window;
      if (embedded) window.parent.postMessage({ type: "preview-ready" }, window.location.origin);
      else loadDraft?.().then((d) => setSite({ version: "draft", data: d })).catch(() => {});
      return () => window.removeEventListener("message", onMsg);
    }
    let stop = false, tries = 0, timer;
    const load = () => axios.get(`${API}/public/site`, { params: lang !== "en" ? { lang } : {} }).then((r) => {
      if (stop) return;
      setSite(r.data);
      setTranslating(!!r.data.translating);
      if (r.data.translating && tries++ < 15) timer = setTimeout(load, 5000);
      else try { localStorage.setItem(`${CACHE_KEY}_${lang}`, JSON.stringify(r.data)); } catch {}
    }).catch(() => {});
    load();
    document.documentElement.lang = lang;
    return () => { stop = true; clearTimeout(timer); };
  }, [preview, loadDraft, lang]);

  const [mode, setModeState] = useState(() => localStorage.getItem("nsw_mode") || "");
  const setMode = (m) => { setModeState(m); try { localStorage.setItem("nsw_mode", m); } catch {} };
  const post = (msg) => {
    if (!preview) return;
    if (window.parent !== window) return window.parent.postMessage(msg, window.location.origin);
    if (msg.type === "navigate" && msg.href.startsWith("/")) window.location.assign(`/preview${msg.href === "/" ? "" : msg.href}`);
  };
  return <SiteCtx.Provider value={{ site: site?.data, version: site?.version, preview, post, selected, mode, setMode, lang, setLang, translating }}>{children}</SiteCtx.Provider>;
}

export function resolveTheme(theme, userMode) {
  const presets = theme?.presets || [];
  const active = presets.find((p) => p.id === theme?.activeId) || presets[0];
  if (!active || theme.allowToggle === false) return active;
  const sys = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  const want = userMode || (theme.defaultMode === "system" ? sys : active.mode);
  if (want === active.mode) return active;
  const id = want === "dark" ? theme.darkId : theme.lightId;
  return presets.find((p) => p.id === id) || presets.find((p) => p.mode === want) || active;
}

export function ThemeStyle() {
  const { site, mode } = useSite();
  const t = site ? resolveTheme(site.theme, mode) : null;
  useEffect(() => {
    if (!t) return;
    const fams = [t.tokens.fontHeading, t.tokens.fontBody].filter(Boolean).map((f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700;800`).join("&");
    let link = document.getElementById("theme-fonts");
    if (!link) { link = document.createElement("link"); link.id = "theme-fonts"; link.rel = "stylesheet"; document.head.appendChild(link); }
    const href = `https://fonts.googleapis.com/css2?${fams}&display=swap`;
    if (link.href !== href) link.href = href;
  }, [t]);
  if (!t) return null;
  const k = t.tokens;
  const lum = (h) => { const n = parseInt((h || "#000000").replace("#", "").padEnd(6, "0").slice(0, 6), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const footText = k.footerText || (lum(k.footer) < 0.5 ? "#F7FAFC" : "#0B1A14");
  const css = `.site{--c-bg:${k.bg};--c-surface:${k.surface};--c-card:${k.card};--c-primary:${k.primary};--c-secondary:${k.secondary};--c-accent:${k.accent};--c-text:${k.text};--c-muted:${k.muted};--c-border:${k.border};--c-header:${k.header};--c-footer:${k.footer};--c-footer-text:${footText};--c-btn-text:${k.buttonText};--c-hover:${k.hover};--c-shadow:${k.shadow};--g-from:${k.gradientFrom};--g-to:${k.gradientTo};--f-head:'${k.fontHeading}',sans-serif;--f-body:'${k.fontBody}',sans-serif;--fs-base:${k.baseSize}px;--fw-head:${k.headingWeight};--fw-body:${k.bodyWeight};--radius-c:${k.radius}px;--space:${k.spacing};--container:${k.container}px;color-scheme:${t.mode}}`;
  return <style>{css}</style>;
}
