import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileUrl, resolveHref, track } from "@/portfolio/lib/api";
import { Icon } from "@/portfolio/lib/icons";
import { useSite } from "@/portfolio/lib/site-context";

const SIZE = { sm: "h-9 px-4 text-sm", md: "h-11 px-6 text-[15px]", lg: "h-14 px-8 text-base" };
const ICON_SIZE = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" };
const STYLE = {
  primary: "bg-primary text-primary-foreground hover:brightness-110 rounded-[var(--btn-radius)]",
  secondary: "bg-secondary text-secondary-foreground hover:brightness-95 rounded-[var(--btn-radius)]",
  outline: "border border-foreground/25 text-foreground hover:bg-foreground hover:text-background hover:border-foreground rounded-[var(--btn-radius)]",
  ghost: "text-foreground hover:bg-foreground/[0.06] rounded-[var(--btn-radius)]",
  rounded: "bg-foreground text-background hover:brightness-125 rounded-xl",
  pill: "bg-foreground text-background hover:bg-primary hover:text-primary-foreground rounded-full",
  icon: "border border-foreground/20 text-foreground rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary",
  custom: "rounded-[var(--btn-radius)] border border-transparent hover:brightness-110",
};

export const DynamicButton = ({ b, preview }) => {
  const style = {};
  if (b.bg_color) style.backgroundColor = b.bg_color;
  if (b.text_color) style.color = b.text_color;
  if (b.border_color) { style.borderColor = b.border_color; style.borderWidth = 1; style.borderStyle = "solid"; }
  const iconOnly = b.style === "icon";
  const icon = b.icon_url ? <img src={fileUrl(b.icon_url)} alt="" className="h-4 w-4 object-contain" />
    : b.icon ? <Icon name={b.icon} className="h-4 w-4" /> : null;
  return (
    <motion.a
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      href={resolveHref(b.url) || "#"}
      target={b.new_tab ? "_blank" : undefined}
      rel={b.new_tab ? "noopener noreferrer" : undefined}
      title={b.description || b.label}
      aria-label={b.label}
      data-testid={`custom-btn-${b.id}`}
      onClick={preview ? (e) => e.preventDefault() : b.url === "resume" ? () => track("resume_download", b.label) : b.url === "/quick-view" ? () => track("quick_view", "button") : undefined}
      className={cn("group inline-flex shrink-0 items-center justify-center gap-2 font-medium tracking-tight transition-[background-color,color,border-color,filter] duration-300",
        iconOnly ? ICON_SIZE[b.size] || ICON_SIZE.md : SIZE[b.size] || SIZE.md, STYLE[b.style] || STYLE.primary)}
      style={style}
    >
      {icon || (iconOnly && <ArrowUpRight className="h-4 w-4" />)}
      {!iconOnly && <span>{b.label}</span>}
      {!iconOnly && !icon && b.new_tab && <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
    </motion.a>
  );
};

const JUSTIFY = { left: "justify-start", center: "justify-center", right: "justify-end" };

export const ButtonGroup = ({ placement, position, className, testid }) => {
  const { data } = useSite();
  const list = (Array.isArray(data?.buttons) ? data.buttons : []).filter((b) =>
    (b.placements || []).includes(placement) &&
    (!position || (b.position || "bottom") === position) &&
    (b.url !== "resume" || data?.resume?.available));
  if (!list.length) return null;
  const rows = ["left", "center", "right"].map((a) => [a, list.filter((b) => (b.align || "left") === a)]).filter(([, l]) => l.length);
  return (
    <div className={cn("flex flex-col gap-3", className)} data-testid={testid || `btn-group-${placement}`}>
      {rows.map(([a, l]) => (
        <div key={a} className={cn("flex flex-wrap items-center gap-3", JUSTIFY[a])}>
          {l.map((b) => <DynamicButton key={b.id} b={b} />)}
        </div>
      ))}
    </div>
  );
};
