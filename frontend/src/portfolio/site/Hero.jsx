import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { fileUrl, track } from "@/portfolio/lib/api";
import { useSite } from "@/portfolio/lib/site-context";
import { ButtonGroup } from "./DynamicButton";

const EASE = [0.16, 1, 0.3, 1];

const Line = ({ children, i, className = "" }) => (
  <span className="block overflow-hidden pb-[0.06em]">
    <motion.span className={`block ${className}`} initial={{ y: "115%" }} animate={{ y: "0%" }} transition={{ duration: 1.15, ease: EASE, delay: 0.2 + i * 0.13 }}>
      {children}
    </motion.span>
  </span>
);

const splitName = (name = "") => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length <= 1) return [w.join(" ")];
  return [w[0], w.slice(1).join(" ")];
};

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

const flash = (id) => {
  const el = document.getElementById(`project-${id}`);
  if (!el) return;
  el.classList.remove("is-flash");
  setTimeout(() => el.classList.add("is-flash"), 700);
  setTimeout(() => el.classList.remove("is-flash"), 3200);
};

const AppRow = ({ a, i }) => (
  <a href={`#project-${a.id}`} onClick={() => { flash(a.id); track("app_tap", a.title); }} className="flex items-center gap-3 rounded-2xl bg-card p-2.5 shadow-sm transition-transform duration-300 hover:scale-[1.03] active:scale-[0.97]" data-testid={`hero-app-${a.id}`} aria-label={`Open ${a.title} project`}>
    {a.icon ? <img src={fileUrl(a.icon)} alt="" className="h-9 w-9 shrink-0 rounded-[0.7rem] object-cover ring-1 ring-black/5" />
      : <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[0.7rem] font-pf-serif-accent text-lg italic ${i % 2 ? "bg-foreground text-background" : "bg-primary text-primary-foreground"}`}>{a.title.charAt(0)}</span>}
    <span className="min-w-0"><span className="block truncate text-[13px] font-semibold leading-tight">{a.title}</span><span className="block truncate text-[10px] text-muted-foreground">{a.category}</span></span>
  </a>
);

const AppScreen = ({ apps, site, page, pages, offset }) => (
  <div className="flex h-full w-full shrink-0 flex-col bg-background px-4 pb-4 pt-12 text-foreground" data-testid={`hero-screen-${page}`}>
    <div className="flex items-end justify-between">
      <div>
        <p className="font-pf-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{site.hero_eyebrow}</p>
        <p className="mt-1 font-pf-heading text-2xl font-extrabold tracking-tight">{site.hero_title}</p>
      </div>
      {pages > 1 && <span className="font-pf-mono text-[9px] text-muted-foreground">{page + 1}/{pages}</span>}
    </div>
    <div className="mt-3 space-y-2">{apps.map((a, i) => <AppRow key={a.id} a={a} i={i + offset} />)}</div>
    {site.hero_show_code !== false && (
      <div className="mt-auto rounded-2xl bg-foreground p-3 font-pf-mono text-[9.5px] leading-relaxed text-background/90">
        <span className="text-primary">struct</span> Engineer: <span className="text-primary">View</span> {"{"}<br />
        &nbsp;&nbsp;var body: some View {"{"}<br />
        &nbsp;&nbsp;&nbsp;&nbsp;Text(<span className="text-primary">"Ship it."</span>)<br />
        &nbsp;&nbsp;{"}"}<br />{"}"}
      </div>
    )}
  </div>
);

const useScreens = (src, alt) => {
  const { data } = useSite();
  const site = data?.site || {};
  const per = site.hero_per_screen || 5;
  const apps = (Array.isArray(data?.projects) ? data.projects : []).filter((p) => p.in_hero !== false);
  const groups = chunk(apps, per);
  const screens = groups.map((g, k) => <AppScreen key={`s${k}`} apps={g} site={site} page={k} pages={groups.length} offset={k * per} />);
  if (src) screens.unshift(
    <div key="photo" className="relative h-full w-full shrink-0" data-testid="hero-photo-slide">
      <img src={src} alt={alt} className="h-full w-full object-cover object-top" />
      {(site.hero_photo_caption || site.hero_photo_subcaption) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-6 pt-16 text-white" data-testid="hero-photo-caption">
          {site.hero_photo_caption && <p className="font-pf-heading text-lg font-bold leading-tight">{site.hero_photo_caption}</p>}
          {site.hero_photo_subcaption && <p className="mt-1 inline-flex items-center gap-1.5 font-pf-mono text-[10px] uppercase tracking-[0.18em] text-white/85"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{site.hero_photo_subcaption}</p>}
        </div>
      )}
    </div>
  );
  return { screens, site };
};

const Device = ({ src, alt }) => {
  const { screens, site } = useScreens(src, alt);
  const n = Math.max(screens.length, 1);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const cur = idx % n;
  useEffect(() => {
    if (!site.hero_autoplay || paused || n < 2) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), (site.hero_interval || 4) * 1000);
    return () => clearInterval(t);
  }, [site.hero_autoplay, site.hero_interval, paused, n]);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 120, damping: 18 });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  return (
    <div className="relative mx-auto w-[min(78vw,330px)] [perspective:1200px]" onMouseMove={onMove} onMouseEnter={() => setPaused(true)} onMouseLeave={() => { mx.set(0); my.set(0); setPaused(false); }} data-testid="hero-device">
      <div className="absolute -inset-10 rounded-full bg-primary/25 blur-3xl" aria-hidden />
      <motion.div style={{ rotateX: rx, rotateY: ry }}
        initial={{ opacity: 0, y: 60, rotateZ: -6 }} animate={{ opacity: 1, y: 0, rotateZ: -3 }} transition={{ duration: 1.4, ease: EASE, delay: 0.5 }}
        className="relative aspect-[9/19] rounded-[3rem] border border-foreground/15 bg-foreground p-2.5 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.55)]">
        <div className="relative h-full w-full overflow-hidden rounded-[2.4rem] bg-secondary">
          <div className="flex h-full transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transform: `translateX(-${cur * 100}%)` }} data-testid="hero-carousel-track">
            {screens}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_45%)]" />
          <div className="absolute left-1/2 top-3 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        </div>
        <div className="absolute -right-1 top-28 -z-10 h-16 w-1 rounded-r bg-foreground/80" />
      </motion.div>
      {n > 1 && (
        <div className="relative mt-8 flex items-center justify-center gap-3" data-testid="hero-carousel-controls">
          <button onClick={() => setIdx((cur - 1 + n) % n)} aria-label="Previous screen" data-testid="hero-carousel-prev" className="grid h-9 w-9 place-items-center rounded-full border border-foreground/20 transition-colors hover:bg-foreground hover:text-background"><ChevronLeft className="h-4 w-4" /></button>
          {Array.from({ length: n }).map((_, k) => (
            <button key={k} onClick={() => setIdx(k)} aria-label={`Screen ${k + 1}`} data-testid={`hero-carousel-dot-${k}`}
              className={`h-2 rounded-full transition-[width,background-color] duration-500 ${k === cur ? "w-7 bg-primary" : "w-2 bg-foreground/25 hover:bg-foreground/50"}`} />
          ))}
          <button onClick={() => setIdx((cur + 1) % n)} aria-label="Next screen" data-testid="hero-carousel-next" className="grid h-9 w-9 place-items-center rounded-full border border-foreground/20 transition-colors hover:bg-foreground hover:text-background"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
};

export const Hero = ({ section }) => {
  const { data } = useSite();
  const p = data?.profile || {};
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yDevice = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const yText = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const lines = splitName(p.name);
  const img = fileUrl(p.photo || p.hero_image);
  const showDevice = section?.layout !== "centered";
  return (
    <section ref={ref} id={section?.slug || "top"} data-testid="hero-section" className="relative overflow-hidden px-5 pb-24 pt-28 md:px-10 md:pb-16 md:pt-36">
      <div className="pointer-events-none absolute inset-0 pf-grain" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl items-end gap-14 lg:grid-cols-12">
        <motion.div style={{ y: yText }} className="lg:col-span-8">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-8 inline-flex items-center gap-3 font-pf-mono text-xs uppercase tracking-[0.25em] text-foreground/70" data-testid="hero-eyebrow">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative h-2 w-2 rounded-full bg-primary" /></span>
            {p.availability || section?.eyebrow}
          </motion.p>
          <h1 className="font-pf-heading text-[clamp(3.6rem,15vw,11rem)] font-extrabold leading-[0.84] tracking-[-0.045em]" data-testid="hero-name">
            {lines.map((l, i) => (
              <Line key={i} i={i} className={i === lines.length - 1 ? "font-pf-serif-accent italic font-normal text-primary tracking-[-0.02em]" : ""}>{l}</Line>
            ))}
          </h1>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.75, ease: EASE }} className="mt-10 max-w-2xl space-y-6">
            {p.headline && <p className="font-pf-mono text-xs uppercase leading-relaxed tracking-[0.18em] text-foreground" data-testid="hero-headline">{p.headline}</p>}
            {p.tagline && <p className="text-base leading-relaxed text-muted-foreground md:text-lg" data-testid="hero-tagline">{p.tagline}</p>}
            <ButtonGroup placement="hero" className="pt-2" testid="hero-buttons" />
          </motion.div>
        </motion.div>
        {showDevice && (
          <motion.div style={{ y: yDevice }} className="lg:col-span-4">
            <Device src={img} alt={p.name} />
          </motion.div>
        )}
      </div>
      <motion.a href="#about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
        className="relative mx-auto mt-16 hidden w-max items-center gap-2 font-pf-mono text-[11px] uppercase tracking-[0.3em] text-foreground/60 md:flex" data-testid="hero-scroll-cue">
        <ArrowDown className="h-3.5 w-3.5 animate-bounce" /> Scroll
      </motion.a>
    </section>
  );
};
