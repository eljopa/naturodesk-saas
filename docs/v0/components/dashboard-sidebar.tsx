"use client"

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  BookOpen,
  Globe,
  MessageSquare,
  Settings,
  Leaf,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type NavItem = {
  label: string
  icon: LucideIcon
  active?: boolean
  badge?: number
}

type NavSection = {
  title?: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    items: [{ label: "Tableau de bord", icon: LayoutDashboard, active: true }],
  },
  {
    title: "Cabinet",
    items: [
      { label: "Patients", icon: Users },
      { label: "Rendez-vous", icon: CalendarDays },
      { label: "Factures", icon: Receipt },
    ],
  },
  {
    title: "Clinique",
    items: [
      { label: "Consultations", icon: Stethoscope },
      { label: "Fiches conseil", icon: ClipboardList },
      { label: "Protocoles", icon: FlaskConical },
    ],
  },
  {
    title: "Ressources",
    items: [{ label: "Base de connaissances", icon: BookOpen }],
  },
  {
    title: "Web",
    items: [
      { label: "Page web", icon: Globe },
      { label: "Messages", icon: MessageSquare, badge: 2 },
    ],
  },
]

function NavButton({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <a
      href="#"
      aria-current={item.active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        item.active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <Badge
          className={cn(
            "h-5 min-w-5 justify-center rounded-full px-1.5 text-xs",
            item.active
              ? "bg-sidebar-primary-foreground text-sidebar-primary"
              : "bg-primary text-primary-foreground",
          )}
        >
          {item.badge}
        </Badge>
      ) : null}
    </a>
  )
}

export function DashboardSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Leaf className="size-4" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
          NaturoDesk
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={cn(i > 0 && "mt-6")}>
            {section.title ? (
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.title}
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <NavButton key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <NavButton item={{ label: "Paramètres", icon: Settings }} />
      </div>
    </aside>
  )
}
