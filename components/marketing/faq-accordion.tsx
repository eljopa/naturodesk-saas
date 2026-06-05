"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

interface FaqAccordionProps {
  sections: FaqSection[];
}

export function FaqAccordion({ sections }: FaqAccordionProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            {section.title}
          </h3>
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {section.items.map((item, i) => {
              const key = `${section.title}-${i}`;
              const isOpen = openKey === key;

              return (
                <div key={key}>
                  <button
                    className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left bg-white hover:bg-slate-50 transition-colors"
                    onClick={() => setOpenKey(isOpen ? null : key)}
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 bg-white">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
