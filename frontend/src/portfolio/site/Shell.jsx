import { motion } from "framer-motion";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { ButtonGroup } from "./DynamicButton";

export const Reveal = ({ children, delay = 0, className }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}>
    {children}
  </motion.div>
);

export const Rich = ({ html, className, testid }) =>
  html ? <div className={cn("pf-rich", className)} data-testid={testid} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { ADD_ATTR: ["target"] }) }} /> : null;

export const SectionShell = ({ section, children, className, custom }) => (
  <section id={section.slug} data-testid={`section-${section.slug}`} className={cn("relative px-5 py-[var(--section-space)] md:px-10", className)}>
    <div className="mx-auto max-w-7xl">
      <Reveal>
        <div className="mb-8 grid items-end gap-4 md:mb-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {section.eyebrow && <p className="mb-5 font-pf-mono text-xs uppercase tracking-[0.25em] text-primary">{section.eyebrow}</p>}
            <h2 className="font-pf-heading text-4xl font-bold leading-[0.95] tracking-[-0.035em] sm:text-5xl lg:text-7xl" data-testid={`section-title-${section.slug}`}>{section.title}</h2>
          </div>
          {(section.subtitle || section.description) && (
            <div className="space-y-3 lg:col-span-5">
              {section.subtitle && <p className="text-base text-foreground/80 md:text-lg">{section.subtitle}</p>}
              {section.description && <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{section.description}</p>}
            </div>
          )}
        </div>
      </Reveal>
      {custom && <ButtonGroup placement={section.id} position="top" className="mb-10" />}
      {children}
      {custom && <ButtonGroup placement={section.id} position="bottom" className="mt-12" />}
    </div>
  </section>
);

export const Chip = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-foreground/15 px-3 py-1 text-xs font-medium text-foreground/80 transition-colors duration-300 hover:border-primary hover:text-primary">{children}</span>
);
