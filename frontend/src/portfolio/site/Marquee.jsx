import { Asterisk } from "lucide-react";
import { useSite } from "@/portfolio/lib/site-context";

export const Marquee = () => {
  const { data } = useSite();
  const items = Array.isArray(data?.site?.marquee) ? data.site.marquee : [];
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-foreground/10 bg-secondary/60 py-6 md:py-8" data-testid="editorial-marquee">
      <div className="pf-marquee flex w-max items-center">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center" aria-hidden={k === 1}>
            {row.map((t, i) => (
              <span key={`${k}-${i}`} className="flex items-center whitespace-nowrap px-6 font-pf-serif-accent text-3xl italic text-foreground md:px-10 md:text-5xl">
                {t}<Asterisk className="ml-12 h-6 w-6 text-primary md:ml-20" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
