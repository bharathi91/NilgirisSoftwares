import {
  Download, Linkedin, Github, Mail, Phone, Globe, ExternalLink, ArrowUpRight, ArrowRight, FileText, Briefcase,
  Code2, Smartphone, Apple, BookOpen, Award, Star, Heart, MessageCircle, Send, Calendar, MapPin, Link, Twitter,
  Youtube, Instagram, Facebook, Dribbble, Figma, Rocket, Zap, Sparkles, Layers, Terminal, Cpu, Trophy,
  GraduationCap, User, Video, Play, Coffee, PenTool, Newspaper, Bookmark, Share2, Home, BadgeCheck, Shield,
} from "lucide-react";

export const ICONS = {
  Download, Linkedin, Github, Mail, Phone, Globe, ExternalLink, ArrowUpRight, ArrowRight, FileText, Briefcase,
  Code2, Smartphone, Apple, BookOpen, Award, Star, Heart, MessageCircle, Send, Calendar, MapPin, Link, Twitter,
  Youtube, Instagram, Facebook, Dribbble, Figma, Rocket, Zap, Sparkles, Layers, Terminal, Cpu, Trophy,
  GraduationCap, User, Video, Play, Coffee, PenTool, Newspaper, Bookmark, Share2, Home, BadgeCheck, Shield,
};
export const ICON_NAMES = Object.keys(ICONS);

export const Icon = ({ name, ...props }) => {
  const C = ICONS[name];
  return C ? <C {...props} /> : null;
};
