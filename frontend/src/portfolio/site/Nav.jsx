import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveHref } from "@/portfolio/lib/api";
import { useSite } from "@/portfolio/lib/site-context";
import { Logo } from "./Logo";
import { ButtonGroup } from "./DynamicButton";

const ThemeToggle = () => {
  const { mode, toggle } = useSite();
  return (
    <button onClick={toggle} data-testid="theme-toggle-btn" aria-label="Toggle light and dark mode"
      className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-foreground/15 text-foreground transition-colors duration-300 hover:border-foreground/60">
      <AnimatePresence initial={false}>
        <motion.span key={mode} initial={{ y: 18, opacity: 0, rotate: -60 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: -18, opacity: 0, rotate: 60 }} transition={{ duration: 0.35 }} className="absolute">
          {mode === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

const NavLink = ({ item, onClick, big }) => (
  <a href={resolveHref(item.href)} target={item.new_tab ? "_blank" : undefined} rel={item.new_tab ? "noopener noreferrer" : undefined}
    onClick={onClick} data-testid={`nav-link-${item.id}`}
    className={cn("group relative transition-colors duration-300", big ? "font-pf-heading text-4xl font-bold tracking-tight" : "text-sm text-foreground/70 hover:text-foreground")}>
    {item.label}
    {!big && <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />}
  </a>
);

export const Nav = () => {
  const { data } = useSite();
  const items = Array.isArray(data?.nav_items) ? data.nav_items : [];
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const brand = data?.site?.brand || data?.profile?.name || "";
  return (
    <header data-testid="site-header" className={cn("fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500 border-b",
      scrolled || open ? "bg-background/75 backdrop-blur-xl border-foreground/10" : "border-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-10">
        <a href={resolveHref("#top")} className="flex items-center gap-3" data-testid="brand-home-link">
          <Logo className="h-8 w-8" />
          <span className="max-w-[46vw] font-pf-heading text-sm font-bold leading-tight tracking-tight sm:max-w-none md:text-lg" data-testid="brand-name">{brand}</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex" data-testid="desktop-nav">
          {items.map((i) => <NavLink key={i.id} item={i} />)}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/" className="hidden items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/70 transition-colors duration-300 hover:border-foreground/60 hover:text-foreground lg:inline-flex" data-testid="pf-company-home-link"><ArrowLeft className="h-3.5 w-3.5" /> {data?.company_label || "The Nilgiris Softwares"}</Link>
          <ButtonGroup placement="header" className="hidden md:flex" testid="header-buttons" />
          {data?.theme?.allow_toggle !== false && <ThemeToggle />}
          <button className="grid h-10 w-10 place-items-center rounded-full border border-foreground/15 md:hidden" onClick={() => setOpen((o) => !o)} data-testid="mobile-menu-btn" aria-label="Menu">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden md:hidden" data-testid="mobile-menu">
            <div className="flex flex-col gap-5 px-5 pb-10 pt-6">
              {items.map((i) => <NavLink key={i.id} item={i} big onClick={() => setOpen(false)} />)}
              <ButtonGroup placement="header" className="pt-4" testid="mobile-header-buttons" />
              <Link to="/" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground" data-testid="pf-mobile-company-home-link"><ArrowLeft className="h-4 w-4" /> Back to {data?.company_label || "The Nilgiris Softwares"}</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
