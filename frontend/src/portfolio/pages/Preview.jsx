import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Show } from "@clerk/react";
import { Eye } from "lucide-react";
import { useAdminApi } from "@/lib/api";
import { Site } from "@/portfolio/site/Site";
import { Loader } from "@/portfolio/site/Loader";

function DraftPreview() {
  const api = useAdminApi();
  const [data, setData] = useState(null);
  const nav = useNavigate();
  useEffect(() => {
    api.get("/admin/portfolio/draft").then((r) => setData(r.data.data || {})).catch(() => nav("/admin/login", { replace: true }));
  }, [api, nav]);
  if (!data) return <Loader label="Loading preview" />;
  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-medium text-white shadow-xl" data-testid="preview-banner">
        <Eye className="h-3.5 w-3.5" /> Preview · draft content, not yet published
      </div>
      <Site data={{ ...data, resume: { ...data.resume, available: !!data.resume?.available } }} preview />
    </>
  );
}

export default function Preview() {
  const nav = useNavigate();
  return (<>
    <Show when="signed-in"><DraftPreview /></Show>
    <Show when="signed-out"><RedirectLogin nav={nav} /></Show>
  </>);
}

function RedirectLogin({ nav }) {
  useEffect(() => { nav("/admin/login", { replace: true }); }, [nav]);
  return null;
}
