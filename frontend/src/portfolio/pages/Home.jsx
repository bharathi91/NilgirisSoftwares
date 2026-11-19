import { useEffect, useState } from "react";
import { getPortfolio, track } from "@/portfolio/lib/api";
import { Site } from "@/portfolio/site/Site";
import { Loader } from "@/portfolio/site/Loader";

export default function Home() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    getPortfolio().then((r) => { if (alive) setData(r.data || {}); }).catch(() => { if (alive) setFailed(true); });
    if (!sessionStorage.getItem("visit-tracked")) { sessionStorage.setItem("visit-tracked", "1"); track("visit"); }
    return () => { alive = false; };
  }, []);
  if (failed) return (
    <div className="grid min-h-screen place-items-center bg-[#F4F1EA] p-8 text-center text-[#15130F]" data-testid="site-error">
      <div><p className="font-pf-heading text-4xl font-bold">Back in a moment.</p><p className="mt-3 text-sm text-black/60">The site content could not be loaded. Please refresh shortly.</p></div>
    </div>
  );
  if (!data) return <Loader />;
  return <Site data={data} />;
}
