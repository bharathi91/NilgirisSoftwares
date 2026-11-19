import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Mail, Phone, MapPin, MessageCircle, Paperclip } from "lucide-react";
import { API, errMsg } from "../lib/api";
import { useSite } from "./SiteContext";
import { useT } from "../lib/i18n";

const BUDGETS = ["Under $2k", "$2k – $5k", "$5k – $15k", "$15k – $50k", "$50k+", "Not sure yet"];
const TIMELINES = ["ASAP", "1–3 months", "3–6 months", "6+ months", "Flexible"];

const F = ({ label, children }) => <label className="block"><span className="form-label">{label}</span>{children}</label>;

export default function ContactForm({ s, Head }) {
  const { site, preview } = useSite();
  const t = useT();
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [file, setFile] = useState(null);
  const c = site.settings.contact;
  const submit = async (e) => {
    e.preventDefault();
    if (preview) return toast.info("Form submissions are disabled in preview");
    const fd = new FormData(e.currentTarget);
    fd.set("consent", fd.get("consent") ? "true" : "false");
    if (file) fd.set("attachment", file);
    setBusy(true);
    try { await axios.post(`${API}/public/leads`, fd); setDone(true); toast.success("Thanks! We'll be in touch shortly."); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (<div className="grid lg:grid-cols-[1fr_360px] gap-12 text-left">
    <div><Head s={s} />
      {done ? <div className="card mt-8" data-testid="contact-success"><h3 className="card-title">{t("Message received")}</h3><p className="muted mt-2">{t("We'll reply within one business day.")}</p></div> :
      <form onSubmit={submit} className="grid md:grid-cols-2 gap-5 mt-8" data-testid="contact-form">
        <F label={t("Name *")}><input name="name" required className="input-site" data-testid="contact-name" /></F>
        <F label={t("Email *")}><input name="email" type="email" required className="input-site" data-testid="contact-email" /></F>
        <F label={t("Phone")}><input name="phone" className="input-site" data-testid="contact-phone" /></F>
        <F label={t("Company")}><input name="company" className="input-site" data-testid="contact-company" /></F>
        <F label={t("Country")}><input name="country" className="input-site" data-testid="contact-country" /></F>
        <F label={t("Required service")}><select name="service" className="input-site" data-testid="contact-service"><option value="">{t("Select…")}</option>{site.services.filter((x) => x.visible !== false).map((x) => <option key={x.id}>{x.title}</option>)}</select></F>
        <F label={t("Budget")}><select name="budget" className="input-site" data-testid="contact-budget"><option value="">{t("Select…")}</option>{BUDGETS.map((b) => <option key={b}>{b}</option>)}</select></F>
        <F label={t("Timeline")}><select name="timeline" className="input-site" data-testid="contact-timeline"><option value="">{t("Select…")}</option>{TIMELINES.map((b) => <option key={b}>{b}</option>)}</select></F>
        <div className="md:col-span-2"><F label={t("Project description")}><textarea name="message" rows={5} className="input-site" data-testid="contact-message" /></F></div>
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <label className="md:col-span-2 flex items-center gap-3 cursor-pointer muted text-sm"><Paperclip size={16} />
          <span>{file ? file.name : t("Attach a brief (PDF, DOC, PNG, JPG · max 10 MB)")}</span>
          <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="contact-attachment" /></label>
        <label className="md:col-span-2 flex gap-3 items-start text-sm muted"><input type="checkbox" name="consent" required className="mt-1 accent-[var(--c-primary)]" data-testid="contact-consent" />
          {t("I agree that my details will be used to respond to this enquiry, as described in the privacy policy.")}</label>
        <button disabled={busy} className="btn-primary md:col-span-2 justify-center" data-testid="contact-submit">{busy ? t("Sending…") : t("Send enquiry")}</button>
      </form>}
    </div>
    {s.props.showDetails && c.confirmed && <aside className="card h-fit space-y-5" data-testid="contact-details">
      {c.email && <a href={`mailto:${c.email}`} className="flex gap-3 items-center"><Mail size={18} className="accent" />{c.email}</a>}
      {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex gap-3 items-center"><Phone size={18} className="accent" />{c.phone}</a>}
      {c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex gap-3 items-center"><MessageCircle size={18} className="accent" />WhatsApp</a>}
      {c.address && <p className="flex gap-3 items-start muted"><MapPin size={18} className="accent shrink-0" />{c.address}</p>}
    </aside>}
  </div>);
}
