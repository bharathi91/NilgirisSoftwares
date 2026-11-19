import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import { useAuth } from "@clerk/react";
import { API, mediaUrl } from "../lib/api";
import { SiteProvider, ThemeStyle, useSite } from "./SiteContext";
import { SiteShell, useSeo } from "./Layout";
import { Sections, Img, SmartLink } from "./Sections";

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

export function PublicSite() {
  const loc = useLocation();
  let body;
  if (loc.pathname.startsWith("/blog/")) body = <BlogPost />;
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
