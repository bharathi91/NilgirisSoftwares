import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import DOMPurify from "dompurify";
import axios from "axios";
import { ChevronLeft, ChevronRight, ArrowUpRight, X, Search, Linkedin, Github } from "lucide-react";
import { useSite } from "./SiteContext";
import { Icon } from "../lib/icons";
import { API, mediaUrl, srcSet } from "../lib/api";
import ContactForm from "./ContactForm";

export function SmartLink({ href = "/", className, children, testid, ...rest }) {
  const { preview, post } = useSite();
  if (preview) return <a href={href} className={className} data-testid={testid} onClick={(e) => { e.preventDefault(); post({ type: "navigate", href }); }}>{children}</a>;
  if (/^(https?:|mailto:|tel:)/.test(href)) return <a href={href} className={className} target="_blank" rel="noopener noreferrer" data-testid={testid} {...rest}>{children}</a>;
  return <Link to={href} className={className} data-testid={testid} {...rest}>{children}</Link>;
}

export const Img = ({ src, alt = "", className, sizes = "(min-width:1024px) 50vw, 100vw", eager }) =>
  src ? <img src={mediaUrl(src, 1200)} srcSet={srcSet(src)} sizes={sizes} alt={alt} className={className} loading={eager ? "eager" : "lazy"} decoding="async" /> : null;

function E({ sid, field, value, as: Tag = "span", className, testid }) {
  const { preview, post } = useSite();
  if (!preview) return value ? <Tag className={className} data-testid={testid}>{value}</Tag> : null;
  return <Tag className={`${className || ""} pv-edit`} contentEditable suppressContentEditableWarning data-testid={testid}
    onBlur={(e) => post({ type: "edit", sectionId: sid, field, value: e.currentTarget.innerText })}>{value || ""}</Tag>;
}

const Head = ({ s, center }) => (s.props.eyebrow || s.props.title || s.props.subtitle) ? (
  <div className={`sec-head ${center ? "mx-auto" : ""}`}>
    <E sid={s.id} field="eyebrow" value={s.props.eyebrow} as="p" className="eyebrow" />
    <E sid={s.id} field="title" value={s.props.title} as="h2" className="h-title" testid={`section-title-${s.id}`} />
    <E sid={s.id} field="subtitle" value={s.props.subtitle} as="p" className="lead mt-4" />
  </div>) : null;

const BTNS = ({ buttons = [], center }) => buttons.length ? (
  <div className={`flex flex-wrap gap-3 mt-8 ${center ? "justify-center" : ""}`}>
    {buttons.map((b, i) => <SmartLink key={i} href={b.href} className={b.variant === "ghost" ? "btn-ghost" : "btn-primary"} testid={`btn-${(b.label || "").toLowerCase().replace(/\W+/g, "-")}`}>{b.label}</SmartLink>)}
  </div>) : null;

const ANIM = { "fade-up": { y: 1 }, fade: {}, zoom: { scale: 0.96 }, "slide-left": { x: 1 } };

function Reveal({ anim, children, i = 0 }) {
  const { site } = useSite();
  const reduce = useReducedMotion();
  const a = site.animations || {};
  if (reduce || a.enabled === false || anim === "none") return children;
  const v = ANIM[anim] || ANIM["fade-up"];
  const d = a.distance ?? 28;
  return <motion.div initial={{ opacity: 0, y: v.y ? d : 0, x: v.x ? d : 0, scale: v.scale || 1 }} whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
    viewport={{ once: true, margin: "-60px" }} transition={{ duration: a.duration ?? 0.7, delay: i * (a.stagger ?? 0.08), ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

function sectionCss(s) {
  const st = s.style || {};
  const r = (bp) => `padding-top:${st.paddingY?.[bp] ?? 80}px;padding-bottom:${st.paddingY?.[bp] ?? 80}px;text-align:${st.align?.[bp] || "left"};--title-size:${st.titleSize?.[bp] || 40}px;--cols:${st.columns?.[bp] || 1};display:${st.hide?.[bp] ? "none" : "block"};`;
  return `#s-${s.id}{${r("m")}}@media(min-width:768px){#s-${s.id}{${r("t")}}}@media(min-width:1024px){#s-${s.id}{${r("d")}}}`;
}

const WIDTH = { narrow: "860px", normal: "var(--container)", wide: "1480px", full: "100%" };

function Wrapper({ s, children }) {
  const { preview, post, selected } = useSite();
  const st = s.style || {};
  const bg = { base: "var(--c-bg)", surface: "var(--c-surface)", gradient: "radial-gradient(1200px 500px at 10% 0%, color-mix(in srgb, var(--g-from) 22%, transparent), transparent), var(--c-bg)", custom: st.bgColor || "var(--c-bg)", image: "var(--c-bg)" }[st.bg] || "var(--c-bg)";
  const style = { background: bg, minHeight: st.minHeight ? `${st.minHeight}px` : undefined };
  if (st.bg === "image" && st.bgImage) style.background = `linear-gradient(rgba(0,0,0,${(st.overlay ?? 60) / 100}),rgba(0,0,0,${(st.overlay ?? 60) / 100})), url(${mediaUrl(st.bgImage, 1800)}) center/cover`;
  const cls = `sec relative ${preview ? "pv-section" : ""} ${selected === s.id ? "pv-selected" : ""} ${s.visible === false ? "pv-hidden" : ""}`;
  return (
    <section id={`s-${s.id}`} className={cls} style={style} data-testid={`section-${s.type}`} data-section-id={s.id}
      onClickCapture={preview ? () => post({ type: "select", id: s.id }) : undefined}>
      <style>{sectionCss(s)}</style>
      {preview && <span className="pv-tag">{s.type.replace(/_/g, " ")}{s.visible === false ? " · hidden" : ""}</span>}
      <div className={s.type === "hero_carousel" ? "" : "wrap"} style={{ maxWidth: s.type === "hero_carousel" ? undefined : WIDTH[st.maxWidth] || WIDTH.normal }}>
        <Reveal anim={s.type === "hero_carousel" ? "none" : st.animation}>{children}</Reveal>
      </div>
    </section>);
}

function Hero({ s }) {
  const p = s.props;
  const slides = (p.slides || []).filter((x) => x.enabled !== false);
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!p.autoplay || slides.length < 2 || reduce) return;
    const t = setTimeout(() => setI((x) => (x + 1) % slides.length), Math.max(2000, p.interval || 6000));
    return () => clearTimeout(t);
  }, [i, p.autoplay, p.interval, slides.length, reduce]);
  if (!slides.length) return null;
  const cur = slides[Math.min(i, slides.length - 1)];
  const v = { fade: { i: { opacity: 0 }, a: { opacity: 1 }, e: { opacity: 0 } }, slide: { i: { x: "8%", opacity: 0 }, a: { x: 0, opacity: 1 }, e: { x: "-8%", opacity: 0 } }, zoom: { i: { scale: 1.08, opacity: 0 }, a: { scale: 1, opacity: 1 }, e: { opacity: 0 } } }[p.transition || "fade"];
  const go = (d) => setI((x) => (x + d + slides.length) % slides.length);
  return (
    <div className="hero" style={{ minHeight: `${p.height || 85}svh` }} data-testid="hero-carousel">
      <AnimatePresence mode="sync">
        <motion.div key={cur.id || i} className="hero-media" initial={v.i} animate={v.a} exit={v.e} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          {cur.kind === "video" && cur.video ? <video src={mediaUrl(cur.video)} poster={mediaUrl(cur.poster, 1200)} autoPlay muted loop playsInline preload="metadata" className="hero-bg" />
            : cur.image ? <picture>{cur.mobileImage && <source media="(max-width:767px)" srcSet={mediaUrl(cur.mobileImage, 1200)} />}
              <img src={mediaUrl(cur.image, 1800)} srcSet={srcSet(cur.image)} sizes="100vw" alt="" className="hero-bg" loading={i === 0 ? "eager" : "lazy"} fetchpriority={i === 0 ? "high" : "auto"} /></picture> : null}
          <div className="hero-overlay" style={{ opacity: (cur.overlay ?? 55) / 100 + (cur.kind === "text" ? 0.25 : 0) }} />
        </motion.div>
      </AnimatePresence>
      <div className="hero-grain" />
      <div className="wrap hero-content" style={{ maxWidth: "var(--container)" }}>
        <motion.div key={`t-${cur.id || i}`} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="max-w-3xl">
          {cur.eyebrow && <p className="eyebrow">{cur.eyebrow}</p>}
          <h1 className="hero-title" data-testid="hero-title">{cur.title}</h1>
          {cur.subtitle && <p className="lead mt-6 max-w-2xl">{cur.subtitle}</p>}
          <div className="flex flex-wrap gap-3 mt-10">
            {cur.ctaLabel && <SmartLink href={cur.ctaHref} className="btn-primary" testid="hero-cta-primary">{cur.ctaLabel}<ArrowUpRight size={18} /></SmartLink>}
            {cur.cta2Label && <SmartLink href={cur.cta2Href} className="btn-ghost" testid="hero-cta-secondary">{cur.cta2Label}</SmartLink>}
          </div>
        </motion.div>
        {slides.length > 1 && <div className="hero-controls">
          <button aria-label="Previous slide" onClick={() => go(-1)} className="icon-btn" data-testid="hero-prev"><ChevronLeft size={18} /></button>
          {slides.map((_, k) => <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className={`dot ${k === i ? "on" : ""}`} data-testid={`hero-dot-${k}`} />)}
          <button aria-label="Next slide" onClick={() => go(1)} className="icon-btn" data-testid="hero-next"><ChevronRight size={18} /></button>
        </div>}
      </div>
    </div>);
}

const PageHeader = ({ s }) => (
  <div className="relative">
    {s.props.image && <div className="ph-bg"><Img src={s.props.image} sizes="100vw" eager className="w-full h-full object-cover" /><div className="ph-fade" /></div>}
    <div className="relative max-w-3xl"><E sid={s.id} field="eyebrow" value={s.props.eyebrow} as="p" className="eyebrow" />
      <E sid={s.id} field="title" value={s.props.title} as="h1" className="h-title" testid="page-title" />
      <E sid={s.id} field="subtitle" value={s.props.subtitle} as="p" className="lead mt-5" /></div>
  </div>);

const TextBlock = ({ s }) => {
  const p = s.props, img = p.image && p.imagePosition !== "none";
  return (<div className={`grid gap-12 items-center ${img ? "lg:grid-cols-2" : ""}`}>
    <div className={p.imagePosition === "left" ? "lg:order-2" : ""}><Head s={s} /><E sid={s.id} field="body" value={p.body} as="p" className="body-text mt-6 whitespace-pre-line" /><BTNS buttons={p.buttons} /></div>
    {img && <div className="media-frame"><Img src={p.image} className="w-full h-full object-cover" /></div>}
  </div>);
};

const RichText = ({ s }) => <div className="prose-site" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(s.props.html || "") }} />;

const Grid = ({ children, testid }) => <div className="grid-cols-var mt-12" data-testid={testid}>{children}</div>;

function ServicesGrid({ s }) {
  const { site } = useSite();
  let items = site.services.filter((x) => x.visible !== false);
  if (s.props.limit) items = items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, s.props.limit);
  return (<><Head s={s} /><Grid testid="services-grid">{items.map((x, i) => (
    <SmartLink key={x.id} href={x.href || "/contact"} className="card card-hover group text-left" testid={`service-card-${x.slug}`}>
      <span className="icon-chip"><Icon name={x.icon} size={22} /></span>
      <h3 className="card-title mt-6">{x.title}</h3><p className="muted mt-3">{x.summary}</p>
      <span className="link-arrow mt-6">Learn more <ArrowUpRight size={16} /></span>
    </SmartLink>))}</Grid></>);
}

const FeatureCards = ({ s }) => (<><Head s={s} /><Grid>{(s.props.items || []).map((x, i) => (
  <div key={i} className="card text-left" data-testid={`feature-card-${i}`}><span className="icon-chip"><Icon name={x.icon} size={22} /></span>
    <h3 className="card-title mt-6">{x.title}</h3><p className="muted mt-3">{x.text}</p></div>))}</Grid></>);

const Stats = ({ s }) => (<><Head s={s} /><Grid>{(s.props.items || []).map((x, i) => (
  <div key={i} className="stat"><div className="stat-v">{x.value}</div><div className="muted mt-2">{x.label}</div></div>))}</Grid></>);

function TechStack({ s }) {
  const { site } = useSite();
  const only = (s.props.categories || []).filter(Boolean);
  const cats = [...new Set(site.technologies.map((t) => t.category))].filter((c) => !only.length || only.includes(c));
  const [cat, setCat] = useState("All");
  const list = site.technologies.filter((t) => cats.includes(t.category) && (cat === "All" || t.category === cat));
  return (<><Head s={s} />
    <div className="flex flex-wrap gap-2 mt-10" role="tablist">{["All", ...cats].map((c) => (
      <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={`pill ${cat === c ? "on" : ""}`} data-testid={`tech-tab-${c.toLowerCase()}`}>{c}</button>))}</div>
    <motion.div layout className="flex flex-wrap gap-3 mt-8">{list.map((t) => (
      <motion.span layout key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="chip">{t.name}<small>{t.category}</small></motion.span>))}</motion.div></>);
}

export const CLASS_LABEL = { company: "Company project", founder_experience: "Founder's previous professional experience", personal: "Personal project", demo: "Demonstration project" };

function Projects({ s }) {
  const { site } = useSite();
  const [q, setQ] = useState(""), [cat, setCat] = useState(""), [cls, setCls] = useState(""), [open, setOpen] = useState(null);
  let items = site.projects.filter((p) => p.visible !== false);
  if (s.props.mode === "featured") items = items.filter((p) => p.featured);
  const cats = [...new Set(items.map((p) => p.category))];
  const shown = items.filter((p) => (!cat || p.category === cat) && (!cls || p.classification === cls) &&
    (!q || `${p.name} ${p.description} ${(p.tech || []).join(" ")}`.toLowerCase().includes(q.toLowerCase())));
  return (<><Head s={s} />
    {s.props.filterable && <div className="flex flex-col md:flex-row gap-3 mt-10">
      <label className="field-wrap flex-1"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects or technologies" data-testid="portfolio-search" /></label>
      <select value={cat} onChange={(e) => setCat(e.target.value)} className="select-site" data-testid="portfolio-category-filter"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      <select value={cls} onChange={(e) => setCls(e.target.value)} className="select-site" data-testid="portfolio-type-filter"><option value="">All types</option>{Object.entries(CLASS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    </div>}
    <Grid testid="projects-grid">{shown.map((p) => (
      <button key={p.id} onClick={() => setOpen(p)} className="card card-hover text-left p-0 overflow-hidden" data-testid={`project-card-${p.id}`}>
        <div className="proj-thumb">{p.screenshots?.[0] ? <Img src={p.screenshots[0]} className="w-full h-full object-cover" /> : <span className="proj-initial">{p.name[0]}</span>}</div>
        <div className="p-6"><span className={`badge cls-${p.classification}`}>{CLASS_LABEL[p.classification]}</span>
          <h3 className="card-title mt-4">{p.name}</h3><p className="muted text-sm mt-1">{p.category} · {p.platform}</p>
          <p className="muted mt-3 line-clamp-2">{p.description}</p></div>
      </button>))}
      {!shown.length && <p className="muted">No projects match.</p>}</Grid>
    <AnimatePresence>{open && <motion.div className="modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
      <motion.div className="modal-card" initial={{ y: 30 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} data-testid="project-modal">
        <button className="icon-btn absolute right-4 top-4" onClick={() => setOpen(null)} aria-label="Close" data-testid="project-modal-close"><X size={18} /></button>
        <span className={`badge cls-${open.classification}`}>{CLASS_LABEL[open.classification]}</span>
        <h3 className="h-title mt-4" style={{ "--title-size": "34px" }}>{open.name}</h3>
        <p className="muted mt-1">{open.category} · {open.platform}</p><p className="body-text mt-5">{open.description}</p>
        {open.contribution && <><h4 className="card-title mt-6">Contribution</h4><p className="muted mt-2">{open.contribution}</p></>}
        {!!open.features?.length && <ul className="mt-5 space-y-1 list-disc pl-5 muted">{open.features.map((f) => <li key={f}>{f}</li>)}</ul>}
        {!!open.tech?.length && <div className="flex flex-wrap gap-2 mt-5">{open.tech.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
        {!!open.screenshots?.length && <div className="flex gap-3 overflow-x-auto mt-6 snap-x">{open.screenshots.map((u) => <Img key={u} src={u} className="h-64 rounded-xl snap-start" />)}</div>}
        {open.link && <SmartLink href={open.link} className="btn-primary mt-7" testid="project-external-link">Visit project <ArrowUpRight size={16} /></SmartLink>}
      </motion.div></motion.div>}</AnimatePresence></>);
}

const Process = ({ s }) => (<><Head s={s} /><div className="grid-cols-var mt-12">{(s.props.steps || []).map((x, i) => (
  <Reveal key={i} i={i} anim="fade-up"><div className="step"><span className="step-n">{String(i + 1).padStart(2, "0")}</span><h3 className="card-title mt-4">{x.title}</h3><p className="muted mt-2">{x.text}</p></div></Reveal>))}</div></>);

function Founder({ s }) {
  const { site } = useSite();
  const f = site.founder;
  return (<><Head s={s} />
    <div className="grid lg:grid-cols-[320px_1fr] gap-10 mt-12 items-start text-left">
      <div className="media-frame aspect-[4/5]">{f.photo ? <Img src={f.photo} alt={f.name} className="w-full h-full object-cover" /> : <div className="proj-initial h-full flex items-center justify-center">{f.name?.[0]}</div>}</div>
      <div><h3 className="card-title text-2xl" data-testid="founder-name">{f.name}</h3><p className="accent mt-1">{f.title}</p>
        <p className="body-text mt-5">{f.bio}</p>
        <div className="flex flex-wrap gap-2 mt-6">{(f.expertise || []).map((x) => <span key={x} className="chip">{x}</span>)}</div>
        {s.props.showFull && !!f.domains?.length && <p className="muted mt-6">Industry experience: {f.domains.join(" · ")}</p>}
        {s.props.showFull && !!f.experience?.length && <div className="mt-8 space-y-5 border-l pl-6" style={{ borderColor: "var(--c-border)" }}>{f.experience.map((x, i) => (
          <div key={i}><p className="card-title">{x.role} · <span className="muted">{x.company}</span></p><p className="text-sm accent">{x.period}</p><p className="muted mt-1">{x.summary}</p></div>))}</div>}
        <div className="flex gap-3 mt-7">{f.links?.linkedin && <SmartLink href={f.links.linkedin} className="icon-btn" testid="founder-linkedin"><Linkedin size={18} /></SmartLink>}
          {f.links?.github && <SmartLink href={f.links.github} className="icon-btn" testid="founder-github"><Github size={18} /></SmartLink>}</div>
      </div></div></>);
}

function About() {
  const { site } = useSite();
  const a = site.about;
  return (<div className="grid lg:grid-cols-2 gap-14 text-left">
    <div><p className="eyebrow">Who we are</p><p className="body-text text-xl">{a.intro}</p><p className="muted mt-6">{a.philosophy}</p></div>
    <div className="grid gap-5"><div className="card"><p className="eyebrow">Vision</p><p className="body-text">{a.vision}</p></div>
      <div className="card"><p className="eyebrow">Mission</p><p className="body-text">{a.mission}</p></div></div>
    <div className="lg:col-span-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{(a.values || []).map((v) => (
      <div key={v.title} className="step"><h3 className="card-title">{v.title}</h3><p className="muted mt-2">{v.text}</p></div>))}</div>
  </div>);
}

function Testimonials({ s }) {
  const { site, preview } = useSite();
  const t = site.testimonials.filter((x) => x.verified !== false);
  if (!t.length) return preview ? <p className="muted">No verified testimonials yet — this section is hidden on the live site until you add one.</p> : null;
  return (<><Head s={s} /><Grid>{t.map((x) => (<figure key={x.id} className="card text-left"><blockquote className="body-text">“{x.quote}”</blockquote>
    <figcaption className="mt-5"><p className="card-title">{x.name}</p><p className="muted text-sm">{[x.role, x.company].filter(Boolean).join(", ")}</p></figcaption></figure>))}</Grid></>);
}

const Accordion = ({ items, testid }) => (<div className="mt-10 divide-y text-left" style={{ borderColor: "var(--c-border)" }} data-testid={testid}>{items.map((x, i) => (
  <details key={i} className="acc" data-testid={`${testid}-item-${i}`}><summary>{x.q}<span className="acc-plus">+</span></summary><p className="muted pb-6 whitespace-pre-line">{x.a}</p></details>))}</div>);

const Faq = ({ s }) => { const { site } = useSite(); return <><Head s={s} /><Accordion items={site.faqs} testid="faq" /></>; };
const AccordionSec = ({ s }) => <><Head s={s} /><Accordion items={s.props.items || []} testid={`acc-${s.id}`} /></>;

function Tabs({ s }) {
  const [i, setI] = useState(0);
  const tabs = s.props.tabs || [];
  return (<><Head s={s} /><div className="flex flex-wrap gap-2 mt-8" role="tablist">{tabs.map((t, k) => (
    <button key={k} role="tab" aria-selected={i === k} className={`pill ${i === k ? "on" : ""}`} onClick={() => setI(k)} data-testid={`tab-${s.id}-${k}`}>{t.label}</button>))}</div>
    <div className="card mt-6 text-left whitespace-pre-line body-text">{tabs[i]?.content}</div></>);
}

const Gallery = ({ s }) => (<><Head s={s} />
  <div className={s.props.layout === "carousel" ? "flex gap-4 overflow-x-auto snap-x mt-10 pb-4" : "grid-cols-var mt-10"}>{(s.props.images || []).map((g, i) => (
    <figure key={i} className={s.props.layout === "carousel" ? "snap-start shrink-0 w-[80%] md:w-[45%]" : ""}><div className="media-frame aspect-[4/3]"><Img src={g.src} alt={g.alt} className="w-full h-full object-cover" /></div>
      {g.caption && <figcaption className="muted text-sm mt-2">{g.caption}</figcaption>}</figure>))}</div></>);

const VideoSec = ({ s }) => (<><Head s={s} /><div className="media-frame aspect-video mt-8">
  {/youtube\.com\/embed|player\.vimeo/.test(s.props.src || "") ? <iframe src={s.props.src} title={s.props.title || "video"} className="w-full h-full" allowFullScreen loading="lazy" />
    : s.props.src ? <video src={mediaUrl(s.props.src)} poster={mediaUrl(s.props.poster, 1200)} controls preload="none" playsInline className="w-full h-full object-cover" /> : null}</div></>);

const Cta = ({ s }) => (<div className="cta-box"><E sid={s.id} field="title" value={s.props.title} as="h2" className="h-title" />
  <E sid={s.id} field="subtitle" value={s.props.subtitle} as="p" className="lead mt-4 max-w-2xl" /><BTNS buttons={s.props.buttons} /></div>);

function BlogList({ s }) {
  const [q, setQ] = useState(""), [cat, setCat] = useState(""), [page, setPage] = useState(1), [res, setRes] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => axios.get(`${API}/public/blog`, { params: { q, category: cat, page, size: s.props.limit || 9 } }).then((r) => setRes(r.data)).catch(() => setRes({ items: [], pages: 1, categories: [] })), 250);
    return () => clearTimeout(t);
  }, [q, cat, page, s.props.limit]);
  return (<><Head s={s} />
    {s.props.showSearch && <div className="flex flex-col md:flex-row gap-3 mt-4">
      <label className="field-wrap flex-1"><Search size={16} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search articles" data-testid="blog-search" /></label>
      <select className="select-site" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} data-testid="blog-category-filter"><option value="">All categories</option>{(res?.categories || []).map((c) => <option key={c}>{c}</option>)}</select></div>}
    <div className="grid-cols-var mt-10" style={{ "--cols": "var(--blog-cols, 3)" }}>{(res?.items || []).map((p) => (
      <SmartLink key={p.id} href={`/blog/${p.slug}`} className="card card-hover p-0 overflow-hidden text-left" testid={`blog-card-${p.slug}`}>
        <div className="proj-thumb">{p.cover ? <Img src={p.cover} className="w-full h-full object-cover" /> : <span className="proj-initial">{p.title[0]}</span>}</div>
        <div className="p-6">{p.featured && <span className="badge cls-company mr-2">Featured</span>}<span className="muted text-sm">{p.category}</span>
          <h3 className="card-title mt-3">{p.title}</h3><p className="muted mt-2 line-clamp-2">{p.excerpt}</p></div></SmartLink>))}</div>
    {res && !res.items.length && <p className="muted mt-6" data-testid="blog-empty">No articles yet.</p>}
    {res?.pages > 1 && <div className="flex gap-2 mt-10">{Array.from({ length: res.pages }, (_, k) => (
      <button key={k} className={`pill ${page === k + 1 ? "on" : ""}`} onClick={() => setPage(k + 1)} data-testid={`blog-page-${k + 1}`}>{k + 1}</button>))}</div>}</>);
}

const ContactSec = ({ s }) => <ContactForm s={s} Head={Head} />;

const MAP = { hero_carousel: Hero, page_header: PageHeader, text_block: TextBlock, rich_text: RichText, services_grid: ServicesGrid, feature_cards: FeatureCards,
  stats: Stats, tech_stack: TechStack, projects: Projects, process: Process, founder: Founder, about: About, testimonials: Testimonials, faq: Faq,
  accordion: AccordionSec, tabs: Tabs, gallery: Gallery, video: VideoSec, cta: Cta, contact_form: ContactSec, blog_list: BlogList };

export function Sections({ sections }) {
  const { preview, site } = useSite();
  const list = useMemo(() => sections.filter((s) => preview || s.visible !== false), [sections, preview]);
  return list.map((s) => {
    const C = MAP[s.type];
    if (!C) return null;
    if (!preview && s.type === "testimonials" && !site.testimonials.some((t) => t.verified !== false)) return null;
    return <Wrapper key={s.id} s={s}><C s={s} /></Wrapper>;
  });
}
