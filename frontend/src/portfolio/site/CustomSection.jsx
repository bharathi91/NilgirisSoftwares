import { ArrowUpRight } from "lucide-react";
import { fileUrl, resolveHref } from "@/portfolio/lib/api";
import { cn } from "@/lib/utils";
import { Reveal, Rich, SectionShell } from "./Shell";

const embedUrl = (u = "") => {
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = u.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
};

const Block = ({ b }) => {
  if (b.type === "text") return <Rich html={b.content} className="text-base md:text-lg" />;
  if (b.type === "quote") return (
    <blockquote className="border-l-2 border-primary pl-6">
      <p className="font-pf-serif-accent text-3xl italic leading-tight md:text-5xl">{b.content?.replace(/<[^>]+>/g, "")}</p>
      {b.caption && <cite className="mt-4 block font-pf-mono text-xs uppercase not-italic tracking-[0.2em] text-muted-foreground">{b.caption}</cite>}
    </blockquote>
  );
  if (b.type === "image" && b.url) return (
    <figure className="overflow-hidden rounded-[var(--radius)]">
      <img src={fileUrl(b.url)} alt={b.caption || ""} loading="lazy" className="w-full object-cover" />
      {b.caption && <figcaption className="mt-3 text-sm text-muted-foreground">{b.caption}</figcaption>}
    </figure>
  );
  if (b.type === "video" && b.url) {
    const e = embedUrl(b.url);
    return (
      <figure>
        <div className="aspect-video overflow-hidden rounded-[var(--radius)] bg-secondary">
          {e ? <iframe src={e} title={b.caption || "Video"} className="h-full w-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
            : <video src={fileUrl(b.url)} controls className="h-full w-full object-cover" />}
        </div>
        {b.caption && <figcaption className="mt-3 text-sm text-muted-foreground">{b.caption}</figcaption>}
      </figure>
    );
  }
  if (b.type === "buttons") return (
    <div className="flex flex-wrap gap-3" data-testid={`block-buttons-${b.id}`}>
      {(b.buttons || []).filter((x) => x.label).map((x, i) => (
        <a key={i} href={resolveHref(x.url) || undefined} target={x.new_tab !== false ? "_blank" : undefined} rel="noopener noreferrer" data-testid={`block-button-${b.id}-${i}`}
          className="group inline-flex h-12 items-center gap-2 rounded-[var(--btn-radius)] border border-foreground/15 px-6 font-medium transition-[transform,filter] duration-300 hover:-translate-y-0.5 hover:brightness-110"
          style={{ backgroundColor: x.bg_color || undefined, color: x.text_color || undefined, borderColor: x.bg_color || undefined }}>
          {x.label}<ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      ))}
    </div>
  );
  if (b.type === "links") return (
    <div className="border-t border-foreground/10">
      {(b.links || []).filter((l) => l.label).map((l, i) => (
        <a key={i} href={resolveHref(l.url) || undefined} target={l.new_tab ? "_blank" : undefined} rel="noopener noreferrer"
          className="group flex items-center justify-between border-b border-foreground/10 py-5 font-pf-heading text-xl font-bold tracking-tight md:text-3xl">
          <span className="transition-transform duration-300 group-hover:translate-x-2">{l.label}</span>
          <ArrowUpRight className="h-6 w-6 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary" />
        </a>
      ))}
    </div>
  );
  return null;
};

export const CustomSection = ({ section }) => {
  const blocks = Array.isArray(section.blocks) ? section.blocks : [];
  const cols = section.layout === "split" ? "md:grid-cols-2" : "";
  return (
    <SectionShell section={section} custom>
      <div className={cn("grid gap-10", cols, section.layout === "centered" && "mx-auto max-w-3xl text-center")}>
        {blocks.map((b) => <Reveal key={b.id}><div data-testid={`block-${b.id}`}><Block b={b} /></div></Reveal>)}
      </div>
    </SectionShell>
  );
};
