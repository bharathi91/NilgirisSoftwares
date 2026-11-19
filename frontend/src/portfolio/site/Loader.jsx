import { motion } from "framer-motion";
import { Logo } from "./Logo";

export const Loader = ({ label = "Loading" }) => (
  <div className="fixed inset-0 z-[100] grid place-items-center bg-[#F4F1EA] text-[#15130F]" data-testid="site-loader">
    <div className="flex flex-col items-center gap-6">
      <motion.div animate={{ rotate: [0, -8, 0], scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
        <Logo className="h-14 w-14" testid="loader-logo" />
      </motion.div>
      <div className="h-px w-40 overflow-hidden bg-black/10">
        <motion.div className="h-full w-1/3 bg-[#E8492A]" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <p className="font-pf-mono text-[11px] uppercase tracking-[0.3em] text-black/60">{label}</p>
    </div>
  </div>
);
