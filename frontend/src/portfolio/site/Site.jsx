import { useCallback, useEffect, useMemo, useState } from "react";
import Lenis from "lenis";
import { cn } from "@/lib/utils";
import { fileUrl } from "@/portfolio/lib/api";
import { loadFont, themeVars } from "@/portfolio/lib/theme";
import { SiteCtx } from "@/portfolio/lib/site-context";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Marquee } from "./Marquee";
import { About, Achievements, Additional, Certifications, Education, QuickLinks, Skills } from "./Sections";
import { Experience } from "./Experience";
import { Projects } from "./Projects";
import { CustomSection } from "./CustomSection";
import "@/portfolio/portfolio.css";
import { Contact, Footer } from "./Contact";
import { Testimonials } from "./Testimonials";

const MAP = { about: About, skills: Skills, experience: Experience, projects: Projects, education: Education, certifications: Certifications, achievements: Achievements, additional: Additional, quicklinks: QuickLinks, contact: Contact, custom: CustomSection, testimonials: Testimonials };

const setMeta = (attr, key, val) => {
  if (!val) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", val);
};

const useSeo = (data, pageTitle) => {
  useEffect(() => {
    const s = data?.seo || {}, p = data?.profile || {};
    const title = pageTitle || s.title || p.name;
    if (title) document.title = title;
    setMeta("name", "description", s.description);
    setMeta("name", "keywords", s.keywords);
    setMeta("name", "author", s.author);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", s.description);
    setMeta("property", "og:type", "profile");
    setMeta("name", "twitter:card", "summary_large_image");
    if (s.og_image) setMeta("property", "og:image", fileUrl(s.og_image));
    if (s.canonical) {
      let l = document.head.querySelector('link[rel="canonical"]');
      if (!l) { l = document.createElement("link"); l.rel = "canonical"; document.head.appendChild(l); }
      l.href = s.canonical;
    }
    let ld = document.getElementById("ld-person");
    if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.id = "ld-person"; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Person", name: p.name, jobTitle: p.headline, email: p.email ? `mailto:${p.email}` : undefined, sameAs: [p.linkedin, p.github, p.website].filter(Boolean) });
  }, [data, pageTitle]);
};

const useHashScroll = (enabled) => {
  useEffect(() => {
    if (!enabled || !window.location.hash) return undefined;
    const t = setTimeout(() => document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView(), 350);
    return () => clearTimeout(t);
  }, [enabled]);
};

const useLenis = () => {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, anchors: { offset: -72 } });
    let id = requestAnimationFrame(function raf(t) { lenis.raf(t); id = requestAnimationFrame(raf); });
    return () => { cancelAnimationFrame(id); lenis.destroy(); };
  }, []);
};

export const Site = ({ data, preview = false, title, children }) => {
  const theme = useMemo(() => data?.theme || {}, [data]);
  const [mode, setMode] = useState(() => localStorage.getItem("pf-mode") || theme.default_mode || "light");
  const toggle = useCallback(() => setMode((m) => { const n = m === "dark" ? "light" : "dark"; localStorage.setItem("pf-mode", n); return n; }), []);
  useEffect(() => { loadFont(theme.font_heading); loadFont(theme.font_body); loadFont("Instrument Serif"); loadFont("JetBrains Mono"); }, [theme.font_heading, theme.font_body]);
  const vars = useMemo(() => themeVars(theme, mode), [theme, mode]);
  useEffect(() => {
    document.body.style.backgroundColor = `hsl(${vars["--background"]})`;
    return () => { document.body.style.backgroundColor = ""; };
  }, [vars]);
  useSeo(data, title);
  useLenis();
  useHashScroll(!children);
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const ctx = useMemo(() => ({ data, mode, toggle, preview }), [data, mode, toggle, preview]);
  return (
    <SiteCtx.Provider value={ctx}>
      <div className={cn("pf-root min-h-screen bg-background font-pf-body text-foreground antialiased", mode === "dark" && "dark")} style={vars} data-card={theme.card_style || "bordered"} data-testid="pf-root">
        <Nav />
        <main>
          {children || sections.map((s) => {
            if (s.type === "hero") return <div key={s.id}><Hero section={s} /><Marquee /></div>;
            const C = MAP[s.type];
            return C ? <C key={s.id} section={s} /> : null;
          })}
        </main>
        <Footer />
      </div>
    </SiteCtx.Provider>
  );
};
