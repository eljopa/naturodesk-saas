"use client";

import { useState } from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

export function FeatureAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--nd-line-soft)" }}
    >
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            style={{ borderBottom: i < items.length - 1 ? "1px solid var(--nd-line-soft)" : "none" }}
          >
            <button
              className="w-full flex items-start justify-between gap-4 px-6 py-5 text-left transition-colors duration-150"
              style={{
                background: isOpen ? "var(--nd-sage-wash)" : "#fff",
                color: "var(--nd-forest)",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="text-[15px] font-semibold leading-snug">
                {item.question}
              </span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="flex-shrink-0 mt-0.5"
                style={{
                  width: 18,
                  height: 18,
                  stroke: "var(--nd-sage-deep)",
                  strokeWidth: 2,
                  transform: isOpen ? "rotate(180deg)" : "none",
                  transition: "transform .2s",
                }}
              >
                <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isOpen && (
              <div
                className="px-6 pb-5 pt-1"
                style={{ background: "var(--nd-sage-wash)" }}
              >
                <p
                  className="text-[14.5px] leading-relaxed m-0"
                  style={{ color: "var(--nd-muted)" }}
                >
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
