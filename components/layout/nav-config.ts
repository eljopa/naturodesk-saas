import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  BookOpen,
  Receipt,
  Settings,
  Globe,
  MessageSquare,
  LifeBuoy,
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
  | "adviceSheets"
  | "protocols"
  | "invoices"
  | "knowledge"
  | "webpage"
  | "messages"
  | "support"
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
      { key: "appointments", href: "/appointments", icon: CalendarDays },
      { key: "invoices", href: "/invoices", icon: Receipt },
    ],
  },
  {
    sectionKey: "clinique",
    items: [
      { key: "consultations", href: "/consultations",  icon: Stethoscope },
      { key: "adviceSheets",  href: "/advice-sheets",  icon: ClipboardList },
      { key: "protocols",     href: "/protocols",       icon: FlaskConical },
    ],
  },
  {
    sectionKey: "ressources",
    items: [
      { key: "knowledge", href: "/knowledge", icon: BookOpen },
    ],
  },
  {
    sectionKey: "web",
    items: [
      { key: "webpage", href: "/webpage", icon: Globe },
      { key: "messages", href: "/webpage/messages", icon: MessageSquare },
    ],
  },
];

export const NAV_BOTTOM: NavItemConfig[] = [
  { key: "support", href: "/support", icon: LifeBuoy },
  { key: "settings", href: "/settings", icon: Settings },
];
