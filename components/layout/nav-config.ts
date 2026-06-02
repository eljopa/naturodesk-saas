import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  BookOpen,
  FileText,
  Database,
  Settings,
  Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types typés — correspondent aux clés dans messages/*/nav.*
// ---------------------------------------------------------------------------

export type NavSectionKey = "cabinet" | "clinique" | "ressources" | "web";
export type NavItemKey =
  | "dashboard"
  | "patients"
  | "appointments"
  | "consultations"
  | "protocols"
  | "invoices"
  | "knowledge"
  | "webpage"
  | "settings";

export type NavItemConfig = {
  key: NavItemKey;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavSectionConfig = {
  /** Clé de section — undefined pour les items sans groupe */
  sectionKey?: NavSectionKey;
  items: NavItemConfig[];
};

// ---------------------------------------------------------------------------
// Structure de navigation
// ---------------------------------------------------------------------------

export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    sectionKey: "cabinet",
    items: [
      { key: "patients", href: "/patients", icon: Users },
      { key: "appointments", href: "/appointments", icon: Calendar },
      { key: "invoices", href: "/invoices", icon: FileText },
    ],
  },
  {
    sectionKey: "clinique",
    items: [
      { key: "consultations", href: "/consultations", icon: ClipboardList },
      { key: "protocols", href: "/protocols", icon: BookOpen },
    ],
  },
  {
    sectionKey: "ressources",
    items: [
      { key: "knowledge", href: "/knowledge", icon: Database },
    ],
  },
  {
    sectionKey: "web",
    items: [
      { key: "webpage", href: "/webpage", icon: Globe },
    ],
  },
];

export const NAV_BOTTOM: NavItemConfig[] = [
  { key: "settings", href: "/settings", icon: Settings },
];
