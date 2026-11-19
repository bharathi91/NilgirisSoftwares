import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPortfolio } from "@/portfolio/lib/api";
import { Site } from "@/portfolio/site/Site";
import { Loader } from "@/portfolio/site/Loader";
import { AppDetail } from "@/portfolio/site/AppDetail";

export default function AppPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    getPortfolio().then((r) => { if (alive) setData(r.data || {}); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  if (failed) return (
    <div className="grid min-h-screen place-items-center bg-[#F4F1EA] p-8 text-center text-[#15130F]" data-testid="app-page-error">
      <p className="font-pf-heading text-3xl font-bold">This page could not be loaded. Please refresh shortly.</p>
    </div>
  );
  if (!data) return <Loader />;
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const p = projects.find((x) => x.id === id);
  const name = data.profile?.name;
  return (
    <Site data={data} title={p ? [p.title, name].filter(Boolean).join(" — ") : undefined}>
      <AppDetail key={id} project={p} projects={projects} />
    </Site>
  );
}
