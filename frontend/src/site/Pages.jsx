import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import { useAuth } from "@clerk/react";
import { API, mediaUrl } from "../lib/api";
import { SiteProvider, ThemeStyle, useSite } from "./SiteContext";
import { SiteShell, useSeo } from "./Layout";
import { Sections, Img, SmartLink } from "./Sections";
import { useT } from "../lib/i18n";
import { toast } from "sonner";

const norm = (p) => (p === "/" ? "/" : p.replace(/^\/+|\/+$/g, ""));

function NotFound() {
  useSeo(null, { title: "Page not found", noindex: true });
  return <section className="sec"><div className="wrap py-40 text-center" style={{ maxWidth: "var(--container)" }} data-testid="not-found">
    <p className="eyebrow">404</p><h1 className="h-title" style={{ "--title-size": "48px" }}>This page wandered into the mist.</h1>
    <SmartLink href="/" className="btn-primary mt-8">Back home</SmartLink></div></section>;
}

export function DynamicPage({ path }) {
  const { site, preview } = useSite();
  const loc = useLocation(), navigate = useNavigate();
  const cur = path ?? loc.pathname;
  const slug = norm(cur);
  const page = site?.pages.find((p) => norm(p.slug) === slug);
  const redirect = !preview && site?.redirects?.find((r) => r.from && norm(r.from) === slug);
  useEffect(() => {
    if (!redirect) return;
    if (/^https?:/.test(redirect.to)) window.location.replace(redirect.to); else navigate(redirect.to, { replace: true });
  }, [redirect, navigate]);
  useEffect(() => { if (!preview) window.scrollTo(0, 0); }, [slug, preview]);
  useSeo(page);
  if (!site || redirect) return null;
  if (!page) return <NotFound />;
  return <Sections sections={page.sections} />;
}

function Legal({ kind }) {
  const { site } = useSite();
  useSeo(null, { title: kind === "privacy" ? "Privacy Policy" : "Terms & Conditions" });
  const text = kind === "privacy" ? site.settings.privacyPolicy : site.settings.terms;
  return <section className="sec"><div className="wrap py-32" style={{ maxWidth: "860px" }} data-testid={`legal-${kind}`}>
    <h1 className="h-title" style={{ "--title-size": "44px" }}>{kind === "privacy" ? "Privacy Policy" : "Terms & Conditions"}</h1>
    <div className="body-text mt-8 whitespace-pre-line">{text}</div></div></section>;
}

function BlogPost() {
  const params = useParams(), loc = useLocation();
  const slug = params.slug || decodeURIComponent(loc.pathname.replace(/^\/blog\//, "").replace(/\/+$/, ""));
  const [p, setP] = useState(null), [err, setErr] = useState(false);
  useEffect(() => { axios.get(`${API}/public/blog/${slug}`).then((r) => setP(r.data)).catch(() => setErr(true)); }, [slug]);
  useSeo(null, p ? { title: p.seo?.title || p.title, description: p.seo?.description || p.excerpt, ogImage: p.seo?.ogImage || p.cover,
    jsonld: JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, datePublished: p.publish_at, author: { "@type": "Person", name: p.author?.name } }) } : null);
  if (err) return <NotFound />;
  if (!p) return <div className="py-40" />;
  return <article className="sec"><div className="wrap py-28" style={{ maxWidth: "860px" }} data-testid="blog-post">
    <SmartLink href="/blog" className="link-arrow">← All articles</SmartLink>
    <p className="eyebrow mt-8">{p.category}</p><h1 className="h-title" style={{ "--title-size": "clamp(32px,5vw,52px)" }} data-testid="blog-post-title">{p.title}</h1>
    <p className="muted mt-4">{p.author?.name && `${p.author.name} · `}{new Date(p.publish_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
    {p.cover && <div className="media-frame aspect-video mt-10"><Img src={p.cover} eager className="w-full h-full object-cover" /></div>}
    {p.video && <video src={mediaUrl(p.video)} controls preload="metadata" className="w-full rounded-2xl mt-8" />}
    <div className="prose-site mt-10" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(p.content) }} />
    {!!p.tags?.length && <div className="flex flex-wrap gap-2 mt-10">{p.tags.map((t) => <span key={t} className="chip">#{t}</span>)}</div>}
    {p.author?.bio && <div className="card mt-12 flex gap-5 items-center">{p.author.avatar && <img src={mediaUrl(p.author.avatar, 480)} alt="" className="w-16 h-16 rounded-full object-cover" />}<div><p className="card-title">{p.author.name}</p><p className="muted text-sm mt-1">{p.author.bio}</p></div></div>}
  </div></article>;
}

const CLS = { company: "Company project", founder_experience: "Founder's previous professional experience", personal: "Personal project", demo: "Demonstration project" };

function CaseStudy() {
  const { site } = useSite();
  const t = useT();
  const loc = useLocation();
  const slug = decodeURIComponent(loc.pathname.replace(/^\/projects\//, "").replace(/\/$/, ""));
  const p = site.projects.find((x) => x.slug === slug && x.visible !== false);
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  useSeo(null, p ? { title: `${p.name} — Case study`, description: p.summary || p.description, ogImage: p.cover || p.screenshots?.[0],
    jsonld: JSON.stringify({ "@context": "https://schema.org", "@type": "CreativeWork", name: p.name, about: p.category, description: p.description }) } : { title: "Not found", noindex: true });
  if (!p) return <NotFound />;
  const H = ({ children }) => <h2 className="h-title mt-14" style={{ "--title-size": "28px" }}>{children}</h2>;
  return <article className="sec" data-testid="case-study"><div className="wrap py-28" style={{ maxWidth: "1080px" }}>
    <SmartLink href="/projects" className="link-arrow" testid="case-study-back">{t("← All projects")}</SmartLink>
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 mt-8 items-center">
      <div><span className={`badge cls-${p.classification}`} data-testid="case-study-classification">{t(CLS[p.classification])}</span>
        <h1 className="h-title mt-4" style={{ "--title-size": "clamp(36px,5vw,60px)" }} data-testid="case-study-title">{p.name}</h1>
        <p className="muted mt-3">{p.category} · {p.platform}</p><p className="lead mt-5">{p.summary || p.description}</p>
        {p.link && <SmartLink href={p.link} className="btn-primary mt-8" testid="case-study-link">Visit project ↗</SmartLink>}</div>
      {(p.cover || p.screenshots?.[0]) && <figure><div className="media-frame"><div className="proj-thumb relative h-full"><span className="thumb-blur" style={{ backgroundImage: `url(${mediaUrl(p.cover || p.screenshots[0], 480)})` }} /><Img src={p.cover || p.screenshots[0]} alt={p.name} eager className="relative w-full h-full object-contain" /></div></div>
        {p.coverIllustrative && <figcaption className="muted text-xs mt-2">{t("Illustrative image")}</figcaption>}</figure>}
    </div>
    {!!p.results?.length && <div className="grid-cols-var mt-14" style={{ "--cols": Math.min(4, p.results.length) }} data-testid="case-study-results">{p.results.map((r, i) =>
      <div key={i} className="card"><div className="stat-v">{r.value}</div><p className="muted mt-1">{r.label}</p></div>)}</div>}
    {p.challenge && <><H>{t("The challenge")}</H><p className="body-text mt-4 whitespace-pre-line">{p.challenge}</p></>}
    {p.solution && <><H>{t("Our approach")}</H><p className="body-text mt-4 whitespace-pre-line">{p.solution}</p></>}
    {p.contribution && <><H>{t(p.classification === "company" ? "What we delivered" : "Role & contribution")}</H><p className="body-text mt-4">{p.contribution}</p></>}
    {!!p.features?.length && <><H>{t("Key features")}</H><ul className="grid md:grid-cols-2 gap-3 mt-5">{p.features.map((f) => <li key={f} className="card !p-4">{f}</li>)}</ul></>}
    {p.story && <div className="prose-site mt-12" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(p.story) }} />}
    {!!p.tech?.length && <><H>{t("Technology")}</H><div className="flex flex-wrap gap-2 mt-5">{p.tech.map((t) => <span key={t} className="chip">{t}</span>)}</div></>}
    {!!p.screenshots?.length && <><H>{t("Screenshots")}</H><div className="flex gap-4 overflow-x-auto snap-x mt-6 pb-4" data-testid="case-study-screenshots">{p.screenshots.map((u) => <Img key={u} src={u} alt={`${p.name} screenshot`} className="h-[420px] w-auto rounded-2xl snap-start border" />)}</div></>}
    <div className="cta-box mt-20"><h2 className="h-title" style={{ "--title-size": "32px" }}>{t("Planning something similar?")}</h2><SmartLink href="/contact" className="btn-primary mt-6">{t("Start your project")}</SmartLink></div>
  </div></article>;
}

function ShareFeedback() {
  const t = useT();
  const [done, setDone] = useState(false), [busy, setBusy] = useState(false);
  useSeo(null, { title: "Share your experience", noindex: true });
  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try { await axios.post(`${API}/public/testimonials`, { ...f, consent: !!f.consent }); setDone(true); }
    catch (err) { toast.error(err?.response?.data?.detail || "Could not submit"); } finally { setBusy(false); }
  };
  return <section className="sec"><div className="wrap py-28" style={{ maxWidth: "720px" }} data-testid="share-feedback-page">
    <p className="eyebrow">Testimonial</p><h1 className="h-title" style={{ "--title-size": "clamp(32px,5vw,48px)" }}>{t("Share your experience")}</h1>
    {done ? <div className="card mt-8" data-testid="feedback-success">{t("Thank you! Your testimonial will appear once reviewed.")}</div> :
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4 mt-8" data-testid="feedback-form">
      <label><span className="form-label">{t("Your name *")}</span><input name="name" required className="input-site" data-testid="feedback-name" /></label>
      <label><span className="form-label">{t("Email *")}</span><input name="email" type="email" required className="input-site" data-testid="feedback-email" /></label>
      <label><span className="form-label">{t("Your role")}</span><input name="role" className="input-site" data-testid="feedback-role" /></label>
      <label><span className="form-label">{t("Organisation")}</span><input name="company" className="input-site" data-testid="feedback-company" /></label>
      <label className="md:col-span-2"><span className="form-label">{t("Your feedback *")}</span><textarea name="quote" required minLength={10} rows={5} className="input-site" data-testid="feedback-quote" /></label>
      <label className="md:col-span-2 flex gap-3 items-start text-sm muted"><input type="checkbox" name="consent" required className="mt-1" data-testid="feedback-consent" />{t("I allow The Nilgiris Softwares to publish this testimonial with my name, role and organisation.")}</label>
      <button disabled={busy} className="btn-primary md:col-span-2 justify-center" data-testid="feedback-submit">{t("Submit testimonial")}</button>
    </form>}</div></section>;
}

export function PublicSite() {
  const loc = useLocation();
  let body;
  if (loc.pathname.startsWith("/projects/") && loc.pathname.length > 10) body = <CaseStudy />;
  else if (loc.pathname.startsWith("/blog/")) body = <BlogPost />;
  else if (loc.pathname === "/share-feedback") body = <ShareFeedback />;
  else if (loc.pathname === "/privacy") body = <Legal kind="privacy" />;
  else if (loc.pathname === "/terms") body = <Legal kind="terms" />;
  else body = <DynamicPage />;
  return <SiteProvider><ThemeStyle /><SiteShell>{body}</SiteShell></SiteProvider>;
}

function PreviewInner() {
  const { site, post } = useSite();
  const loc = useLocation();
  const path = "/" + loc.pathname.replace(/^\/preview\/?/, "");
  useEffect(() => {
    const onMsg = (e) => { if (e.origin === window.location.origin && e.data?.type === "scrollTo") document.getElementById(`s-${e.data.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); };
    window.addEventListener("message", onMsg); return () => window.removeEventListener("message", onMsg);
  }, []);
  useEffect(() => { post({ type: "preview-path", path }); }, [path]); // eslint-disable-line
  if (!site) return <div className="p-10 text-center" style={{ color: "#94A3B0" }}>Loading preview…</div>;
  return <SiteShell><div className="preview-banner" data-testid="preview-banner">Draft preview — not visible to visitors</div><DynamicPage path={path} /></SiteShell>;
}

export function PreviewSite() {
  const { getToken } = useAuth();
  const loadDraft = useCallback(async () => {
    const r = await axios.get(`${API}/admin/draft`, { headers: { Authorization: `Bearer ${await getToken()}` } });
    return r.data.data;
  }, [getToken]);
  return <SiteProvider preview loadDraft={loadDraft}><ThemeStyle /><PreviewInner /></SiteProvider>;
}
