"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  HeadphonesIcon,
  ShieldCheck,
  Activity,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, superAdminOnly: false },
  { href: "/admin/users", label: "Utilisateurs", icon: Users, exact: false, superAdminOnly: false },
  { href: "/admin/subscriptions", label: "Abonnements", icon: CreditCard, exact: false, superAdminOnly: true },
  { href: "/admin/support", label: "Support", icon: HeadphonesIcon, exact: false, superAdminOnly: false },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck, exact: false, superAdminOnly: true },
  { href: "/admin/knowledge", label: "Knowledge", icon: Activity, exact: false, superAdminOnly: false },
] as const;

interface AdminShellProps {
  children: React.ReactNode;
  adminName: string;
  role: string;
}

function AdminSidebar({
  role,
  onClose,
  mobile = false,
}: {
  role: string;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex flex-col bg-slate-900 text-white",
        mobile
          ? "fixed inset-y-0 left-0 z-50 w-64"
          : "fixed inset-y-0 left-0 w-64 hidden lg:flex"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
        <div>
          <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-0.5">
            Super Admin
          </p>
          <p className="text-sm font-bold text-white">NaturoDesk</p>
        </div>
        {mobile && onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.filter((item) => !item.superAdminOnly || role === "SUPER_ADMIN").map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-teal-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Back to dashboard */}
      <div className="px-3 py-4 border-t border-slate-700">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({ children, adminName, role }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <AdminSidebar role={role} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <AdminSidebar role={role} mobile onClose={() => setSidebarOpen(false)} />
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 lg:px-8">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500">Admin :</span>
            <span className="text-xs font-medium text-slate-800">{adminName}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-700">
              {role}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
