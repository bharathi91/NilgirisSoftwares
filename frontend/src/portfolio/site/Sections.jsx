import { Mail, MapPin, Phone } from "lucide-react";
import { useSite } from "@/portfolio/lib/site-context";
import { Icon } from "@/portfolio/lib/icons";
import { fileUrl } from "@/portfolio/lib/api";
import { ButtonGroup } from "./DynamicButton";
import { Chip, Reveal, Rich, SectionShell } from "./Shell";

const list = (v) => (Array.isArray(v) ? v : []);

export const About = ({ section }) => {
  const p = useSite().data?.profile || {};
  const facts = [[MapPin, p.location], [Mail, p.email], [Phone, p.phone]].filter(([, v]) => v);
  return (
    <SectionShell section={section}>
      <div className="grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-8">
          {list(p.summary_points).length > 0 ? (
            <ul className="border-t border-foreground/10" data-testid="about-summary-points">
              {p.summary_points.map((pt, i) => (
                <li key={i} className="group flex items-start gap-4 border-b border-foreground/10 py-5" data-testid={`about-point-${i}`}>
                  <span className="mt-[0.6em] h-2 w-2 shrink-0 rounded-full bg-primary transition-transform duration-500 group-hover:scale-150" />
                  <span className="font-pf-heading text-lg font-medium leading-[1.4] tracking-[-0.01em] transition-transform duration-500 group-hover:translate-x-1 md:text-[1.4rem]">{pt}</span>
                </li>
              ))}
            </ul>
          ) : p.summary && <p className="font-pf-heading text-2xl font-medium leading-[1.3] tracking-[-0.015em] md:text-[1.85rem]" data-testid="about-summary">{p.summary}</p>}
          <Rich html={p.about} className="mt-8 text-base text-muted-foreground md:text-lg" testid="about-rich" />
          <ButtonGroup placement="summary" className="mt-10" testid="summary-buttons" />
        </Reveal>
        <Reveal delay={0.15} className="space-y-8 lg:col-span-4">
          {p.photo && (
            <div className="relative overflow-hidden rounded-[var(--radius)]" data-testid="about-photo">
              <img src={fileUrl(p.photo)} alt={p.name} className="aspect-[4/5] w-full object-cover object-top transition-transform duration-[1.2s] ease-out hover:scale-[1.03]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 text-white">
                <p className="font-pf-heading text-lg font-bold">{p.name}</p>
              </div>
            </div>
          )}
          {facts.length > 0 && (
            <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
              {facts.map(([I, v]) => <li key={v} className="flex items-center gap-3 py-4 text-sm"><I className="h-4 w-4 text-primary" />{v}</li>)}
            </ul>
          )}
          {list(p.interests).length > 0 && (
            <div><p className="mb-3 font-pf-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Interests</p>
              <div className="flex flex-wrap gap-2">{p.interests.map((t) => <Chip key={t}>{t}</Chip>)}</div></div>
          )}
        </Reveal>
      </div>
    </SectionShell>
  );
};

export const Skills = ({ section }) => {
  const groups = list(useSite().data?.skills);
  return (
    <SectionShell section={section}>
      <div className="grid gap-5 md:grid-cols-2">
        {groups.map((g, i) => (
          <Reveal key={g.id} delay={(i % 2) * 0.1}>
            <div className="pf-card group h-full p-7 md:p-10" data-testid={`skill-group-${g.id}`}>
              <div className="mb-8 flex items-start justify-between">
                <span className="font-pf-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                {g.icon && <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-500 group-hover:rotate-12"><Icon name={g.icon} className="h-5 w-5" /></span>}
              </div>
              <h3 className="font-pf-heading text-2xl font-bold tracking-tight md:text-3xl">{g.title}</h3>
              {g.description && <p className="mt-3 text-sm text-muted-foreground">{g.description}</p>}
              <div className="mt-6 flex flex-wrap gap-2">{list(g.items).map((s) => <Chip key={s}>{s}</Chip>)}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
};

export const Education = ({ section }) => {
  const items = list(useSite().data?.education);
  return (
    <SectionShell section={section}>
      <div className="border-t border-foreground/10">
        {items.map((e) => (
          <Reveal key={e.id}>
            <div className="grid gap-3 border-b border-foreground/10 py-8 md:grid-cols-12 md:py-10" data-testid={`education-${e.id}`}>
              <p className="font-pf-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:col-span-3">{[e.start, e.end].filter(Boolean).join(" — ")}</p>
              <div className="md:col-span-9">
                <h3 className="font-pf-heading text-2xl font-bold tracking-tight md:text-4xl">{e.institution}</h3>
                <p className="mt-2 text-base text-foreground/80">{[e.degree, e.field].filter(Boolean).join(", ")}{e.location ? ` · ${e.location}` : ""}</p>
                {e.description && <p className="mt-3 text-sm text-muted-foreground">{e.description}</p>}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
};

export const Certifications = ({ section }) => {
  const items = list(useSite().data?.certifications);
  return (
    <SectionShell section={section}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Reveal key={c.id}>
            <a href={c.url || undefined} target="_blank" rel="noopener noreferrer" className="pf-card block h-full p-7" data-testid={`cert-${c.id}`}>
              {c.image && <img src={fileUrl(c.image)} alt="" className="mb-6 h-12 w-12 object-contain" />}
              <h3 className="font-pf-heading text-xl font-bold tracking-tight">{c.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{[c.issuer, c.date].filter(Boolean).join(" · ")}</p>
              {c.credential_id && <p className="mt-4 font-pf-mono text-xs text-muted-foreground">ID {c.credential_id}</p>}
            </a>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
};

const BENTO = ["lg:col-span-2 lg:row-span-2", "lg:col-span-2", "lg:col-span-1", "lg:col-span-1"];

export const Achievements = ({ section }) => {
  const items = list(useSite().data?.achievements);
  return (
    <SectionShell section={section}>
      <div className="grid auto-rows-[minmax(220px,auto)] grid-flow-dense gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((a, i) => {
          const hero = i % 4 === 0;
          return (
            <Reveal key={a.id} delay={(i % 4) * 0.08} className={BENTO[i % 4]}>
              <div className={`flex h-full flex-col justify-between rounded-[var(--radius)] p-7 md:p-9 ${hero ? "bg-primary text-primary-foreground" : "pf-card"}`} data-testid={`achievement-${a.id}`}>
                <div className="flex items-start justify-between gap-4">
                  {a.metric ? <span className={`font-pf-heading font-extrabold leading-none tracking-[-0.05em] ${hero ? "text-7xl md:text-9xl" : "text-5xl md:text-6xl"}`}>{a.metric}</span>
                    : <Icon name={a.icon || "Award"} className={hero ? "h-12 w-12" : "h-9 w-9 text-primary"} />}
                  {a.metric && a.icon && <Icon name={a.icon} className={`h-6 w-6 ${hero ? "" : "text-primary"}`} />}
                </div>
                <div className="mt-8">
                  <h3 className={`font-pf-heading font-bold tracking-tight ${hero ? "text-2xl md:text-3xl" : "text-xl"}`}>{a.title}</h3>
                  {a.description && <p className={`mt-3 text-sm leading-relaxed ${hero ? "opacity-90" : "text-muted-foreground"}`}>{a.description}</p>}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
};

export const Additional = ({ section }) => {
  const p = useSite().data?.profile || {};
  return (
    <SectionShell section={section}>
      <Reveal><Rich html={p.additional_info} className="max-w-3xl text-base md:text-lg" testid="additional-info" /></Reveal>
    </SectionShell>
  );
};

export const QuickLinks = ({ section }) => (
  <SectionShell section={section}>
    <Reveal><div className="pf-card p-8 md:p-14"><ButtonGroup placement="quicklinks" testid="quicklinks-buttons" /></div></Reveal>
  </SectionShell>
);
