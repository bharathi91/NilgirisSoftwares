import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Apple, Expand, Github, Play } from "lucide-react";
import { useSite } from "@/portfolio/lib/site-context";
import { fileUrl } from "@/portfolio/lib/api";
import { cn } from "@/lib/utils";
import { Lightbox } from "./Lightbox";
import { Reveal } from "./Shell";
import { GithubMark } from "./Projects";

const arr = (v) => (Array.isArray(v) ? v : []);
const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const Eyebrow = ({ children }) => <p className="mb-4 font-pf-mono text-xs uppercase tracking-[0.25em] text-primary">{children}</p>;
const Wrap = ({ children, className, testid }) => <section className={cn("px-5 md:px-10", className)} data-testid={testid}><div className="mx-auto max-w-7xl">{children}</div></section>;

const findJob = (p, jobs) => {
  const t = norm(p.title);
  return t ? jobs.find((e) => norm(`${e.summary} ${e.company}`).includes(t)) : undefined;
};

const stores = (p) => {
  const apple = p.app_store || (/apps\.apple\.com/.test(p.link || "") ? p.link : "");
  const play = p.play_store || (/play\.google\.com/.test(p.link || "") ? p.link : "");
  const other = p.link && p.link !== apple && p.link !== play ? p.link : "";
  return { apple, play, other };
};

const Pill = ({ href, icon: I, children, solid, testid }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testid}
    className={cn("inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors duration-300",
      solid ? "bg-foreground text-background hover:bg-primary hover:text-primary-foreground" : "border border-foreground/20 hover:border-primary hover:text-primary")}>
    <I className="h-4 w-4" /> {children}
  </a>
);

const Header = ({ p, backTo }) => {
  const { apple, play, other } = stores(p);
  return (
    <Wrap className="pt-28 md:pt-36" testid="app-detail-header">
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground" data-testid="app-detail-back-link"><ArrowLeft className="h-4 w-4" /> All work</Link>
      <Reveal className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
        {p.icon ? <img src={fileUrl(p.icon)} alt={`${p.title} app icon`} className="h-24 w-24 shrink-0 rounded-[22%] shadow-xl ring-1 ring-black/5 md:h-32 md:w-32" data-testid="app-detail-icon" />
          : <div className="shrink-0"><GithubMark /></div>}
        <div className="min-w-0">
          {p.category && <Eyebrow>{p.category}</Eyebrow>}
          <h1 className="font-pf-heading text-4xl font-bold leading-[0.95] tracking-[-0.035em] sm:text-5xl lg:text-7xl" data-testid="app-detail-title">{p.title}</h1>
        </div>
      </Reveal>
      {p.description && <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg" data-testid="app-detail-description">{p.description}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        {apple && <Pill href={apple} icon={Apple} solid testid="app-detail-appstore-btn">App Store</Pill>}
        {play && <Pill href={play} icon={Play} solid={!apple} testid="app-detail-playstore-btn">Google Play</Pill>}
        {other && <Pill href={other} icon={ArrowUpRight} solid={!apple && !play} testid="app-detail-link-btn">{p.link_label || "View"}</Pill>}
        {p.repo && <Pill href={p.repo} icon={Github} testid="app-detail-repo-btn">Source code</Pill>}
      </div>
    </Wrap>
  );
};

const Facts = ({ p, job }) => {
  const role = p.role || job?.role;
  const tags = arr(p.tags);
  return (
    <Wrap className="mt-16 md:mt-24" testid="app-detail-facts">
      <div className="grid items-start gap-4 md:grid-cols-12">
        {role && <div className="pf-card p-6 md:col-span-7 md:p-8" data-testid="app-detail-role">
          <Eyebrow>My role</Eyebrow>
          <p className="font-pf-heading text-2xl font-bold tracking-tight md:text-3xl">{role}</p>
          {job && <p className="mt-2 text-sm text-muted-foreground">{job.company}{(job.start || job.end) && ` · ${[job.start, job.end].filter(Boolean).join(" — ")}`}</p>}
          {arr(job?.bullets).length > 0 && <ul className="mt-5 list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">{job.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>}
        </div>}
        <div className={cn("pf-card p-6 md:p-8", role ? "md:col-span-5" : "md:col-span-12")} data-testid="app-detail-tech">
          <Eyebrow>Tech used</Eyebrow>
          {tags.length ? <div className="flex flex-wrap gap-2">{tags.map((t) => <span key={t} className="rounded-full border border-foreground/15 px-3 py-1.5 font-pf-mono text-xs">{t}</span>)}</div>
            : <p className="text-sm text-muted-foreground">Details coming soon.</p>}
        </div>
      </div>
    </Wrap>
  );
};

const Gallery = ({ p }) => {
  const shots = arr(p.screenshots);
  const [open, setOpen] = useState(null);
  if (!shots.length) return null;
  return (
    <Wrap className="mt-14 md:mt-20" testid="app-detail-gallery">
      <div className="flex items-end justify-between gap-4"><Eyebrow>Screenshots</Eyebrow><span className="mb-4 font-pf-mono text-xs text-muted-foreground">{shots.length} images</span></div>
      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4">
        {shots.map((s, k) => (
          <button type="button" key={k} onClick={() => setOpen(k)} aria-label={`Open ${p.title} screenshot ${k + 1}`} data-testid={`app-detail-shot-${k}`}
            className="group relative w-[62vw] max-w-[260px] shrink-0 snap-start cursor-zoom-in overflow-hidden rounded-[1.6rem] border-[4px] border-foreground bg-muted shadow-xl transition-transform duration-500 hover:-translate-y-2 md:w-auto md:max-w-none">
            <img src={fileUrl(s)} alt={`${p.title} screenshot ${k + 1}`} loading="lazy" className="aspect-[9/19.5] w-full object-cover object-top" />
            <span className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-background/85 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"><Expand className="h-3.5 w-3.5" /></span>
          </button>
        ))}
      </div>
      <AnimatePresence>{open !== null && <Lightbox images={shots} start={open} title={p.title} onClose={() => setOpen(null)} />}</AnimatePresence>
    </Wrap>
  );
};

const Features = ({ p }) => {
  const items = arr(p.bullets);
  if (!items.length) return null;
  return (
    <Wrap className="mt-16 md:mt-24" testid="app-detail-features">
      <Eyebrow>Key features & highlights</Eyebrow>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((b, k) => (
          <li key={k} className="pf-card flex gap-4 p-5 md:p-6">
            <span className="font-pf-mono text-xs text-primary">{String(k + 1).padStart(2, "0")}</span>
            <span className="text-sm leading-relaxed md:text-base">{b}</span>
          </li>
        ))}
      </ul>
    </Wrap>
  );
};

const Story = ({ p }) => {
  const parts = [["Challenges", p.challenges, "challenges"], ["Results", p.results, "results"]].filter(([, v]) => v);
  if (!parts.length) return null;
  return (
    <Wrap className="mt-16 md:mt-24" testid="app-detail-story">
      <div className={cn("grid gap-4", parts.length > 1 && "md:grid-cols-2")}>
        {parts.map(([label, text, key]) => (
          <div key={key} className="pf-card p-6 md:p-8" data-testid={`app-detail-${key}`}>
            <Eyebrow>{label}</Eyebrow>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85 md:text-base">{text}</p>
          </div>
        ))}
      </div>
    </Wrap>
  );
};

const Neighbour = ({ p, dir }) => (
  <Link to={`/portfolio/work/${p.id}`} data-testid={`app-detail-${dir}-link`}
    className={cn("pf-card group flex items-center gap-4 p-5 transition-transform duration-300 hover:-translate-y-1 md:p-6", dir === "next" && "sm:flex-row-reverse sm:text-right")}>
    {dir === "prev" ? <ArrowLeft className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:-translate-x-1" /> : <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />}
    {p.icon && <img src={fileUrl(p.icon)} alt="" className="h-12 w-12 shrink-0 rounded-[22%]" />}
    <div className="min-w-0">
      <p className="font-pf-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{dir === "prev" ? "Previous app" : "Next app"}</p>
      <p className="truncate font-pf-heading text-xl font-bold tracking-tight">{p.title}</p>
    </div>
  </Link>
);

const Pager = ({ p, projects }) => {
  const i = projects.findIndex((x) => x.id === p.id);
  if (projects.length < 2 || i < 0) return null;
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const next = projects[(i + 1) % projects.length];
  return (
    <Wrap className="mt-16 pb-[var(--section-space)] md:mt-24" testid="app-detail-pager">
      <div className="grid gap-4 sm:grid-cols-2"><Neighbour p={prev} dir="prev" /><Neighbour p={next} dir="next" /></div>
    </Wrap>
  );
};

export const AppDetail = ({ project: p, projects }) => {
  const { data } = useSite();
  const slug = arr(data?.sections).find((s) => s.type === "projects")?.slug || "projects";
  const backTo = `/portfolio#${slug}`;
  if (!p) return (
    <Wrap className="pb-24 pt-36" testid="app-detail-missing">
      <h1 className="font-pf-heading text-4xl font-bold tracking-tight">This app isn't available.</h1>
      <Link to={backTo} className="mt-6 inline-flex items-center gap-2 text-primary" data-testid="app-detail-missing-back"><ArrowLeft className="h-4 w-4" /> Back to all work</Link>
    </Wrap>
  );
  return (
    <article data-testid={`app-detail-${p.id}`}>
      <Header p={p} backTo={backTo} />
      <Gallery p={p} />
      <Facts p={p} job={findJob(p, arr(data?.experiences))} />
      <Features p={p} />
      <Story p={p} />
      <Pager p={p} projects={projects} />
    </article>
  );
};
