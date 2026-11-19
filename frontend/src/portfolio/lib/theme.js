const hexToRgb = (h) => {
  let x = (h || "#000000").replace("#", "");
  if (x.length === 3) x = x.split("").map((c) => c + c).join("");
  const n = parseInt(x.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const hsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const lum = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const onColor = (c) => (lum(c) > 0.62 ? [18, 17, 15] : [255, 255, 255]);

const DEFAULTS = {
  light: { primary: "#E8492A", secondary: "#E9E4D9", accent: "#1D3BFF", background: "#F4F1EA", text: "#15130F" },
  dark: { primary: "#FF6A3D", secondary: "#1C1B19", accent: "#7C8CFF", background: "#0B0B0A", text: "#EFECE5" },
};
const SPACE = { compact: "clamp(2rem,4vw,3rem)", normal: "clamp(2.75rem,5vw,4rem)", relaxed: "clamp(4rem,8vw,6.5rem)" };
const BTN = { pill: "999px", rounded: "calc(var(--radius) * 0.6)", sharp: "0px" };

export function themeVars(theme = {}, mode = "light") {
  const p = { ...DEFAULTS[mode], ...(theme?.[mode] || {}) };
  const bg = hexToRgb(p.background), tx = hexToRgb(p.text), pr = hexToRgb(p.primary);
  const se = hexToRgb(p.secondary), ac = hexToRgb(p.accent);
  const card = mode === "dark" ? mix(bg, [255, 255, 255], 0.035) : mix(bg, [255, 255, 255], 0.55);
  return {
    "--background": hsl(bg), "--foreground": hsl(tx),
    "--card": hsl(card), "--card-foreground": hsl(tx),
    "--popover": hsl(card), "--popover-foreground": hsl(tx),
    "--primary": hsl(pr), "--primary-foreground": hsl(onColor(pr)),
    "--secondary": hsl(se), "--secondary-foreground": hsl(tx),
    "--muted": hsl(mix(bg, tx, 0.06)), "--muted-foreground": hsl(mix(tx, bg, 0.36)),
    "--accent": hsl(ac), "--accent-foreground": hsl(onColor(ac)),
    "--border": hsl(mix(bg, tx, 0.14)), "--input": hsl(mix(bg, tx, 0.18)), "--ring": hsl(pr),
    "--radius": `${theme?.radius ?? 1.25}rem`,
    "--font-heading": `"${theme?.font_heading || "Cabinet Grotesk"}", ui-sans-serif, system-ui, sans-serif`,
    "--font-body": `"${theme?.font_body || "Satoshi"}", ui-sans-serif, system-ui, sans-serif`,
    "--section-space": SPACE[theme?.section_spacing] || SPACE.normal,
    "--btn-radius": BTN[theme?.button_style] || BTN.pill,
    fontSize: `${theme?.font_size || 16}px`,
  };
}

const FONTSHARE = { "Cabinet Grotesk": "cabinet-grotesk@400,500,700,800", Satoshi: "satoshi@400,500,700", "Clash Display": "clash-display@400,500,600,700", "General Sans": "general-sans@400,500,600,700", Switzer: "switzer@400,500,600,700", Erode: "erode@400,500,600" };
const GOOGLE = { "Plus Jakarta Sans": "wght@400;500;700;800", Manrope: "wght@400;500;700;800", "DM Sans": "wght@400;500;700", Fraunces: "wght@400;600;800", "Instrument Serif": "ital@0;1", "Bricolage Grotesque": "wght@400;600;800", Syne: "wght@400;600;800", "IBM Plex Sans": "wght@400;500;700", Outfit: "wght@400;500;700;800", "JetBrains Mono": "wght@400;500" };
export const FONT_OPTIONS = [...Object.keys(FONTSHARE), ...Object.keys(GOOGLE)];

export function loadFont(name) {
  if (!name || document.querySelector(`link[data-font="${name}"]`)) return;
  let href = "";
  if (FONTSHARE[name]) href = `https://api.fontshare.com/v2/css?f[]=${FONTSHARE[name]}&display=swap`;
  else if (GOOGLE[name]) href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}:${GOOGLE[name]}&display=swap`;
  if (!href) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = href; l.dataset.font = name;
  document.head.appendChild(l);
}
