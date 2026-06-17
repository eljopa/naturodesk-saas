"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import type { NavItemKey } from "./nav-config";

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  badgeCounts?: Partial<Record<NavItemKey, number>>;
}

/**
 * Wrapper client qui gère l'état du menu mobile.
 * Le layout parent (Server Component) charge l'utilisateur et passe les props.
 */
export function DashboardShell({
  children,
  userName,
  userEmail,
  badgeCounts,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar — fixed, 256px */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badgeCounts={badgeCounts}
      />

      {/* Zone principale — offset de la sidebar sur lg+ */}
      <div className="flex flex-col flex-1 min-w-0 lg:pl-64">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          userName={userName}
          userEmail={userEmail}
        />

        <main id="main-scroll" className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 lg:px-8 lg:py-8">{children}</div>
          <ScrollToTop scrollContainerId="main-scroll" />
        </main>
      </div>
    </div>
  );
}
