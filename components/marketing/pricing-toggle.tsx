"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "feature1",
  "feature2",
  "feature3",
  "feature4",
  "feature5",
] as const;

const PRO_FEATURES = [
  "feature1",
  "feature2",
  "feature3",
  "feature4",
  "feature5",
  "feature6",
  "feature7",
] as const;

export function PricingSection() {
  const t = useTranslations("marketing.pricing");
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            !annual ? "text-slate-900" : "text-slate-400"
          )}
        >
          {t("toggleMonthly")}
        </span>
        <button
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual((a) => !a)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
            annual ? "bg-teal-700" : "bg-slate-300"
          )}
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
            "text-sm font-medium transition-colors",
            annual ? "text-slate-900" : "text-slate-400"
          )}
        >
          {t("toggleAnnual")}
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
            {t("annualDiscount")}
          </span>
        </span>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col">
          <div className="mb-6">
            <h3 className="font-semibold text-lg text-slate-900">
              {t("plans.free.name")}
            </h3>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-bold text-slate-900">
                {t("plans.free.price")}
              </span>
              <span className="text-slate-500 mb-1 text-sm">{t("perMonth")}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {t("plans.free.description")}
            </p>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Check className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                {t(`plans.free.${f}`)}
              </li>
            ))}
          </ul>

          <Button variant="secondary" size="lg" asChild>
            <Link href="/login">{t("plans.free.cta")}</Link>
          </Button>
        </div>

        {/* Pro */}
        <div className="rounded-2xl border-2 border-teal-700 bg-white p-8 flex flex-col relative">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-700 text-white">
            {t("plans.pro.badge")}
          </span>

          <div className="mb-6">
            <h3 className="font-semibold text-lg text-slate-900">
              {t("plans.pro.name")}
            </h3>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-bold text-slate-900">
                {annual ? t("plans.pro.priceAnnual") : t("plans.pro.priceMonthly")}
              </span>
              <span className="text-slate-500 mb-1 text-sm">{t("perMonth")}</span>
            </div>
            {annual && (
              <p className="text-xs text-teal-700 font-medium mt-1">
                {t("billedAnnually")}
              </p>
            )}
            <p className="mt-2 text-sm text-slate-500">
              {t("plans.pro.description")}
            </p>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Check className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                {t(`plans.pro.${f}`)}
              </li>
            ))}
          </ul>

          <Button variant="primary" size="lg" asChild>
            <Link href="/login">{t("plans.pro.cta")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
