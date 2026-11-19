import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/portfolio/site/Logo";

export default function NotFound() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#F4F1EA] px-6 text-[#15130F]" data-testid="not-found-page" style={{ "--foreground": "30 17% 7%", "--background": "43 33% 94%", "--primary": "10 80% 54%" }}>
      <p className="pointer-events-none absolute select-none font-pf-heading text-[40vw] font-extrabold leading-none tracking-[-0.06em] text-black/[0.05]">404</p>
      <div className="relative text-center">
        <Logo className="mx-auto h-12 w-12" />
        <h1 className="mt-8 font-pf-heading text-5xl font-bold tracking-tight md:text-7xl">Lost in the <span className="font-pf-serif-accent italic font-normal text-[#E8492A]">navigation stack.</span></h1>
        <p className="mt-4 text-base text-black/60">The page you are looking for doesn't exist or was moved.</p>
        <Link to="/portfolio" className="mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-[#15130F] px-6 text-sm font-medium text-white transition-colors hover:bg-[#E8492A]" data-testid="not-found-home-link">
          <ArrowLeft className="h-4 w-4" /> Back to portfolio
        </Link>
      </div>
    </div>
  );
}
