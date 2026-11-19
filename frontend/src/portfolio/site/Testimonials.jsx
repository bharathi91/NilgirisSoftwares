import { Quote } from "lucide-react";
import { useSite } from "@/portfolio/lib/site-context";
import { fileUrl } from "@/portfolio/lib/api";
import { Reveal, SectionShell } from "./Shell";

export const Testimonials = ({ section }) => {
  const list = useSite().data?.testimonials;
  const items = Array.isArray(list) ? list : [];
  if (!items.length) return null;
  return (
    <SectionShell section={section}>
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((t, i) => (
          <Reveal key={t.id} delay={(i % 2) * 0.1} className={items.length % 2 && i === 0 ? "md:col-span-2" : ""}>
            <figure className="pf-card flex h-full flex-col justify-between p-7 md:p-10" data-testid={`testimonial-${t.id}`}>
              <Quote className="h-7 w-7 text-primary" />
              <blockquote className="mt-5 font-pf-serif-accent text-2xl italic leading-snug md:text-3xl">“{t.quote}”</blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                {t.avatar ? <img src={fileUrl(t.avatar)} alt={t.name} className="h-12 w-12 rounded-full object-cover" />
                  : <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 font-pf-heading text-lg font-bold text-primary">{t.name.charAt(0)}</span>}
                <span>
                  {t.link ? <a href={t.link} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-primary">{t.name}</a> : <span className="font-semibold">{t.name}</span>}
                  <span className="block text-sm text-muted-foreground">{[t.role, t.company].filter(Boolean).join(" · ")}</span>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
};
