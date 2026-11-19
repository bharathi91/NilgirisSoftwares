import { createContext, useContext } from "react";

export const SiteCtx = createContext({ data: {}, mode: "light", toggle: () => {}, preview: false });
export const useSite = () => useContext(SiteCtx);
