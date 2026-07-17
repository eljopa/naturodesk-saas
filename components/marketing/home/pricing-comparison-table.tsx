import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { COMPARISON_MATRIX, PLAN_IDS } from "@/lib/pricing-data";

function CheckMark({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6" title={label}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        className="w-[18px] h-[18px]"
        style={{ color: "var(--nd-sage)" }}
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function DashMark({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6" title={label}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        className="w-[14px] h-[14px]"
        style={{ color: "var(--nd-line)" }}
        aria-hidden="true"
      >
        <path d="M5 12h14" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export async function PricingComparisonTable() {
  const t = await getTranslations("marketing.home.pricing.matrix");

  const includedLabel = t("included");
  const notIncludedLabel = t("notIncluded");

  const columns: { id: (typeof PLAN_IDS)[number]; label: string }[] = [
    { id: "STARTER", label: t("colStarter") },
    { id: "GROWTH", label: t("colGrowth") },
    { id: "PRO", label: t("colPro") },
  ];

  return (
    <section className="py-[90px] px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[1000px] mx-auto">
        <div className="text-center mb-10 max-w-[640px] mx-auto">
          <h2
            className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-3"
            style={{ fontSize: "clamp(26px,3vw,36px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
          >
            {t("title")}
          </h2>
          <p style={{ fontSize: 16, color: "var(--nd-muted)", lineHeight: 1.6 }}>{t("subtitle")}</p>
        </div>

        <div
          role="region"
          aria-label={t("title")}
          tabIndex={0}
          className="overflow-x-auto rounded-2xl focus-visible:outline-none focus-visible:ring-2"
          style={{ border: "1px solid var(--nd-line)", background: "#fff" }}
        >
          <table className="w-full border-collapse text-[14px]" style={{ minWidth: 640 }}>
            <caption className="sr-only">{t("title")}</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 text-left px-5 py-4 font-serif font-medium text-[16px]"
                  style={{ background: "#fff", color: "var(--nd-forest)", borderBottom: "1px solid var(--nd-line)" }}
                >
                  &nbsp;
                </th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    scope="col"
                    className="text-center px-4 py-4 font-bold text-[13px] uppercase tracking-[.06em]"
                    style={{ color: "var(--nd-forest)", borderBottom: "1px solid var(--nd-line)" }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_MATRIX.map((category) => (
                <Fragment key={category.key}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={4}
                      className="sticky left-0 text-left px-5 pt-6 pb-2 text-[12px] font-extrabold uppercase tracking-[.08em]"
                      style={{ background: "var(--nd-cream-deep)", color: "var(--nd-copper-deep)" }}
                    >
                      {t(`categories.${category.key}.title` as Parameters<typeof t>[0])}
                    </th>
                  </tr>
                  {category.rows.map((row) => (
                    <tr key={row.key}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 text-left font-normal px-5 py-3"
                        style={{ background: "#fff", color: "var(--nd-ink)", borderBottom: "1px solid var(--nd-line)" }}
                      >
                        {t(`categories.${category.key}.${row.key}` as Parameters<typeof t>[0])}
                      </th>
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className="text-center px-4 py-3"
                          style={{ borderBottom: "1px solid var(--nd-line)" }}
                        >
                          {row.plans[col.id] ? (
                            <CheckMark label={includedLabel} />
                          ) : (
                            <DashMark label={notIncludedLabel} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
