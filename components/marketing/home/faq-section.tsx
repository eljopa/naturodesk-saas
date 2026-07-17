"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";

interface FaqItemProps {
  question: string;
  answer: string;
}

export function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ borderBottom: "1px solid var(--nd-line)" }}>
      <button
        className="w-full text-left flex items-center justify-between gap-5 py-6 px-1 font-serif font-medium text-[20px] leading-snug"
        style={{ background: "none", border: "none", color: "var(--nd-forest)", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <span
          className="flex-shrink-0 w-[30px] h-[30px] rounded-full grid place-items-center transition-transform duration-300"
          style={{
            border: "1px solid var(--nd-line)",
            background: open ? "var(--nd-sage-tint)" : "transparent",
            borderColor: open ? "var(--nd-sage-tint)" : "var(--nd-line)",
            transform: open ? "rotate(45deg)" : "none",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-4 h-4" style={{ color: "var(--nd-sage-deep)" }}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? (bodyRef.current?.scrollHeight ?? 400) + "px" : "0",
          transition: "max-height 0.38s cubic-bezier(.22,.61,.36,1)",
        }}
      >
        <div ref={bodyRef} className="pb-6 px-1 text-[16px] leading-relaxed" style={{ color: "var(--nd-muted)", maxWidth: "70ch" }}>
          {answer}
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const t = useTranslations("marketing.home.faq");
  const items = (["1","2","3","4","5"] as const).map(n => ({
    question: t(`q${n}`),
    answer:   t(`a${n}`),
  }));

  return (
    <section className="py-[110px] px-8" style={{ background: "var(--nd-cream-deep)" }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16 max-w-[640px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
          <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em]"
            style={{ fontSize: "clamp(30px,3.6vw,46px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
            {t("title")}
          </h2>
        </div>

        <div className="max-w-[800px] mx-auto">
          {items.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
