"use client";

import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToTopProps {
  scrollContainerId?: string;
}

export function ScrollToTop({ scrollContainerId }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = scrollContainerId
      ? document.getElementById(scrollContainerId)
      : window;

    if (!target) return;

    const getScrollY = () =>
      scrollContainerId
        ? (target as HTMLElement).scrollTop
        : window.scrollY;

    const onScroll = () => setVisible(getScrollY() > 320);

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [scrollContainerId]);

  const handleClick = () => {
    if (scrollContainerId) {
      document.getElementById(scrollContainerId)?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Remonter en haut"
      title="Remonter en haut"
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-12 h-12 rounded-full",
        "flex items-center justify-center",
        "text-white",
        "shadow-lg",
        "transition-all duration-300 ease-out",
        "hover:scale-110 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-sage focus-visible:ring-offset-2",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
      )}
      style={{
        background: "linear-gradient(135deg, #799664 0%, #5E7349 100%)",
        boxShadow: visible ? "0 8px 24px -4px rgba(94,115,73,0.45), 0 2px 8px -2px rgba(94,115,73,0.3)" : undefined,
      }}
    >
      {/* Leaf ring */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border border-white/20"
      />
      {/* Decorative leaf dot — top-right */}
      <span
        aria-hidden
        className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-nd-cream border-2 border-nd-sage flex items-center justify-center"
      >
        <span className="w-1 h-1 rounded-full bg-nd-sage-deep" />
      </span>

      <Sprout size={20} strokeWidth={1.75} className="-translate-y-px" />
    </button>
  );
}
