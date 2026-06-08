"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PlanCardData {
  key: string;
  name: string;
  slogan: string;
  desc: string;
  monthlyPrice: number;
  yearlyMonthly: number;
  yearlyTotal: number;
  features: string[];
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
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className="w-[18px] h-[18px] flex-shrink-0"
      style={{ color: "var(--nd-sage)" }}
    >
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PricingGrid({
  plans,
  labelMonthly,
  labelYearly,
  labelDiscount,
  labelBilledAnnually,
}: PricingGridProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      {/* Toggle mensuel / annuel */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            !annual ? "text-slate-900" : "text-slate-400"
          )}
        >
          {labelMonthly}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
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
            annual ? "text-slate-900" : "text-slate-400"
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
      <div className="grid md:grid-cols-3 gap-6 items-start">
        {plans.map((plan) => {
          const price = annual ? plan.yearlyMonthly : plan.monthlyPrice;
          const ctaHref = annual ? plan.ctaHrefYearly : plan.ctaHrefMonthly;

          return (
            <div
              key={plan.key}
              className="rounded-2xl p-[34px] relative flex flex-col transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "#fff",
                border: plan.featured
                  ? "2px solid var(--nd-sage)"
                  : "1px solid var(--nd-line)",
                boxShadow: plan.featured
                  ? "0 14px 40px -18px rgba(61,74,51,.22)"
                  : undefined,
              }}
            >
              {plan.badge && (
                <span
                  className="absolute -top-[13px] left-1/2 -translate-x-1/2 inline-flex items-center px-4 py-1.5 rounded-full text-[11.5px] font-extrabold uppercase tracking-[.08em] text-white"
                  style={{ background: "var(--nd-sage)" }}
                >
                  {plan.badge}
                </span>
              )}

              <div className="mb-5">
                <h3
                  className="font-serif font-medium text-[24px] mb-0.5"
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
                className="text-[14px] mb-5"
                style={{ color: "var(--nd-muted)", minHeight: 36 }}
              >
                {plan.desc}
              </p>

              <div
                className="font-serif leading-none mb-1"
                style={{ fontSize: 46, color: "var(--nd-forest)" }}
              >
                {price} €
                <small
                  className="text-[15px] font-sans ml-1"
                  style={{ color: "var(--nd-muted)", fontWeight: 600 }}
                >
                  / mois
                </small>
              </div>

              {annual && (
                <p
                  className="text-[12px] mb-6"
                  style={{ color: "var(--nd-sage-deep)", fontWeight: 600 }}
                >
                  {labelBilledAnnually} — {plan.yearlyTotal} € / an
                </p>
              )}
              {!annual && <div className="mb-6" />}

              <ul className="list-none p-0 m-0 mb-8 grid gap-3 flex-1">
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-[14.5px]"
                    style={{ color: "var(--nd-ink)" }}
                  >
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>

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
          );
        })}
      </div>
    </>
  );
}
