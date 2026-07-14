import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookMarked,
  CheckSquare,
  Clock,
  GitBranch,
  Lightbulb,
  ListChecks,
  Quote as QuoteIcon,
  ShieldAlert,
  Table as TableIcon,
} from "lucide-react";
import { FeatureAccordion } from "@/components/marketing/feature-accordion";
import type { BlogContentBlock } from "@/lib/blog/pipeline/content-types";

const CARD_STYLE = {
  background: "#fff",
  border: "1px solid var(--nd-line-soft)",
  boxShadow: "0 2px 8px rgba(61,74,51,.05)",
} as const;

function BlockCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl p-6 my-8" style={CARD_STYLE}>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0" style={{ background: "var(--nd-sage-tint)" }}>
          {icon}
        </span>
        <h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--nd-forest)" }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

const ICON_PROPS = { width: 16, height: 16, color: "var(--nd-sage-deep)" } as const;

function ComparisonTableBlock({ block }: { block: Extract<BlogContentBlock, { type: "comparisonTable" }> }) {
  return (
    <BlockCard icon={<TableIcon {...ICON_PROPS} />} title={block.caption}>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px] border-collapse">
          <thead>
            <tr>
              {block.headers.map((h, i) => (
                <th
                  key={i}
                  className="text-left font-semibold px-3 py-2"
                  style={{ color: "var(--nd-forest)", borderBottom: "1px solid var(--nd-line)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-3 py-2"
                    style={{ color: "var(--nd-muted)", borderBottom: "1px solid var(--nd-line-soft)" }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockCard>
  );
}

function FaqBlock({ block, label }: { block: Extract<BlogContentBlock, { type: "faq" }>; label: string }) {
  return (
    <div className="my-8">
      <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--nd-forest)" }}>
        {label}
      </h3>
      <FeatureAccordion items={block.items.map((i) => ({ question: i.q, answer: i.a }))} />
    </div>
  );
}

function ChecklistBlock({ block, label }: { block: Extract<BlogContentBlock, { type: "checklist" }>; label: string }) {
  return (
    <BlockCard icon={<CheckSquare {...ICON_PROPS} />} title={label}>
      <ul className="space-y-2.5 list-none p-0 m-0">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14.5px]" style={{ color: "var(--nd-muted)" }}>
            <CheckSquare style={{ width: 16, height: 16, color: "var(--nd-sage)", marginTop: 2, flexShrink: 0 }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </BlockCard>
  );
}

function PlanActionBlock({ block, label }: { block: Extract<BlogContentBlock, { type: "planAction" }>; label: string }) {
  return (
    <BlockCard icon={<ListChecks {...ICON_PROPS} />} title={label}>
      <ol className="space-y-4 list-none p-0 m-0">
        {block.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span
              className="w-6 h-6 rounded-full grid place-items-center text-[12px] font-bold flex-shrink-0"
              style={{ background: "var(--nd-sage)", color: "#fff" }}
            >
              {i + 1}
            </span>
            <div>
              <p className="text-[14.5px] font-semibold m-0" style={{ color: "var(--nd-forest)" }}>
                {step.title}
              </p>
              <p className="text-[14px] mt-0.5 m-0" style={{ color: "var(--nd-muted)" }}>
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </BlockCard>
  );
}

function CaseStudyBlock({ block, label }: { block: Extract<BlogContentBlock, { type: "caseStudy" }>; label: string }) {
  return (
    <BlockCard icon={<Lightbulb {...ICON_PROPS} />} title={label}>
      <p className="text-[14.5px] leading-relaxed m-0 italic" style={{ color: "var(--nd-muted)" }}>
        {block.body}
      </p>
    </BlockCard>
  );
}

function KeyTakeawaysBlock({ block, label }: { block: Extract<BlogContentBlock, { type: "keyTakeaways" }>; label: string }) {
  return (
    <BlockCard icon={<Lightbulb {...ICON_PROPS} />} title={label}>
      <ul className="space-y-2 list-disc pl-5 m-0">
        {block.items.map((item, i) => (
          <li key={i} className="text-[14.5px]" style={{ color: "var(--nd-muted)" }}>
            {item}
          </li>
        ))}
      </ul>
    </BlockCard>
  );
}

function SourcesBlock({ block, label }: { block: Extract<BlogContentBlock, { type: "sources" }>; label: string }) {
  return (
    <BlockCard icon={<BookMarked {...ICON_PROPS} />} title={label}>
      <ul className="space-y-2 list-none p-0 m-0">
        {block.items.map((item, i) => (
          <li key={i} className="text-[14px]" style={{ color: "var(--nd-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--nd-forest)" }}>
              {item.label}
            </span>
            {" — "}
            {item.note}
          </li>
        ))}
      </ul>
    </BlockCard>
  );
}

function TimelineBlock({ block, label }: { block: Extract<BlogContentBlock, { type: "timeline" }>; label: string }) {
  return (
    <BlockCard icon={<GitBranch {...ICON_PROPS} />} title={label}>
      <ol className="space-y-4 list-none p-0 m-0">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <Clock style={{ width: 15, height: 15, color: "var(--nd-sage-deep)", marginTop: 3, flexShrink: 0 }} />
            <div>
              <p className="text-[13.5px] font-semibold uppercase tracking-wide m-0" style={{ color: "var(--nd-sage-deep)" }}>
                {item.period}
              </p>
              <p className="text-[14.5px] mt-0.5 m-0" style={{ color: "var(--nd-muted)" }}>
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </BlockCard>
  );
}

function QuoteBlock({ block }: { block: Extract<BlogContentBlock, { type: "quote" }> }) {
  return (
    <blockquote
      className="my-8 pl-6 py-2"
      style={{ borderLeft: "3px solid var(--nd-sage)" }}
    >
      <div className="flex items-start gap-3">
        <QuoteIcon style={{ width: 20, height: 20, color: "var(--nd-sage)", flexShrink: 0 }} />
        <p
          className="font-serif text-[19px] leading-relaxed m-0"
          style={{ color: "var(--nd-forest)" }}
        >
          {block.text}
        </p>
      </div>
    </blockquote>
  );
}

function ExpertFocusBlock({ block, label }: { block: Extract<BlogContentBlock, { type: "expertFocus" }>; label: string }) {
  return (
    <div
      className="rounded-2xl p-6 my-8"
      style={{ background: "var(--nd-cream-deep)", border: "1px solid var(--nd-line)" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <ShieldAlert style={{ width: 18, height: 18, color: "var(--nd-taupe)" }} />
        <h3 className="text-[13px] font-extrabold uppercase tracking-[.08em] m-0" style={{ color: "var(--nd-taupe)" }}>
          {label}
        </h3>
      </div>
      <p className="text-[14.5px] leading-relaxed m-0" style={{ color: "var(--nd-forest)" }}>
        {block.body}
      </p>
    </div>
  );
}

function CommonMistakesBlock({ block, label }: { block: Extract<BlogContentBlock, { type: "commonMistakes" }>; label: string }) {
  return (
    <BlockCard icon={<AlertTriangle {...ICON_PROPS} />} title={label}>
      <ul className="space-y-3 list-none p-0 m-0">
        {block.items.map((item, i) => (
          <li key={i}>
            <p className="text-[14.5px] font-semibold m-0" style={{ color: "var(--nd-forest)" }}>
              {item.title}
            </p>
            <p className="text-[14px] mt-0.5 m-0" style={{ color: "var(--nd-muted)" }}>
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </BlockCard>
  );
}

/** Libellés d'en-tête par type de bloc (français — le blog est actuellement rendu en fr/en via le contenu lui-même, ces libellés structurels restent simples). */
const BLOCK_LABELS: Record<BlogContentBlock["type"], string> = {
  comparisonTable: "Comparatif",
  faq: "Questions fréquentes",
  checklist: "Checklist",
  planAction: "Plan d'action",
  caseStudy: "Cas concret",
  keyTakeaways: "Points clés à retenir",
  sources: "Sources",
  timeline: "Chronologie",
  quote: "",
  expertFocus: "Focus expert",
  commonMistakes: "Erreurs fréquentes",
};

/** Rend un bloc de contenu selon son type. */
export function renderBlogBlock(block: BlogContentBlock, key: number) {
  const label = BLOCK_LABELS[block.type];
  switch (block.type) {
    case "comparisonTable":
      return <ComparisonTableBlock key={key} block={block} />;
    case "faq":
      return <FaqBlock key={key} block={block} label={label} />;
    case "checklist":
      return <ChecklistBlock key={key} block={block} label={label} />;
    case "planAction":
      return <PlanActionBlock key={key} block={block} label={label} />;
    case "caseStudy":
      return <CaseStudyBlock key={key} block={block} label={label} />;
    case "keyTakeaways":
      return <KeyTakeawaysBlock key={key} block={block} label={label} />;
    case "sources":
      return <SourcesBlock key={key} block={block} label={label} />;
    case "timeline":
      return <TimelineBlock key={key} block={block} label={label} />;
    case "quote":
      return <QuoteBlock key={key} block={block} />;
    case "expertFocus":
      return <ExpertFocusBlock key={key} block={block} label={label} />;
    case "commonMistakes":
      return <CommonMistakesBlock key={key} block={block} label={label} />;
    default:
      return null;
  }
}
