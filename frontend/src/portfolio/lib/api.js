import axios from "axios";

export const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const api = axios.create({ baseURL: `${BACKEND}/api` });

let cached = null;
// One request per 30s across portfolio pages; the server revalidates with an ETag after publishing.
export const getPortfolio = () => {
  if (!cached || Date.now() - cached.at > 30000) {
    const p = api.get("/public/portfolio").then((r) => ({ data: r.data.data }));
    cached = { at: Date.now(), p };
    p.catch(() => { cached = null; });
  }
  return cached.p;
};

export function errMsg(e) {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || "Something went wrong. Please try again.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (typeof x?.msg === "string" ? x.msg : JSON.stringify(x))).join(" · ");
  if (typeof d?.msg === "string") return d.msg;
  return String(d);
}

export const fileUrl = (u) => (!u ? "" : u.startsWith("/api/") ? `${BACKEND}${u}` : u);
export const track = (type) => {
  if (type !== "visit" || window.location.pathname.startsWith("/portfolio/preview")) return;
  api.post("/public/track", { path: window.location.pathname, referrer: document.referrer || "" }).catch(() => {});
};
const onSubPage = () => /^\/portfolio\/.+/.test(window.location.pathname);
const LEGACY = { "/quick-view": "/portfolio/quick-view" };
export const resolveHref = (u) => {
  if (u === "resume") return `${BACKEND}/api/public/portfolio/resume`;
  if (LEGACY[u]) return LEGACY[u];
  if (u?.startsWith("/work/")) return `/portfolio${u}`;
  if (u?.startsWith("#") && onSubPage()) return `/portfolio${u}`;
  return fileUrl(u);
};
