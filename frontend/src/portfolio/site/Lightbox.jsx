import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { fileUrl } from "@/portfolio/lib/api";

export const Lightbox = ({ images, start = 0, title, onClose }) => {
  const [i, setI] = useState(start);
  const [dir, setDir] = useState(0);
  const n = images.length;
  const go = (d) => { setDir(d); setI((x) => (x + d + n) % n); };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { setDir(1); setI((x) => (x + 1) % n); }
      if (e.key === "ArrowLeft") { setDir(-1); setI((x) => (x - 1 + n) % n); }
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [n, onClose]);
  const root = document.querySelector(".pf-root") || document.querySelector(".pf-root") || document.body;
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-lenis-prevent
      className="fixed inset-0 z-[90] flex flex-col bg-black/90 text-white backdrop-blur-md" onClick={onClose} data-testid="screenshot-lightbox">
      <div className="flex items-center justify-between px-5 py-4" onClick={(e) => e.stopPropagation()}>
        <p className="font-pf-heading text-lg font-bold">{title} <span className="ml-2 font-pf-mono text-xs font-normal text-white/70">{i + 1} / {n}</span></p>
        <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 hover:bg-white hover:text-black" data-testid="lightbox-close-btn"><X className="h-4 w-4" /></button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        <AnimatePresence initial={false} custom={dir}>
          <motion.img key={i} src={fileUrl(images[i])} alt={`${title} screenshot ${i + 1}`} custom={dir}
            initial={{ x: dir * 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir * -300, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            drag={n > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
            onDragEnd={(_, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}
            onClick={(e) => e.stopPropagation()}
            className="absolute max-h-[78vh] max-w-[92vw] cursor-grab rounded-2xl object-contain shadow-2xl active:cursor-grabbing" data-testid="lightbox-image" />
        </AnimatePresence>
        {n > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous" className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white hover:text-black md:left-8" data-testid="lightbox-prev-btn"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next" className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white hover:text-black md:right-8" data-testid="lightbox-next-btn"><ChevronRight className="h-5 w-5" /></button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="flex justify-center gap-2 px-4 py-4" onClick={(e) => e.stopPropagation()}>
          {images.map((s, k) => (
            <button key={k} onClick={() => { setDir(k > i ? 1 : -1); setI(k); }} data-testid={`lightbox-thumb-${k}`}
              className={`h-14 w-8 overflow-hidden rounded-md border-2 transition-opacity md:h-16 md:w-9 ${k === i ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-90"}`}>
              <img src={fileUrl(s)} alt="" className="h-full w-full object-cover object-top" />
            </button>
          ))}
        </div>
      )}
    </motion.div>,
    root
  );
};
