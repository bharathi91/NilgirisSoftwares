import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Globe, Linkedin, Github, Mail, MapPin, Phone, Printer } from "lucide-react";
import { getPortfolio, BACKEND, track } from "@/portfolio/lib/api";
import { Loader } from "@/portfolio/site/Loader";
import { Logo } from "@/portfolio/site/Logo";

const arr = (v) => (Array.isArray(v) ? v : []);
const H = ({ children }) => <h2 className="mb-2 mt-5 border-b border-black/15 pb-1 font-pf-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#E8492A]">{children}</h2>;
const clean = (u = "") => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

const Contact = ({ p }) => {
  const items = [[Mail, p.email, p.email && `mailto:${p.email}`], [Phone, p.phone, p.phone && `tel:${p.phone.replace(/\s/g, "")}`], [MapPin, p.location], [Linkedin, clean(p.linkedin), p.linkedin], [Github, clean(p.github), p.github], [Globe, clean(p.website), p.website]].filter(([, v]) => v);
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-black/75">
      {items.map(([I, v, href]) => <a key={v} href={href || undefined} className="inline-flex items-center gap-1.5 hover:text-[#E8492A]"><I className="h-3 w-3" />{v}</a>)}
    </div>
  );
};

const Experience = ({ items, bullets = 1, jobs = 4 }) => (
  <div className="space-y-1.5">
    {items.map((e, idx) => (
      <div key={e.id} className="break-inside-avoid">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12.5px] font-bold">{e.role} <span className="font-normal text-black/70">· {e.company}{e.summary ? ` — ${e.summary}` : ""}</span></p>
          <p className="shrink-0 font-pf-mono text-[10px] text-black/60">{[e.start, e.end].filter(Boolean).join(" – ")}</p>
        </div>
        {idx < jobs && bullets > 0 && arr(e.bullets).length > 0 && <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-black/75">{e.bullets.slice(0, bullets).map((b, k) => <li key={k}>{b}</li>)}</ul>}
      </div>
    ))}
  </div>
);

export default function QuickView() {
  const [d, setD] = useState(null);
  useEffect(() => { getPortfolio().then((r) => setD(r.data || {})).catch(() => setD({})); track("quick_view", "page"); }, []);
  useEffect(() => { if (d?.profile?.name) document.title = `${d.profile.name} — Quick View`; }, [d]);
  if (!d) return <Loader label="Preparing summary" />;
  const p = d.profile || {};
  const s = d.site || {};
  const on = (k) => s[k] !== false;
  const jobs = arr(d.experiences).filter((e) => e.in_quick_view !== false);
  const points = arr(p.summary_points).length ? p.summary_points : [p.summary].filter(Boolean);
  return (
    <div className="pf-qv-page min-h-screen bg-[#E9E5DC] py-8 font-pf-body text-[#15130F] print:bg-white print:py-0" data-testid="quick-view-page">
      <div className="pf-no-print mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link to="/portfolio" className="inline-flex items-center gap-2 text-sm text-black/70 hover:text-black" data-testid="quick-view-back-link"><ArrowLeft className="h-4 w-4" /> Back to portfolio</Link>
        <div className="flex gap-2">
          {d.resume?.available && <a href={`${BACKEND}/api/public/portfolio/resume`} className="inline-flex h-10 items-center gap-2 rounded-full border border-black/20 bg-white px-4 text-sm hover:border-black" data-testid="quick-view-resume-btn"><Download className="h-4 w-4" /> Full résumé</a>}
          <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#15130F] px-5 text-sm font-medium text-white hover:bg-[#E8492A]" data-testid="quick-view-print-btn"><Printer className="h-4 w-4" /> Save as PDF / Print</button>
        </div>
      </div>
      <article className="pf-qv-sheet mx-auto max-w-[210mm] bg-white px-[14mm] py-[12mm] shadow-xl print:max-w-none print:px-0 print:py-0 print:shadow-none" data-testid="quick-view-sheet">
        <header className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="font-pf-heading text-[30px] font-extrabold leading-none tracking-[-0.03em]" data-testid="quick-view-name">{p.name}</h1>
            <p className="mt-1.5 text-[12.5px] font-medium text-black/75">{p.headline}</p>
            <Contact p={p} />
          </div>
          {on("qv_photo") && p.photo ? <img src={`${BACKEND}${p.photo}`} alt={p.name} className="h-[72px] w-[60px] rounded-lg object-cover object-top" /> : <Logo className="h-10 w-10" />}
        </header>
        {on("qv_summary") && points.length > 0 && (<><H>Summary</H>
        <ul className="list-disc space-y-0.5 pl-4 text-[11.5px] leading-snug">{points.map((t, i) => <li key={i}>{t}</li>)}</ul></>)}
        {on("qv_skills") && arr(d.skills).length > 0 && (<><H>Skills</H>
        <div className="space-y-1 text-[11.5px]">{arr(d.skills).map((g) => <p key={g.id}><span className="font-bold">{g.title}:</span> <span className="text-black/80">{arr(g.items).join(", ")}</span></p>)}</div></>)}
        {on("qv_experience") && jobs.length > 0 && (<><H>Experience</H>
        <Experience items={jobs} bullets={s.qv_bullets ?? 1} jobs={s.qv_bullet_jobs ?? 4} /></>)}
        {on("qv_achievements") && arr(d.achievements).length > 0 && (<><H>Key Achievements</H>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] leading-snug">{d.achievements.map((a) => <li key={a.id}><span className="font-bold">{a.metric ? `${a.metric} · ` : ""}{a.title}</span> — <span className="text-black/75">{a.description}</span></li>)}</ul></>)}
        {on("qv_projects") && arr(d.projects).length > 0 && (<><H>Selected Work</H>
          <p className="text-[11px] leading-relaxed text-black/80">{d.projects.map((pr, i) => <span key={pr.id}>{i > 0 && " · "}{pr.link ? <a href={pr.link} className="font-semibold text-black underline decoration-black/20">{pr.title}</a> : <b>{pr.title}</b>}{pr.category ? ` (${pr.category})` : ""}</span>)}</p></>)}
        {on("qv_education") && arr(d.education).length > 0 && (<><H>Education</H>
          {d.education.map((e) => <p key={e.id} className="text-[11.5px]"><b>{[e.degree, e.field].filter(Boolean).join(", ")}</b> — {e.institution}{e.end ? `, ${e.end}` : ""}</p>)}</>)}
        {on("qv_certifications") && arr(d.certifications).length > 0 && (<><H>Certifications</H>
          {d.certifications.map((c) => <p key={c.id} className="text-[11.5px]"><b>{c.name}</b>{c.issuer ? ` — ${c.issuer}` : ""}{c.date ? `, ${c.date}` : ""}</p>)}</>)}
        <p className="mt-6 border-t border-black/10 pt-2 text-center font-pf-mono text-[9px] uppercase tracking-[0.2em] text-black/45">{typeof window !== "undefined" ? window.location.host : ""}</p>
      </article>
    </div>
  );
}
