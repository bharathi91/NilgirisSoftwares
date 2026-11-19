import {
  Globe, Smartphone, TabletSmartphone, Layers, Code2, Sparkles, Building2, HeartPulse, ShoppingBag, Wrench, ShieldCheck,
  Gauge, MessagesSquare, Handshake, Building, Store, Hospital, ShoppingCart, CalendarCheck, LayoutDashboard, Swords, Boxes,
  Plug, Database, KeyRound, Rocket, Bell, Bot, Mic, Languages, Workflow, CalendarClock, Server, Star, Zap, Cloud, Lock,
  Users, Award, Target, Lightbulb, Heart, CheckCircle2, Cpu, Palette, BarChart3,
} from "lucide-react";

export const ICONS = {
  Globe, Smartphone, TabletSmartphone, Layers, Code2, Sparkles, Building2, HeartPulse, ShoppingBag, Wrench, ShieldCheck,
  Gauge, MessagesSquare, Handshake, Building, Store, Hospital, ShoppingCart, CalendarCheck, LayoutDashboard, Swords, Boxes,
  Plug, Database, KeyRound, Rocket, Bell, Bot, Mic, Languages, Workflow, CalendarClock, Server, Star, Zap, Cloud, Lock,
  Users, Award, Target, Lightbulb, Heart, CheckCircle2, Cpu, Palette, BarChart3,
};

export const Icon = ({ name, ...p }) => {
  const C = ICONS[name] || Sparkles;
  return <C {...p} />;
};
