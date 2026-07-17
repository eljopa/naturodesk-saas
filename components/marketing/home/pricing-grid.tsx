"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PlanFeatureGroup {
  /** Undefined = plain bullet line, no subheading (e.g. "Tout Starter") */
  title?: string;
  items: string[];
}

export interface PlanCardData {
  key: string;
  name: string;
  slogan: string;
  desc: string;
  monthlyPrice: number;
  yearlyMonthly: number;
  yearlyTotal: number;
  groups: PlanFeatureGroup[];
  cta: string;
  badge?: string;
  note?: string;
  featured?: boolean;
  ctaHrefMonthly: string;
  ctaHrefYearly: string;
}

interface PricingGridProps {
  plans: PlanCardData[];
  labelMonthly: string;
  labelYearly: string;
  labelDiscount: string;
  labelBilledAnnually: string;
  labelPerMonth: string;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className="w-[17px] h-[17px] flex-shrink-0 mt-[1.5px]"
      style={{ color: "var(--nd-sage)" }}
    >
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className="w-[17px] h-[17px] flex-shrink-0 mt-[1.5px]"
      style={{ color: "var(--nd-forest)" }}
    >
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PricingGrid({
  plans,
  labelMonthly,
  labelYearly,
  labelDiscount,
  labelBilledAnnually,
  labelPerMonth,
}: PricingGridProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      {/* Toggle mensuel / annuel */}
      <div
        className="flex items-center justify-center gap-3 mb-10"
        role="group"
        aria-label={`${labelMonthly} / ${labelYearly}`}
      >
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            !annual ? "text-slate-900" : "text-slate-500"
          )}
        >
          {labelMonthly}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label={`${labelMonthly} / ${labelYearly}`}
          onClick={() => setAnnual((a) => !a)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            background: annual ? "var(--nd-sage)" : "var(--nd-line)",
            focusVisibleRingColor: "var(--nd-sage)",
          } as React.CSSProperties}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
              annual ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
        <span
          className={cn(
            "text-sm font-medium transition-colors flex items-center gap-2",
            annual ? "text-slate-900" : "text-slate-500"
          )}
        >
          {labelYearly}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-white"
            style={{ background: "var(--nd-sage)" }}
          >
            {labelDiscount}
          </span>
        </span>
      </div>

      {/* Grille plans */}
      <div className="grid md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => {
          const price = annual ? plan.yearlyMonthly : plan.monthlyPrice;
          const ctaHref = annual ? plan.ctaHrefYearly : plan.ctaHrefMonthly;

          return (
            <div
              key={plan.key}
              className="rounded-2xl p-[34px] relative flex flex-col h-full transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "#fff",
                border: plan.featured
                  ? "2px solid var(--nd-sage)"
                  : "1px solid var(--nd-line)",
                boxShadow: plan.featured
                  ? "0 18px 46px -20px rgba(61,74,51,.28)"
                  : "0 2px 10px -4px rgba(61,74,51,.06)",
              }}
            >
              {plan.badge && (
                <span
                  className="absolute -top-[14px] left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11.5px] font-extrabold uppercase tracking-[.08em] text-white shadow-sm"
                  style={{ background: "var(--nd-sage)" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                    <path d="M12 2 14.6 8.6 21.5 9.3 16.3 13.8 17.9 20.6 12 17 6.1 20.6 7.7 13.8 2.5 9.3 9.4 8.6Z" />
                  </svg>
                  {plan.badge}
                </span>
              )}

              <div className="mb-5">
                <h3
                  className="font-serif font-medium text-[24px] mb-1"
                  style={{ color: "var(--nd-forest)" }}
                >
                  {plan.name}
                </h3>
                <p
                  className="text-[12.5px] font-bold uppercase tracking-[.1em]"
                  style={{ color: "var(--nd-copper)" }}
                >
                  {plan.slogan}
                </p>
              </div>

              <p
                className="text-[14.5px] font-medium mb-6"
                style={{ color: "var(--nd-ink)", opacity: 0.75, minHeight: 44 }}
              >
                {plan.desc}
              </p>

              <div
                className="font-serif leading-none mb-1 flex items-baseline gap-1.5"
                style={{ fontSize: 46, color: "var(--nd-forest)" }}
              >
                {price} €
                <small
                  className="text-[15px] font-sans"
                  style={{ color: "var(--nd-muted)", fontWeight: 600 }}
                >
                  {labelPerMonth}
                </small>
              </div>

              <p
                className="text-[12px] mb-6"
                style={{ color: "var(--nd-sage-deep)", fontWeight: 600, minHeight: 16 }}
              >
                {annual ? `${labelBilledAnnually} — ${plan.yearlyTotal} €` : " "}
              </p>

              <div className="flex-1 flex flex-col gap-5 mb-8">
                {plan.groups.map((group, gi) => (
                  <div key={gi}>
                    {group.title && (
                      <p
                        className="text-[11.5px] font-extrabold uppercase tracking-[.07em] mb-2.5 pb-1.5"
                        style={{ color: "var(--nd-forest)", borderBottom: "1px solid var(--nd-line)" }}
                      >
                        {group.title}
                      </p>
                    )}
                    <ul className="list-none p-0 m-0 grid gap-2.5">
                      {group.items.map((item, ii) => (
                        <li
                          key={ii}
                          className={cn(
                            "flex gap-2.5 text-[14px] leading-snug",
                            !group.title && "font-bold"
                          )}
                          style={{ color: "var(--nd-ink)" }}
                        >
                          {group.title ? <CheckIcon /> : <ArrowIcon />}
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <Link
                  href={ctaHref}
                  className="flex justify-center items-center w-full py-[14px] rounded-full font-bold text-[15px] transition-all duration-200"
                  style={
                    plan.featured
                      ? { background: "var(--nd-sage)", color: "#fff" }
                      : {
                          background: "transparent",
                          color: "var(--nd-forest)",
                          border: "1.5px solid var(--nd-line)",
                        }
                  }
                >
                  {plan.cta}
                </Link>

                {plan.note && (
                  <p
                    className="mt-3 text-center text-[12px] leading-relaxed"
                    style={{ color: "var(--nd-muted)" }}
                  >
                    {plan.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
