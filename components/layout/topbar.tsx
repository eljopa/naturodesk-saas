"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
  userName: string;
  userEmail: string;
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold shrink-0 select-none">
      {initials || "?"}
    </div>
  );
}

export function Topbar({ onMenuClick, userName, userEmail }: TopbarProps) {
  const t = useTranslations("topbar");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-white border-b border-slate-200 shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label={t("openMenu")}
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      {/* User dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-colors duration-150",
            dropdownOpen
              ? "border-slate-300 bg-slate-50"
              : "border-transparent hover:border-slate-200 hover:bg-slate-50"
          )}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <UserAvatar name={userName} />
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-900 leading-none">
              {userName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 leading-none">
              {userEmail}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-slate-400 transition-transform duration-150",
              dropdownOpen && "rotate-180"
            )}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50">
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-medium text-slate-900 truncate">
                {userName}
              </p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>

            <div className="h-px bg-slate-100 mx-2 mb-1" />

            <Link
              href="/settings"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              {t("settingsLink")}
            </Link>

            <div className="h-px bg-slate-100 mx-2 my-1" />

            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t("logout")}
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
