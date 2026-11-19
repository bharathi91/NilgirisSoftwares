import { useState } from "react";
import { toast } from "sonner";
import { ArrowUp, Loader2, Lock, Send } from "lucide-react";
import { api, errMsg, resolveHref } from "@/portfolio/lib/api";
import { useSite } from "@/portfolio/lib/site-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ButtonGroup } from "./DynamicButton";
import { Logo } from "./Logo";
import { Reveal, SectionShell } from "./Shell";

const EMPTY = { name: "", email: "", subject: "", message: "" };

const ContactForm = () => {
  const { preview } = useSite();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (preview) return toast.info("Form is disabled in preview mode");
    setBusy(true);
    try { await api.post("/public/portfolio/contact", f); toast.success("Message sent. Thank you!"); setF(EMPTY); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };
  const cls = "h-12 rounded-none border-0 border-b border-foreground/20 bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0";
  return (
    <form onSubmit={submit} className="pf-card space-y-6 p-7 md:p-10" data-testid="contact-form">
      <div className="grid gap-6 sm:grid-cols-2">
        <Input required maxLength={120} placeholder="Your name" value={f.name} onChange={set("name")} className={cls} data-testid="contact-name-input" />
        <Input required type="email" maxLength={200} placeholder="Email address" value={f.email} onChange={set("email")} className={cls} data-testid="contact-email-input" />
      </div>
      <Input maxLength={200} placeholder="Subject" value={f.subject} onChange={set("subject")} className={cls} data-testid="contact-subject-input" />
      <Textarea required maxLength={5000} rows={5} placeholder="Tell me about your project" value={f.message} onChange={set("message")} className={`${cls} h-auto resize-none`} data-testid="contact-message-input" />
      <button type="submit" disabled={busy} data-testid="contact-submit-btn"
        className="inline-flex h-12 items-center gap-2 rounded-[var(--btn-radius)] bg-primary px-7 font-medium text-primary-foreground transition-[filter,transform] duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send message
      </button>
    </form>
  );
};

export const Contact = ({ section }) => {
  const p = useSite().data?.profile || {};
  return (
    <SectionShell section={section}>
      <div className="grid gap-12 lg:grid-cols-12">
        <Reveal className="space-y-8 lg:col-span-5">
          {p.email && <a href={`mailto:${p.email}`} className="block break-all font-pf-heading text-2xl font-bold tracking-tight underline decoration-primary decoration-2 underline-offset-8 hover:text-primary md:text-3xl" data-testid="contact-email-link">{p.email}</a>}
          {p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="block font-pf-mono text-sm tracking-wider text-foreground/80 hover:text-primary" data-testid="contact-phone-link">{p.phone}</a>}
          {p.location && <p className="text-sm text-muted-foreground">{p.location}</p>}
          <ButtonGroup placement="contact" testid="contact-buttons" />
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7"><ContactForm /></Reveal>
      </div>
    </SectionShell>
  );
};

export const Footer = () => {
  const { data } = useSite();
  const nav = Array.isArray(data?.nav_items) ? data.nav_items : [];
  const name = data?.profile?.name || data?.site?.brand || "";
  return (
    <footer className="relative overflow-hidden border-t border-foreground/10 px-5 pb-10 pt-16 md:px-10" data-testid="site-footer">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {nav.map((i) => <a key={i.id} href={resolveHref(i.href)} className="text-sm text-foreground/70 hover:text-foreground" data-testid={`footer-nav-${i.id}`}>{i.label}</a>)}
          </div>
          <ButtonGroup placement="footer" testid="footer-buttons" />
        </div>
        <p className="mt-14 select-none whitespace-nowrap font-pf-heading text-[clamp(2rem,8.4vw,8.5rem)] font-extrabold leading-[0.85] tracking-[-0.05em] text-foreground" data-testid="footer-wordmark">{name}</p>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-foreground/10 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><Logo className="h-6 w-6" testid="footer-logo" /><span>© {new Date().getFullYear()} {name}. {data?.site?.footer_text}</span></div>
          <div className="flex items-center gap-5">
            <a href="/admin/login" className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-3 py-1.5 font-pf-mono uppercase tracking-[0.2em] text-foreground/80 hover:border-foreground hover:text-foreground" data-testid="footer-admin-link"><Lock className="h-3 w-3" /> Admin login</a>
            <a href="#top" className="inline-flex items-center gap-2 font-pf-mono uppercase tracking-[0.2em] hover:text-foreground" data-testid="back-to-top-link"><ArrowUp className="h-3.5 w-3.5" /> Back to top</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
