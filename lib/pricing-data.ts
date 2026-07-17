// Shared structure for the pricing page: which feature groups appear on which
// card, and the plan-by-plan comparison matrix. Copy lives in messages/*.json
// under marketing.home.pricing — this file only describes the *shape* and the
// *actual* per-plan availability, so cards and the comparison table can never
// drift apart. Safe to import from both Server and Client Components (no
// env access, no "use server").

export type PlanId = "STARTER" | "GROWTH" | "PRO";

export const PLAN_IDS: PlanId[] = ["STARTER", "GROWTH", "PRO"];

// ---------------------------------------------------------------------------
// Card feature groups
// ---------------------------------------------------------------------------

export interface PricingFeatureGroup {
  /** Translation key under marketing.home.pricing.groups.<key> */
  key: string;
  /** Whether this group renders its own subheading (false = plain bullet(s), e.g. "Tout Starter") */
  heading: boolean;
  itemCount: number;
}

export const PLAN_GROUPS: Record<PlanId, PricingFeatureGroup[]> = {
  STARTER: [
    { key: "starterClinical", heading: true, itemCount: 5 },
    { key: "starterCabinet", heading: true, itemCount: 5 },
  ],
  GROWTH: [
    { key: "growthIncludes", heading: false, itemCount: 1 },
    { key: "growthPresence", heading: true, itemCount: 5 },
    { key: "growthBooking", heading: true, itemCount: 4 },
  ],
  PRO: [
    { key: "proIncludes", heading: false, itemCount: 1 },
    { key: "proToolkit", heading: true, itemCount: 4 },
  ],
};

// ---------------------------------------------------------------------------
// Comparison matrix — reflects actual code-level access (isPlanAtLeast gates).
// Only the professional page + online booking are Growth+; everything else
// (clinical engine, protocols, advice sheets, billing, agenda) is available
// from Starter since there is no other plan gate in the codebase today.
// ---------------------------------------------------------------------------

export interface ComparisonRow {
  /** Translation key under marketing.home.pricing.matrix.categories.<categoryKey>.<key> */
  key: string;
  plans: Record<PlanId, boolean>;
}

export interface ComparisonCategory {
  /** Translation key under marketing.home.pricing.matrix.categories.<key>.title */
  key: string;
  rows: ComparisonRow[];
}

const ALL_INCLUDED: Record<PlanId, boolean> = { STARTER: true, GROWTH: true, PRO: true };
const GROWTH_AND_UP: Record<PlanId, boolean> = { STARTER: false, GROWTH: true, PRO: true };

export const COMPARISON_MATRIX: ComparisonCategory[] = [
  {
    key: "records",
    rows: [
      { key: "unlimitedPatients", plans: ALL_INCLUDED },
      { key: "vitalityAssessment", plans: ALL_INCLUDED },
      { key: "history", plans: ALL_INCLUDED },
      { key: "pdfExport", plans: ALL_INCLUDED },
    ],
  },
  {
    key: "clinical",
    rows: [
      { key: "symptomAnalysis", plans: ALL_INCLUDED },
      { key: "sideEffects", plans: ALL_INCLUDED },
      { key: "interactions", plans: ALL_INCLUDED },
      { key: "depletions", plans: ALL_INCLUDED },
      { key: "findings", plans: ALL_INCLUDED },
    ],
  },
  {
    key: "protocols",
    rows: [
      { key: "adviceSheets", plans: ALL_INCLUDED },
      { key: "versioning", plans: ALL_INCLUDED },
      { key: "aiDraft", plans: ALL_INCLUDED },
      { key: "templateLibrary", plans: ALL_INCLUDED },
      { key: "pdfExport", plans: ALL_INCLUDED },
    ],
  },
  {
    key: "billing",
    rows: [
      { key: "autoNumbering", plans: ALL_INCLUDED },
      { key: "paymentMethods", plans: ALL_INCLUDED },
      { key: "pdfExport", plans: ALL_INCLUDED },
    ],
  },
  {
    key: "agenda",
    rows: [
      { key: "weeklyCalendar", plans: ALL_INCLUDED },
      { key: "availability", plans: ALL_INCLUDED },
      { key: "confirmationEmail", plans: ALL_INCLUDED },
      { key: "reminderEmail", plans: ALL_INCLUDED },
    ],
  },
  {
    key: "onlinePresence",
    rows: [
      { key: "professionalPage", plans: GROWTH_AND_UP },
      { key: "googleReviews", plans: GROWTH_AND_UP },
      { key: "contactForm", plans: GROWTH_AND_UP },
      { key: "localSeo", plans: GROWTH_AND_UP },
    ],
  },
  {
    key: "onlineBooking",
    rows: [
      { key: "bookingWidget", plans: GROWTH_AND_UP },
      { key: "realtimeSlots", plans: GROWTH_AND_UP },
      { key: "noDoubleBooking", plans: GROWTH_AND_UP },
    ],
  },
];
