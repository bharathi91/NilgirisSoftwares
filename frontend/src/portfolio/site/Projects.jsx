import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowUpRight, Expand, Github } from "lucide-react";
import { useSite } from "@/portfolio/lib/site-context";
import { fileUrl } from "@/portfolio/lib/api";
import { cn } from "@/lib/utils";
import { ButtonGroup } from "./DynamicButton";
import { Lightbox } from "./Lightbox";
import { Reveal, SectionShell } from "./Shell";

const Shots = ({ p }) => {
  const all = p.screenshots || [];
  const shots = all.slice(0, p.featured ? 3 : 2);
  const [open, setOpen] = useState(null);
  return (
    <div className="absolute inset-0">
      <div className="absolute -left-10 -top-10 h-56 w-56 rounded-full bg-primary/25 blur-3xl transition-transform duration-700 group-hover:scale-125" />
      {p.icon && <img src={fileUrl(p.icon)} alt={`${p.title} app icon`} loading="lazy" className="absolute left-5 top-5 z-10 h-14 w-14 rounded-[22%] shadow-lg ring-1 ring-black/5 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 md:h-16 md:w-16" data-testid={`project-icon-${p.id}`} />}
      <span className="absolute bottom-4 left-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 font-pf-mono text-[10px] uppercase tracking-[0.15em] text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity duration-300 group-hover:opacity-100"><Expand className="h-3 w-3" /> View {all.length}</span>
      <div className="absolute inset-y-0 right-4 flex items-start gap-3 pt-8 md:right-6">
        {shots.map((s, k) => (
          <button type="button" key={k} onClick={() => setOpen(k)} aria-label={`Open ${p.title} screenshot ${k + 1}`} data-testid={`project-shot-${p.id}-${k}`} style={{ transitionDelay: `${k * 70}ms` }}
            className={cn("w-[96px] shrink-0 cursor-zoom-in overflow-hidden rounded-[1.1rem] border-[3px] border-foreground bg-muted shadow-xl transition-transform duration-700 ease-out group-hover:-translate-y-3 md:w-[118px]", k % 2 ? "mt-10" : "")}>
            <img src={fileUrl(s)} alt={`${p.title} screenshot ${k + 1}`} loading="lazy" className="aspect-[9/19.5] w-full rounded-[0.85rem] object-cover object-top" />
          </button>
        ))}
      </div>
      <div onClick={(e) => e.stopPropagation()}><AnimatePresence>{open !== null && <Lightbox images={all} start={open} title={p.title} onClose={() => setOpen(null)} />}</AnimatePresence></div>
    </div>
  );
};

export const GithubMark = () => (
  <svg viewBox="0 0 16 16" className="h-24 w-24 text-foreground transition-transform duration-700 group-hover:-translate-y-2 group-hover:rotate-[-6deg] md:h-28 md:w-28" fill="currentColor" role="img" aria-label="GitHub" data-testid="project-github-logo">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const Visual = ({ p, i }) => (
  <div className="relative h-56 overflow-hidden rounded-[calc(var(--radius)*0.75)] bg-secondary md:h-64">
    {(p.screenshots || []).length > 0 ? <Shots p={p} /> : p.image ? (
      <img src={fileUrl(p.image)} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105" />
    ) : (
      <div className="absolute inset-0 flex items-end justify-between p-6">
        {p.icon ? <img src={fileUrl(p.icon)} alt={`${p.title} app icon`} className="h-20 w-20 rounded-[22%] shadow-lg" />
          : <GithubMark />}
        <span className="font-pf-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-2xl transition-transform duration-700 group-hover:scale-125" />
      </div>
    )}
  </div>
);

const Card = ({ p, i }) => {
  const nav = useNavigate();
  const { preview } = useSite();
  const to = `/portfolio/work/${p.id}`;
  const open = (e) => { if (!preview && !e.target.closest("a,button")) nav(to); };
  return (
  <Reveal delay={(i % 3) * 0.08} className={cn(p.featured && "lg:col-span-2")}>
    <article id={`project-${p.id}`} onClick={open} className="pf-card pf-project-card group flex h-full scroll-mt-24 cursor-pointer flex-col p-3" data-testid={`project-${p.id}`}>
      <Visual p={p} i={i} />
      <div className="flex flex-1 flex-col p-4 md:p-5">
        {p.category && <p className="font-pf-mono text-[11px] uppercase tracking-[0.2em] text-primary">{p.category}</p>}
        <h3 className="mt-2 font-pf-heading text-2xl font-bold tracking-tight md:text-3xl">{p.title}</h3>
        {p.description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
        {(p.bullets || []).length > 0 && <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-muted-foreground">{p.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>}
        {(p.tags || []).length > 0 && <p className="mt-4 font-pf-mono text-xs text-foreground/70">{p.tags.join(" / ")}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
          <Link to={to} onClick={preview ? (e) => e.preventDefault() : undefined} data-testid={`project-details-${p.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-4 py-2 text-sm font-medium transition-colors duration-300 hover:border-primary hover:text-primary">
            View details <ArrowRight className="h-4 w-4" />
          </Link>
          {p.link && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" data-testid={`project-link-${p.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors duration-300 hover:bg-primary hover:text-primary-foreground">
              {p.link_label || "View"} <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
          {p.repo && <a href={p.repo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm hover:text-primary" data-testid={`project-repo-${p.id}`}><Github className="h-4 w-4" /> Code</a>}
          <ButtonGroup placement="projects" testid={`project-buttons-${p.id}`} />
        </div>
      </div>
    </article>
  </Reveal>
  );
};

export const Projects = ({ section }) => {
  const items = useSite().data?.projects;
  return (
    <SectionShell section={section}>
      <div className="grid grid-flow-dense gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(Array.isArray(items) ? items : []).map((p, i) => <Card key={p.id} p={p} i={i} />)}
      </div>
    </SectionShell>
  );
};
