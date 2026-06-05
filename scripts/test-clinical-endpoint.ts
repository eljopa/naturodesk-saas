/**
 * scripts/test-clinical-endpoint.ts
 *
 * Tests d'intégration du endpoint POST /api/analysis/clinical.
 * Effectue des appels HTTP réels sur le serveur Next.js local.
 *
 * Prérequis :
 *   1. Serveur Next.js démarré : npm run dev
 *   2. Session authentifiée : un cookie de session valide dans TEST_SESSION_COOKIE
 *      OU un token Bearer dans TEST_BEARER_TOKEN
 *
 * Pour obtenir le cookie de session :
 *   - Connecter l'application dans le navigateur
 *   - Ouvrir DevTools → Application → Cookies → copier la valeur de sb-*-auth-token
 *   - Coller dans .env.local : TEST_SESSION_COOKIE=sb-xxx-auth-token=eyJ...
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' \
 *     scripts/test-clinical-endpoint.ts
 *
 * Variables d'environnement utilisées :
 *   TEST_BASE_URL         — défaut: http://localhost:3000
 *   TEST_SESSION_COOKIE   — cookie de session Supabase complet
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE_URL   = process.env.TEST_BASE_URL   ?? "http://localhost:3000";
const COOKIE     = process.env.TEST_SESSION_COOKIE ?? "";
const ENDPOINT   = `${BASE_URL}/api/analysis/clinical`;

if (!COOKIE) {
  console.error(
    "\n⚠ TEST_SESSION_COOKIE absent dans .env.local\n" +
    "  Récupérer le cookie de session depuis les DevTools du navigateur.\n" +
    "  Exemple : TEST_SESSION_COOKIE=sb-xxx-auth-token=eyJ...\n",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CallResult {
  status: number;
  body:   unknown;
  ms:     number;
}

async function callEndpoint(payload: unknown): Promise<CallResult> {
  const t0  = Date.now();
  const res = await fetch(ENDPOINT, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie":        COOKIE,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, ms: Date.now() - t0 };
}

function hr(label: string) {
  console.log(`\n${"═".repeat(65)}`);
  console.log(`  ${label}`);
  console.log("═".repeat(65));
}

function printMeta(body: Record<string, unknown>) {
  const meta = body.meta as Record<string, unknown> | undefined;
  if (!meta) return;
  console.log(`  items     : ${meta.itemCount} (T1=${meta.tier1Count} T2=${meta.tier2Count} T4=${meta.tier4Count})`);
  console.log(`  durée     : moteur=${meta.durationMs}ms  total=${meta.totalDurationMs}ms`);
  if (Array.isArray(meta.unresolvedDrugs)   && meta.unresolvedDrugs.length > 0)
    console.log(`  ⚠ non résolus  : ${meta.unresolvedDrugs.join(", ")}`);
  if (Array.isArray(meta.unmatchedSymptoms) && meta.unmatchedSymptoms.length > 0)
    console.log(`  ⚠ non matchés  : ${meta.unmatchedSymptoms.join(", ")}`);
}

function printItems(body: Record<string, unknown>) {
  const items = body.items as Array<Record<string, unknown>> | undefined;
  if (!items || items.length === 0) return;
  console.log("\n  Items :");
  for (const item of items) {
    const tier     = item.tier as string;
    const scoring  = item.scoring as Record<string, unknown>;
    const conf     = `conf=${scoring.confidencePct}%`;
    const details  = [
      scoring.frequencyFactor   ? `freq=${Math.round((scoring.frequencyFactor as number) * 100)}%`     : null,
      scoring.evidenceCeiling   ? `ceil=${Math.round((scoring.evidenceCeiling as number) * 100)}%`     : null,
      scoring.temporalModifier  !== 0 ? `temp=${scoring.temporalModifier as number >= 0 ? "+" : ""}${Math.round((scoring.temporalModifier as number) * 100)}%` : null,
      scoring.corroborationBoost as number > 0 ? `boost=+${Math.round((scoring.corroborationBoost as number) * 100)}%` : null,
    ].filter(Boolean).join(" ");

    const symptom  = (item.symptom as Record<string, unknown> | null)?.label ?? item.rawSymptomFragment ?? "?";
    const substance = (item.substance as Record<string, unknown> | null)?.canonicalName ?? "—";
    const nutrient  = (item.nutrient  as Record<string, unknown> | null)?.label ?? null;

    if (tier === "TIER_1_DIRECT") {
      console.log(`  [T1] ${substance} → ${symptom}  ${conf} (${details})`);
    } else if (tier === "TIER_2_INDIRECT") {
      if (nutrient) {
        console.log(`  [T2-DEP] ${substance} →[${nutrient}]→ ${symptom}  ${conf} (${details})`);
      } else {
        console.log(`  [T2-SEC] ${substance} → ${symptom}  ${conf} (${details})`);
      }
    } else {
      console.log(`  [T4] "${symptom}" — aucune correspondance`);
    }
  }
}

function printSummary(body: Record<string, unknown>) {
  const summary = body.summary as string | undefined;
  if (!summary) return;
  console.log("\n  Synthèse :");
  for (const line of summary.split("\n").slice(0, 8)) {
    if (line.trim()) console.log(`  ${line}`);
  }
  if (summary.split("\n").length > 8) console.log("  [...]");
}

async function runTest(label: string, payload: unknown, expectedStatus: number) {
  hr(label);
  const { status, body, ms } = await callEndpoint(payload);

  const ok = status === expectedStatus;
  console.log(`  HTTP ${status} ${ok ? "✓" : `✗ attendu ${expectedStatus}`}  (${ms}ms total)`);

  const b = body as Record<string, unknown>;

  if (!ok || status >= 400) {
    console.log("  Réponse :", JSON.stringify(body, null, 2).slice(0, 400));
    return;
  }

  console.log(`  analysisId : ${b.analysisId}`);
  printMeta(b);
  printItems(b);
  printSummary(b);
}

// ---------------------------------------------------------------------------
// Cas de test
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nEndpoint : ${ENDPOINT}`);
  console.log(`Cookie   : ${COOKIE.slice(0, 40)}...`);

  // ── Test 1 : Sertraline + fatigue/insomnie/céphalée ──────────────────────
  await runTest(
    "1 — Sertraline + fatigue/insomnie/céphalée [201 attendu]",
    {
      rawSymptoms: "fatigue, insomnie, céphalée",
      drugs:       [{ name: "sertraline", dosage: "50mg/j" }],
    },
    201,
  );

  // ── Test 2 : Metformine + fatigue/paresthésie ─────────────────────────────
  await runTest(
    "2 — Metformine + fatigue/paresthésie [201 attendu]",
    {
      rawSymptoms: "fatigue, paresthésie",
      drugs:       [{ name: "metformine", dosage: "1000mg/j" }],
    },
    201,
  );

  // ── Test 3 : Atorvastatine arrêtée + myalgie (temporalité incohérente) ────
  await runTest(
    "3 — Atorvastatine arrêtée + myalgie [201, temporalModifier=-0.15]",
    {
      rawSymptoms: "myalgie",
      drugs: [
        {
          name:      "atorvastatine",
          stoppedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    201,
  );

  // ── Test 4 : Multi-médicaments ────────────────────────────────────────────
  await runTest(
    "4 — Multi-médicaments (sertraline + oméprazole + metformine) [201 attendu]",
    {
      rawSymptoms: "fatigue, nausée, paresthésie, insomnie",
      drugs: [
        { name: "sertraline",  dosage: "50mg/j" },
        { name: "omeprazole",  dosage: "20mg/j" },
        { name: "metformine",  dosage: "500mg/j" },
      ],
    },
    201,
  );

  // ── Test 5 : Payload vide (400 attendu) ───────────────────────────────────
  await runTest(
    "5 — Payload vide [400 attendu]",
    {},
    400,
  );

  // ── Test 6 : rawSymptoms manquant (400 attendu) ───────────────────────────
  await runTest(
    "6 — rawSymptoms manquant [400 attendu]",
    {
      drugs: [{ name: "sertraline" }],
    },
    400,
  );

  // ── Test 7 : tableau drugs vide (400 attendu) ─────────────────────────────
  await runTest(
    "7 — Tableau drugs vide [400 attendu]",
    {
      rawSymptoms: "fatigue",
      drugs:       [],
    },
    400,
  );

  // ── Test 8 : assessedAt ISO invalide (400 attendu) ────────────────────────
  await runTest(
    "8 — assessedAt non-ISO [400 attendu]",
    {
      rawSymptoms: "fatigue",
      drugs:       [{ name: "sertraline" }],
      assessedAt:  "pas-une-date",
    },
    400,
  );

  // ── Test 9 : consultationId invalide (400 attendu) ────────────────────────
  await runTest(
    "9 — consultationId non-UUID [400 attendu]",
    {
      rawSymptoms:    "fatigue",
      drugs:          [{ name: "sertraline" }],
      consultationId: "pas-un-uuid",
    },
    400,
  );

  // ── Test 10 : consultationId UUID inexistant (404 attendu) ────────────────
  await runTest(
    "10 — consultationId UUID inexistant [404 attendu]",
    {
      rawSymptoms:    "fatigue",
      drugs:          [{ name: "sertraline" }],
      consultationId: "00000000-0000-0000-0000-000000000000",
    },
    404,
  );

  console.log("\n" + "═".repeat(65));
  console.log("  Tests terminés");
  console.log("═".repeat(65) + "\n");
}

main().catch((err) => {
  console.error("Erreur fatale :", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
