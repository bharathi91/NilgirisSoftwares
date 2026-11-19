import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { Menu, X, ChevronDown, Sun, Moon, Linkedin, Github, Twitter, Instagram, Facebook, Youtube, Globe, MessageCircle } from "lucide-react";
import { API, mediaUrl } from "../lib/api";
import { useSite, resolveTheme } from "./SiteContext";
import { SmartLink } from "./Sections";
import ChatWidget from "./ChatWidget";

const SOCIAL = { linkedin: Linkedin, github: Github, twitter: Twitter, x: Twitter, instagram: Instagram, facebook: Facebook, youtube: Youtube, whatsapp: MessageCircle };

function ModeToggle() {
  const { site, mode, setMode } = useSite();
  if (site.theme.allowToggle === false) return null;
  const cur = resolveTheme(site.theme, mode)?.mode;
  return <button className="icon-btn" aria-label="Toggle dark or light mode" onClick={() => setMode(cur === "dark" ? "light" : "dark")} data-testid="theme-mode-toggle">
    {cur === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>;
}

const Logo = () => {
  const { site } = useSite();
  const st = site.settings;
  return <SmartLink href="/" className="flex items-center gap-3 shrink-0" testid="header-logo">
    {st.logo ? <img src={mediaUrl(st.logo)} alt={st.displayName} className="h-9 w-auto" /> : <span className="logo-mark">N</span>}
    <span className="logo-text">{st.displayName}</span></SmartLink>;
};

export function Header() {
  const { site } = useSite();
  const nav = site.navigation;
  const [open, setOpen] = useState(false), [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 20); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  const items = nav.items.filter((i) => i.visible !== false);
  return (
    <header className={`site-header ${nav.sticky ? "sticky-h" : ""} ${scrolled ? "scrolled" : ""}`} data-testid="site-header">
      <div className={`wrap flex items-center gap-6 h-[72px] ${nav.layout === "center" ? "justify-between lg:justify-center" : "justify-between"}`} style={{ maxWidth: "var(--container)" }}>
        <Logo />
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main">{items.map((it) => {
          const kids = (it.children || []).filter((c) => c.visible !== false);
          return <div key={it.id} className="relative group">
            <SmartLink href={it.href} className="nav-link" testid={`nav-${it.label.toLowerCase().replace(/\W+/g, "-")}`}>{it.label}{kids.length > 0 && <ChevronDown size={14} />}</SmartLink>
            {kids.length > 0 && <div className="nav-drop">{kids.map((c) => <SmartLink key={c.id} href={c.href} className="nav-drop-link" testid={`nav-sub-${c.label.toLowerCase().replace(/\W+/g, "-")}`}>{c.label}</SmartLink>)}</div>}
          </div>; })}</nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {nav.ctaLabel && <SmartLink href={nav.ctaHref} className="btn-primary !py-2.5 !px-5 hidden md:inline-flex" testid="header-cta">{nav.ctaLabel}</SmartLink>}
          <button className="icon-btn lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open} data-testid="mobile-menu-toggle">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && <nav className="mobile-nav lg:hidden" data-testid="mobile-nav">{items.map((it) => <div key={it.id}>
        <SmartLink href={it.href} className="mobile-link">{it.label}</SmartLink>
        {(it.children || []).filter((c) => c.visible !== false).map((c) => <SmartLink key={c.id} href={c.href} className="mobile-link sub">{c.label}</SmartLink>)}</div>)}
        {nav.ctaLabel && <SmartLink href={nav.ctaHref} className="btn-primary mt-4 justify-center">{nav.ctaLabel}</SmartLink>}</nav>}
    </header>);
}

export function Footer() {
  const { site } = useSite();
  const f = site.footer, st = site.settings, c = st.contact;
  return (
    <footer className="site-footer" data-testid="site-footer">
      <div className="wrap grid gap-12 md:grid-cols-[1.4fr_repeat(var(--fcols),1fr)]" style={{ maxWidth: "var(--container)", "--fcols": f.columns.length + (c.confirmed ? 1 : 0) }}>
        <div><Logo /><p className="muted mt-5 max-w-sm">{f.about}</p><p className="mt-5 text-sm accent">{st.tagline}</p>
          {f.showSocial && <div className="flex gap-2 mt-6">{st.social.filter((x) => x.url).map((x) => { const I = SOCIAL[x.platform] || Globe;
            return <SmartLink key={x.id || x.platform} href={x.url} className="icon-btn" testid={`social-${x.platform}`}><I size={17} /></SmartLink>; })}</div>}</div>
        {f.columns.map((col) => <div key={col.id}><p className="footer-h">{col.title}</p><ul className="space-y-3 mt-5">{col.links.map((l, i) =>
          <li key={i}><SmartLink href={l.href} className="footer-link">{l.label}</SmartLink></li>)}</ul></div>)}
        {c.confirmed && <div><p className="footer-h">Contact</p><ul className="space-y-3 mt-5 muted text-sm" data-testid="footer-contact">
          {c.email && <li><a href={`mailto:${c.email}`} className="footer-link">{c.email}</a></li>}{c.phone && <li><a href={`tel:${c.phone.replace(/\s/g, "")}`} className="footer-link">{c.phone}</a></li>}{c.address && <li>{c.address}</li>}</ul></div>}
      </div>
      <div className="wrap mt-14 pt-8 border-t flex flex-col md:flex-row gap-4 justify-between text-sm muted" style={{ maxWidth: "var(--container)", borderColor: "var(--c-border)" }}>
        <p data-testid="footer-copyright">{(f.copyright || "").replace("{year}", new Date().getFullYear())}</p>
        <div className="flex gap-5">{f.legal.map((l, i) => <SmartLink key={i} href={l.href} className="footer-link">{l.label}</SmartLink>)}</div>
      </div>
    </footer>);
}

function CookieBanner() {
  const { site, preview } = useSite();
  const [ok, setOk] = useState(() => localStorage.getItem("nsw_cookie") === "1");
  if (preview || ok || !site.settings.cookieConsent?.enabled) return null;
  return <div className="cookie" data-testid="cookie-banner"><p className="text-sm">{site.settings.cookieConsent.text}</p>
    <button className="btn-primary !py-2 !px-4 text-sm" onClick={() => { localStorage.setItem("nsw_cookie", "1"); setOk(true); }} data-testid="cookie-accept">OK</button></div>;
}

export function useSeo(page, override) {
  const { site } = useSite();
  useEffect(() => {
    if (!site) return;
    const g = site.seo, s = { ...(page?.seo || {}), ...(override || {}) };
    const title = s.title || (page ? (g.titleTemplate || "%s").replace("%s", page.title) : g.siteTitle);
    document.title = title;
    const set = (attr, key, val) => { let m = document.head.querySelector(`meta[${attr}="${key}"]`); if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.appendChild(m); } m.setAttribute("content", val || ""); };
    set("name", "description", s.description || g.description);
    set("name", "keywords", s.keywords || g.keywords);
    set("name", "robots", s.noindex ? "noindex" : "index,follow");
    set("property", "og:title", s.ogTitle || title);
    set("property", "og:description", s.ogDescription || s.description || g.description);
    set("property", "og:image", mediaUrl(s.ogImage || g.ogImage));
    set("name", "twitter:card", "summary_large_image");
    let can = document.head.querySelector('link[rel="canonical"]');
    if (!can) { can = document.createElement("link"); can.rel = "canonical"; document.head.appendChild(can); }
    can.href = s.canonical || (g.siteUrl ? g.siteUrl.replace(/\/$/, "") + window.location.pathname : window.location.href.split("?")[0]);
    if (site.settings.favicon) { let fi = document.head.querySelector('link[rel="icon"]'); if (!fi) { fi = document.createElement("link"); fi.rel = "icon"; document.head.appendChild(fi); } fi.href = mediaUrl(site.settings.favicon); }
    let ld = document.getElementById("jsonld");
    if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.id = "jsonld"; document.head.appendChild(ld); }
    ld.textContent = s.jsonld || g.structuredData || JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: site.settings.companyName, slogan: site.settings.tagline, sameAs: site.settings.social.map((x) => x.url) });
  }, [site, page, override]);
}

function useTrack() {
  const { site, preview } = useSite();
  const loc = useLocation();
  useEffect(() => {
    if (preview || !site?.settings.analytics?.enabled) return;
    axios.post(`${API}/public/track`, { path: loc.pathname, referrer: document.referrer }).catch(() => {});
  }, [loc.pathname, preview, site?.settings.analytics?.enabled]);
}

export function SiteShell({ children }) {
  const { site, preview } = useSite();
  useTrack();
  if (!site) return <div className="site min-h-screen" style={{ background: "#080D12" }} data-testid="site-loading" />;
  if (site.settings.maintenance?.enabled && !preview) return <div className="site min-h-screen flex items-center justify-center p-8 text-center" data-testid="maintenance-page">
    <div><span className="logo-mark mx-auto">N</span><h1 className="h-title mt-6" style={{ "--title-size": "40px" }}>{site.settings.displayName}</h1><p className="lead mt-4">{site.settings.maintenance.message}</p></div></div>;
  return <div className="site min-h-screen flex flex-col"><a href="#main" className="skip-link">Skip to content</a><Header /><main id="main" className="flex-1">{children}</main><Footer /><CookieBanner /><ChatWidget /></div>;
}
