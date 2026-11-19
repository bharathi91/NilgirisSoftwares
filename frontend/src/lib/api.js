import axios from "axios";
import { useAuth } from "@clerk/react";
import { useMemo } from "react";

export const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND}/api`;

export const mediaUrl = (u, w) => {
  if (!u) return "";
  const full = u.startsWith("/api/") ? `${BACKEND}${u}` : u;
  if (!w) return full;
  if (u.startsWith("/api/media/f/") && /\.(jpg|png|webp)$/.test(u)) return `${full}?w=${w}`;
  if (full.includes("images.unsplash.com")) return full.replace(/([?&])w=\d+/, `$1w=${w}`);
  return full;
};

export const srcSet = (u) => {
  if (!u) return undefined;
  if ((u.startsWith("/api/media/f/") && /\.(jpg|png|webp)$/.test(u)) || u.includes("images.unsplash.com"))
    return `${mediaUrl(u, 480)} 480w, ${mediaUrl(u, 1200)} 1200w, ${mediaUrl(u)} 1800w`;
  return undefined;
};

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (d.message) return `${d.message}${d.errors ? ": " + d.errors.join("; ") : ""}`;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(", ");
  return JSON.stringify(d);
};

export function useAdminApi() {
  const { getToken } = useAuth();
  return useMemo(() => {
    const inst = axios.create({ baseURL: API });
    inst.interceptors.request.use(async (cfg) => {
      const t = await getToken();
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    return inst;
  }, [getToken]);
}

export const uid = () => Math.random().toString(16).slice(2, 12);

export const download = (data, name, type = "text/csv") => {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
