import { uid } from "./api";
import { ICONS } from "./icons";

const ICON_OPTS = Object.keys(ICONS);
const BTN = { k: "buttons", label: "Buttons", type: "list", itemLabel: "label", fields: [
  { k: "label", label: "Label", type: "text" }, { k: "href", label: "Link (e.g. /contact or https://…)", type: "text" },
  { k: "variant", label: "Style", type: "select", options: ["primary", "ghost"] }] };
const HEAD = [{ k: "eyebrow", label: "Eyebrow", type: "text" }, { k: "title", label: "Title", type: "text" }, { k: "subtitle", label: "Subtitle", type: "textarea" }];

export const SECTION_TYPES = {
  hero_carousel: { label: "Hero carousel", fields: [
    { k: "autoplay", label: "Autoplay", type: "switch" }, { k: "interval", label: "Slide duration (ms)", type: "number" },
    { k: "transition", label: "Transition", type: "select", options: ["fade", "slide", "zoom"] },
    { k: "height", label: "Height (% of screen)", type: "number" },
    { k: "slides", label: "Slides", type: "list", itemLabel: "title", fields: [
      { k: "enabled", label: "Enabled", type: "switch" },
      { k: "kind", label: "Type", type: "select", options: ["image", "video", "text"] },
      { k: "eyebrow", label: "Eyebrow", type: "text" }, { k: "title", label: "Title", type: "text" }, { k: "subtitle", label: "Subtitle", type: "textarea" },
      { k: "image", label: "Desktop image", type: "image" }, { k: "mobileImage", label: "Mobile image (optional)", type: "image" },
      { k: "video", label: "Background video", type: "video" }, { k: "poster", label: "Video poster", type: "image" },
      { k: "overlay", label: "Overlay darkness (0-100)", type: "number" },
      { k: "ctaLabel", label: "Button 1 label", type: "text" }, { k: "ctaHref", label: "Button 1 link", type: "text" },
      { k: "cta2Label", label: "Button 2 label", type: "text" }, { k: "cta2Href", label: "Button 2 link", type: "text" }] }],
    defaults: { autoplay: true, interval: 6000, transition: "fade", height: 80, slides: [{ id: uid(), kind: "text", enabled: true, title: "New slide", subtitle: "", overlay: 50 }] } },
  page_header: { label: "Page header", fields: [...HEAD, { k: "image", label: "Background image", type: "image" }], defaults: { title: "Page title", subtitle: "" } },
  text_block: { label: "Text + image", fields: [...HEAD.slice(0, 2), { k: "body", label: "Body", type: "textarea" }, { k: "image", label: "Image", type: "image" },
    { k: "imagePosition", label: "Image position", type: "select", options: ["right", "left", "none"] }, BTN], defaults: { title: "Heading", body: "Write something…", imagePosition: "none", buttons: [] } },
  rich_text: { label: "Rich text", fields: [{ k: "html", label: "Content", type: "rich" }], defaults: { html: "<p>Write here…</p>" } },
  services_grid: { label: "Services grid", fields: [...HEAD, { k: "limit", label: "Max services (0 = all)", type: "number" }], defaults: { title: "Our services", limit: 6 } },
  feature_cards: { label: "Cards", fields: [...HEAD, { k: "items", label: "Cards", type: "list", itemLabel: "title", fields: [
    { k: "icon", label: "Icon", type: "select", options: ICON_OPTS }, { k: "title", label: "Title", type: "text" }, { k: "text", label: "Text", type: "textarea" }] }],
    defaults: { title: "Why choose us", items: [{ icon: "Star", title: "Card title", text: "Card text" }] } },
  stats: { label: "Statistics", fields: [...HEAD.slice(0, 2), { k: "items", label: "Stats", type: "list", itemLabel: "label", fields: [{ k: "value", label: "Value", type: "text" }, { k: "label", label: "Label", type: "text" }] }],
    defaults: { title: "", items: [{ value: "10+", label: "Years of iOS experience" }] } },
  tech_stack: { label: "Technology stack", fields: [...HEAD, { k: "categories", label: "Only these categories (empty = all)", type: "tags" }], defaults: { title: "Technologies" } },
  projects: { label: "Projects / portfolio", fields: [...HEAD, { k: "mode", label: "Show", type: "select", options: ["featured", "all"] }, { k: "filterable", label: "Search & filters", type: "switch" }], defaults: { title: "Projects", mode: "featured" } },
  process: { label: "Process / methodology", fields: [...HEAD.slice(0, 2), { k: "steps", label: "Steps", type: "list", itemLabel: "title", fields: [{ k: "title", label: "Title", type: "text" }, { k: "text", label: "Text", type: "textarea" }] }],
    defaults: { title: "How we work", steps: [{ title: "Step", text: "" }] } },
  founder: { label: "Founder profile", fields: [...HEAD.slice(0, 2), { k: "showFull", label: "Show full profile", type: "switch" }], defaults: { title: "Meet the founder" } },
  about: { label: "About (vision, mission, values)", fields: [{ k: "showValues", label: "Show values", type: "switch" }], defaults: { showValues: true } },
  testimonials: { label: "Testimonials", fields: HEAD.slice(0, 2), defaults: { title: "What clients say" } },
  faq: { label: "FAQ (from FAQ list)", fields: HEAD.slice(0, 2), defaults: { title: "FAQ" } },
  accordion: { label: "Accordion", fields: [{ k: "title", label: "Title", type: "text" }, { k: "items", label: "Items", type: "list", itemLabel: "q", fields: [{ k: "q", label: "Heading", type: "text" }, { k: "a", label: "Content", type: "textarea" }] }],
    defaults: { title: "", items: [{ q: "Item", a: "Content" }] } },
  tabs: { label: "Tabs", fields: [{ k: "title", label: "Title", type: "text" }, { k: "tabs", label: "Tabs", type: "list", itemLabel: "label", fields: [{ k: "label", label: "Tab label", type: "text" }, { k: "content", label: "Content", type: "textarea" }] }],
    defaults: { title: "", tabs: [{ label: "Tab 1", content: "Content" }] } },
  gallery: { label: "Gallery / carousel", fields: [{ k: "title", label: "Title", type: "text" }, { k: "layout", label: "Layout", type: "select", options: ["grid", "carousel"] },
    { k: "images", label: "Images", type: "list", itemLabel: "caption", fields: [{ k: "src", label: "Image", type: "image" }, { k: "alt", label: "Alt text", type: "text" }, { k: "caption", label: "Caption", type: "text" }] }],
    defaults: { title: "Gallery", layout: "grid", images: [] } },
  video: { label: "Video", fields: [{ k: "title", label: "Title", type: "text" }, { k: "src", label: "Video (upload or YouTube embed URL)", type: "video" }, { k: "poster", label: "Poster image", type: "image" }], defaults: { title: "", src: "" } },
  cta: { label: "Call to action", fields: [{ k: "title", label: "Title", type: "text" }, { k: "subtitle", label: "Subtitle", type: "textarea" }, BTN], defaults: { title: "Ready to start?", buttons: [{ label: "Contact us", href: "/contact", variant: "primary" }] } },
  contact_form: { label: "Contact form", fields: [{ k: "title", label: "Title", type: "text" }, { k: "subtitle", label: "Subtitle", type: "textarea" }, { k: "showDetails", label: "Show contact details", type: "switch" }], defaults: { title: "Get in touch", showDetails: true } },
  blog_list: { label: "Blog list", fields: [{ k: "title", label: "Title", type: "text" }, { k: "limit", label: "Posts per page", type: "number" }, { k: "showSearch", label: "Search & categories", type: "switch" }], defaults: { title: "Latest articles", limit: 6, showSearch: false } },
};

export const DEFAULT_STYLE = {
  bg: "base", bgColor: "", bgImage: "", overlay: 60, paddingY: { m: 64, t: 88, d: 112 }, align: { m: "left", t: "left", d: "left" },
  maxWidth: "normal", minHeight: 0, columns: { m: 1, t: 2, d: 3 }, titleSize: { m: 30, t: 40, d: 52 }, hide: { m: false, t: false, d: false }, animation: "fade-up",
};

export const newSection = (type) => ({ id: uid(), type, visible: true, props: JSON.parse(JSON.stringify(SECTION_TYPES[type].defaults)), style: JSON.parse(JSON.stringify(DEFAULT_STYLE)) });

export const STYLE_FIELDS = [
  { k: "bg", label: "Background", type: "select", options: ["base", "surface", "gradient", "custom", "image"] },
  { k: "bgColor", label: "Custom background colour", type: "color" }, { k: "bgImage", label: "Background image", type: "image" },
  { k: "overlay", label: "Image overlay (0-100)", type: "number" },
  { k: "maxWidth", label: "Content width", type: "select", options: ["narrow", "normal", "wide", "full"] },
  { k: "minHeight", label: "Min height (px, 0 = auto)", type: "number" },
  { k: "animation", label: "Entrance animation", type: "select", options: ["fade-up", "fade", "zoom", "slide-left", "none"] },
];
export const RESPONSIVE_FIELDS = [
  { k: "paddingY", label: "Vertical spacing (px)", type: "number" }, { k: "titleSize", label: "Title size (px)", type: "number" },
  { k: "columns", label: "Grid columns", type: "number" }, { k: "align", label: "Alignment", type: "select", options: ["left", "center", "right"] },
  { k: "hide", label: "Hide on this device", type: "switch" },
];
