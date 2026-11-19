import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { useSite } from "@/portfolio/lib/site-context";
import { Chip, Reveal, SectionShell } from "./Shell";

const Row = ({ e, i }) => {
  const [open, setOpen] = useState(false);
  const bullets = Array.isArray(e.bullets) ? e.bullets : [];
  const shown = open ? bullets : bullets.slice(0, 2);
  return (
    <Reveal>
      <article className="group grid gap-4 border-b border-foreground/10 py-10 transition-colors duration-500 md:grid-cols-12 md:py-14" data-testid={`experience-${e.id}`}>
        <div className="md:col-span-3">
          <p className="font-pf-mono text-xs uppercase tracking-[0.2em] text-primary">{[e.start, e.end].filter(Boolean).join(" — ")}</p>
          {e.location && <p className="mt-2 font-pf-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{e.location}</p>}
          <p className="mt-6 hidden font-pf-heading text-7xl font-extrabold text-foreground/[0.07] md:block">{String(i + 1).padStart(2, "0")}</p>
        </div>
        <div className="md:col-span-9">
          <h3 className="font-pf-heading text-2xl font-bold tracking-tight transition-transform duration-500 group-hover:translate-x-2 md:text-4xl">{e.role}</h3>
          <p className="mt-2 text-base text-foreground/80 md:text-lg">
            {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline decoration-primary underline-offset-4">{e.company}</a> : e.company}
            {e.summary && <span className="font-pf-serif-accent italic text-primary"> — {e.summary}</span>}
          </p>
          {shown.length > 0 && (
            <ul className="mt-6 space-y-3">
              {shown.map((b, k) => (
                <motion.li key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  <span className="mt-2.5 h-1 w-3 shrink-0 bg-primary" />{b}
                </motion.li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {(e.tags || []).map((t) => <Chip key={t}>{t}</Chip>)}
            {bullets.length > 2 && (
              <button onClick={() => setOpen((o) => !o)} data-testid={`experience-toggle-${e.id}`}
                className="ml-auto inline-flex items-center gap-1.5 font-pf-mono text-xs uppercase tracking-[0.2em] text-foreground hover:text-primary">
                {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{open ? "Less" : `${bullets.length - 2} more`}
              </button>
            )}
          </div>
        </div>
      </article>
    </Reveal>
  );
};

export const Experience = ({ section }) => {
  const items = useSite().data?.experiences;
  return (
    <SectionShell section={section}>
      <div className="border-t border-foreground/10">
        {(Array.isArray(items) ? items : []).map((e, i) => <Row key={e.id} e={e} i={i} />)}
      </div>
    </SectionShell>
  );
};
