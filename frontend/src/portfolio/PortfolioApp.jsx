import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/lib/api";
import Home from "@/portfolio/pages/Home";
import AppPage from "@/portfolio/pages/AppPage";
import QuickView from "@/portfolio/pages/QuickView";
import Preview from "@/portfolio/pages/Preview";
import NotFound from "@/portfolio/pages/NotFound";

// Old company case-study links (/portfolio/<slug>) now live at /projects/<slug>.
function LegacyOrMissing() {
  const { "*": rest } = useParams();
  const [to, setTo] = useState(undefined);
  useEffect(() => {
    const slug = (rest || "").replace(/\/+$/, "");
    axios.get(`${API}/public/site`).then((r) => setTo(r.data.data.projects.some((p) => p.slug === slug) ? `/projects/${slug}` : null)).catch(() => setTo(null));
  }, [rest]);
  if (to === undefined) return null;
  return to ? <Navigate to={to} replace /> : <NotFound />;
}

export default function PortfolioApp() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="work/:id" element={<AppPage />} />
      <Route path="quick-view" element={<QuickView />} />
      <Route path="preview" element={<Preview />} />
      <Route path="*" element={<LegacyOrMissing />} />
    </Routes>
  );
}

export const LegacyWork = () => <Navigate to={`/portfolio/work/${useParams().id}`} replace />;
