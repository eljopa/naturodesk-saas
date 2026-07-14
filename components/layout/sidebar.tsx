"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  NAV_SECTIONS,
  NAV_BOTTOM,
  type NavItemConfig,
  type NavItemKey,
  type NavSectionKey,
} from "./nav-config";

// ---------------------------------------------------------------------------
// Lookup type-safe : évite les template literals sur les clés i18n
// ---------------------------------------------------------------------------

function useItemLabel(key: NavItemKey): string {
  const t = useTranslations("nav.items");
  const labels: Record<NavItemKey, string> = {
    dashboard:    t("dashboard"),
    patients:     t("patients"),
    appointments: t("appointments"),
    consultations: t("consultations"),
    adviceSheets: t("adviceSheets"),
    protocols:    t("protocols"),
    invoices:     t("invoices"),
    knowledge:    t("knowledge"),
    webpage:      t("webpage"),
    messages:     t("messages"),
    support:      t("support"),
    settings:     t("settings"),
  };
  return labels[key];
}

// ---------------------------------------------------------------------------
// Nav link
// ---------------------------------------------------------------------------

function NavLink({
  item,
  numericBadge,
  onClick,
}: {
  item: NavItemConfig;
  numericBadge?: number;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const label = useItemLabel(item.key);

  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
        isActive
          ? "bg-nd-sage-tint text-nd-sage-deep"
          : "text-slate-600 hover:bg-nd-cream hover:text-nd-forest"
      )}
    >
      <item.icon
        className={cn(
          "w-4 h-4 shrink-0 transition-colors",
          isActive
            ? "text-nd-sage"
            : "text-slate-400 group-hover:text-slate-600"
        )}
      />
      <span>{label}</span>
      {/* Badge statique string */}
      {item.badge && !numericBadge && (
        <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
          {item.badge}
        </span>
      )}
      {/* Badge dynamique numérique — messages non lus */}
      {numericBadge && numericBadge > 0 && (
        <span className="ml-auto text-xs font-semibold bg-nd-sage text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center tabular-nums">
          {numericBadge > 99 ? "99+" : numericBadge}
        </span>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Section avec titre optionnel
// ---------------------------------------------------------------------------

function NavSection({
  sectionKey,
  items,
  badgeCounts,
  onItemClick,
}: {
  sectionKey?: NavSectionKey;
  items: NavItemConfig[];
  badgeCounts?: Partial<Record<NavItemKey, number>>;
  onItemClick?: () => void;
}) {
  const tSections = useTranslations("nav.sections");
  const sectionLabels: Record<NavSectionKey, string> = {
    cabinet: tSections("cabinet"),
    clinique: tSections("clinique"),
    ressources: tSections("ressources"),
    web: tSections("web"),
  };
  const sectionLabel = sectionKey ? sectionLabels[sectionKey] : null;

  return (
    <div>
      {sectionLabel && (
        <p className="px-3 mb-1.5 text-xs font-semibold text-nd-muted uppercase tracking-wider">
          {sectionLabel}
        </p>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink
              item={item}
              numericBadge={badgeCounts?.[item.key]}
              onClick={onItemClick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar principale
// ---------------------------------------------------------------------------

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  badgeCounts?: Partial<Record<NavItemKey, number>>;
}

export function Sidebar({ open, onClose, badgeCounts }: SidebarProps) {
  const tTopbar = useTranslations("topbar");

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-nd-cream-deep border-r border-nd-line",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-nd-line shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center"
            onClick={onClose}
          >
            <Image
              src="/images/logo-nav.png"
              alt="NaturoDesk"
              width={148}
              height={34}
              className="h-8 w-auto"
              priority
            />
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            aria-label={tTopbar("closeMenu")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_SECTIONS.map((section, i) => (
            <NavSection
              key={i}
              sectionKey={section.sectionKey}
              items={section.items}
              badgeCounts={badgeCounts}
              onItemClick={onClose}
            />
          ))}
        </nav>

        {/* Navigation bas */}
        <div className="px-3 py-4 border-t border-nd-line">
          <ul className="space-y-0.5">
            {NAV_BOTTOM.map((item) => (
              <li key={item.href}>
                <NavLink item={item} onClick={onClose} />
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}
