/**
 * Orchestrateur du pipeline d'analyse médicaments.
 *
 * Pipeline :
 *   1. Chargement des Medication[] de la consultation (texte brut)
 *   2. Parse de chaque médicament → ParsedMedicationIntake
 *   3. Résolution vers un KnowledgeTerm(DRUG) :
 *        a. alias_dictionary (ALIAS_DICTIONARY)
 *        b. exact_key (KnowledgeTerm.normalizedKey)
 *        c. ILIKE fallback sur aliases[]
 *   4. Persistance ConsultationMedicationIntake (idempotent)
 *
 * Non-bloquant :
 *   Les erreurs de persistance n'interrompent pas le pipeline.
 *   Le runner retourne un MedicationRunSummary avec l'état détaillé.
 *
 * Garanties :
 *   - rawText toujours conservé intégralement
 *   - Idempotent : re-run nettoie les intakes précédents
 *   - Pas de dépendance vers supplement-runner (couplage zéro)
 */

import { db } from "@/lib/db";
import { parseMedicationIntake } from "./services/parse-medication-intake";
import { persistMedicationIntakes } from "./services/persist-medication-intakes";
import { matchDrugFromIntake } from "./services/drug-matcher";
import { buildNormalizedKey } from "@/lib/knowledge/terms/utils/normalize";
import { resolveAlias } from "@/lib/knowledge/terms/utils/aliases";
import type { MedicationIntakeWithResolution, MedicationRunSummary } from "./types";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Exécute le pipeline d'analyse médicaments pour une consultation.
 *
 * @throws Error si la consultation n'existe pas.
 */
export async function runMedicationAnalysis(
  consultationId: string,
): Promise<MedicationRunSummary> {
  const startedAt = Date.now();
  const errors: Array<{ context: string; error: string }> = [];

  console.log(`[medications] ▶ Démarrage — consultation=${consultationId}`);

  // ── 1. Chargement ────────────────────────────────────────────────────────
  const consultation = await db.consultation.findUnique({
    where:  { id: consultationId },
    select: { medications: { select: { name: true, dosage: true, frequency: true, duration: true } } },
  });

  if (!consultation) throw new Error(`Consultation ${consultationId} introuvable`);

  // Reconstruit la saisie brute complète depuis les champs Medication
  const rawEntries = consultation.medications
    .map((m) => {
      const parts = [m.name];
      if (m.dosage)    parts.push(m.dosage);
      if (m.frequency) parts.push(m.frequency);
      if (m.duration)  parts.push(m.duration);
      return parts.join(" ");
    })
    .filter((s) => s.trim().length > 0);

  if (rawEntries.length === 0) {
    console.log(`[medications] Aucun médicament — consultation=${consultationId}`);
    return {
      consultationId,
      inputCount:    0,
      matchedCount:  0,
      unmatchedCount: 0,
      intakesCreated: 0,
      durationMs:    Date.now() - startedAt,
      errors,
    };
  }

  console.log(`[medications] ${rawEntries.length} médicament(s) à analyser`);

  // ── 2. Parsing riche ─────────────────────────────────────────────────────
  const parsedIntakes = rawEntries.map((raw) => parseMedicationIntake(raw));

  // ── 3. Résolution KnowledgeTerm(DRUG) + matching BDPM ───────────────────
  const intakesWithResolution: MedicationIntakeWithResolution[] = [];
  let matchedCount   = 0;
  let unmatchedCount = 0;

  for (const parsed of parsedIntakes) {
    // Résolution KnowledgeTerm (existant)
    const termResolution = await resolveIntake(parsed);

    // Matching BDPM DrugProduct / DrugSubstance (nouveau)
    const bdpmMatch = await matchDrugFromIntake(parsed.parsedLabel, parsed.parsedBrandName);

    if (termResolution.knowledgeTermId || bdpmMatch.matchedBy !== "none") {
      matchedCount++;
    } else {
      unmatchedCount++;
    }

    if (bdpmMatch.matchedBy !== "none") {
      console.log(
        `[medications] bdpm_match : "${parsed.rawText.slice(0, 50)}" ` +
        `→ product=${bdpmMatch.drugProductId ?? "-"} substance=${bdpmMatch.drugSubstanceId ?? "-"} ` +
        `(${bdpmMatch.matchedBy} conf=${bdpmMatch.confidence})`
      );
    }

    intakesWithResolution.push({
      ...parsed,
      ...termResolution,
      drugProductId:   bdpmMatch.drugProductId,
      drugSubstanceId: bdpmMatch.drugSubstanceId,
    });
  }

  console.log(
    `[medications] Matching — reconnus=${matchedCount} non-reconnus=${unmatchedCount}`
  );

  // ── 4. Persistance ────────────────────────────────────────────────────────
  const persistResult = await persistMedicationIntakes(consultationId, intakesWithResolution);
  if (persistResult.errors.length > 0) errors.push(...persistResult.errors);

  const durationMs = Date.now() - startedAt;
  console.log(
    `[medications] ✓ Terminé — intakes=${persistResult.created} durée=${durationMs}ms`
  );

  return {
    consultationId,
    inputCount:    rawEntries.length,
    matchedCount,
    unmatchedCount,
    intakesCreated: persistResult.created,
    durationMs,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Résolution KnowledgeTerm(DRUG)
// ---------------------------------------------------------------------------

interface DrugResolution {
  knowledgeTermId:      string | null;
  canonicalName:        string | null;
  resolutionConfidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

async function resolveIntake(
  parsed: ReturnType<typeof parseMedicationIntake>,
): Promise<DrugResolution> {
  const key = parsed.normalizedKey;
  if (!key) return noMatch();

  // ── Étape 1 : alias_dictionary ───────────────────────────────────────────
  const aliasEntry = resolveAlias(key);
  if (aliasEntry?.termType === "DRUG") {
    const term = await db.knowledgeTerm.findUnique({
      where:  { normalizedKey: buildNormalizedKey(aliasEntry.canonicalName) },
      select: { id: true, canonicalName: true, termType: true },
    });
    if (term && term.termType === "DRUG") {
      logMatch(parsed.rawText, term.canonicalName, "alias_dictionary");
      return { knowledgeTermId: term.id, canonicalName: term.canonicalName, resolutionConfidence: "HIGH" };
    }
  }

  // ── Étape 2 : exact_key ──────────────────────────────────────────────────
  const exactTerm = await db.knowledgeTerm.findUnique({
    where:  { normalizedKey: key },
    select: { id: true, canonicalName: true, termType: true },
  });
  if (exactTerm?.termType === "DRUG") {
    logMatch(parsed.rawText, exactTerm.canonicalName, "exact_key");
    return { knowledgeTermId: exactTerm.id, canonicalName: exactTerm.canonicalName, resolutionConfidence: "HIGH" };
  }

  // ── Étape 3 : ILIKE fallback sur aliases[] ───────────────────────────────
  if (parsed.parsedLabel) {
    const rows = await db.$queryRaw<Array<{
      id: string; termType: string; canonicalName: string;
    }>>`
      SELECT id, "termType", "canonicalName"
      FROM knowledge_terms
      WHERE "termType" = 'DRUG'
        AND ${parsed.parsedLabel} ILIKE ANY(aliases)
      LIMIT 1
    `;
    if (rows.length > 0) {
      const r = rows[0]!;
      logMatch(parsed.rawText, r.canonicalName, "alias_db");
      return { knowledgeTermId: r.id, canonicalName: r.canonicalName, resolutionConfidence: "MEDIUM" };
    }
  }

  console.log(
    `[medications] not_found : "${parsed.rawText.slice(0, 50)}" (key=${key})`
  );
  return noMatch();
}

function noMatch(): DrugResolution {
  return { knowledgeTermId: null, canonicalName: null, resolutionConfidence: "NONE" };
}

function logMatch(raw: string, canonicalName: string, step: string): void {
  console.log(
    `[medications] matched : "${raw.slice(0, 50)}" → ${canonicalName} (${step})`
  );
}
