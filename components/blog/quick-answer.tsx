import { Sparkles } from "lucide-react";

interface QuickAnswerProps {
  label: string;
  text: string;
}

/** Callout "Réponse rapide" — bloc GEO pensé pour être cité par les moteurs IA (spec §5.7). */
export function QuickAnswer({ label, text }: QuickAnswerProps) {
  return (
    <div
      className="flex gap-4 p-6 rounded-2xl my-8"
      style={{ background: "var(--nd-sage-wash)", border: "1px solid var(--nd-sage-tint)" }}
    >
      <span
        className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
        style={{ background: "var(--nd-sage-tint)" }}
      >
        <Sparkles style={{ width: 18, height: 18, color: "var(--nd-sage-deep)" }} />
      </span>
      <div>
        <p className="text-[12px] font-extrabold uppercase tracking-[.1em] mb-1.5" style={{ color: "var(--nd-sage-deep)" }}>
          {label}
        </p>
        <p className="text-[16px] leading-relaxed m-0" style={{ color: "var(--nd-forest)" }}>
          {text}
        </p>
      </div>
    </div>
  );
}
