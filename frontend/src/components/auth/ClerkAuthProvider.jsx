import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import { dark } from "@clerk/ui/themes";

const appearance = {
  theme: dark,
  captcha: { theme: "dark" },
  variables: { colorPrimary: "#2DBE87", colorPrimaryForeground: "#04110B", colorBackground: "#111B23", colorForeground: "#F7FAFC", colorInput: "#0B141B", colorInputForeground: "#F7FAFC", colorBorder: "#1E2C36", fontFamily: "Figtree, sans-serif", borderRadius: "12px" },
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ClerkAuthProvider({ children }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      try {
        const cfg = await (await fetch(`${BACKEND_URL}/api/clerk/config`)).json();
        if (cfg.enabled) return cancelled || setConfig(cfg);
      } catch {}
      if (cancelled) return;
      if (attempt >= 20) return setUnavailable(true);
      setTimeout(() => load(attempt + 1), 1500);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (unavailable) return <p style={{ padding: 24 }}>Sign-in is unavailable right now. Refresh the page to try again.</p>;
  if (!config) return null;
  return (
    <ClerkProvider
      publishableKey={config.publishable_key}
      proxyUrl={config.proxy_url || undefined}
      appearance={appearance}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/admin/login"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/admin"
      signUpFallbackRedirectUrl="/admin"
      afterSignOutUrl="/admin/login"
    >
      {children}
    </ClerkProvider>
  );
}
