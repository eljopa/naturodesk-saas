/**
 * lib/analysis/services/build-bdpm-context.ts
 *
 * Construit un contexte BDPM structuré à partir des médicaments d'une consultation.
 *
 * Pipeline :
 *   1. Parsing de chaque nom de médicament (label + brand)
 *   2. Matching BDPM → DrugProduct / DrugSubstance
 *   3. Chargement des compositions (substances actives avec dosages)
 *   4. Lookup KnowledgeTerm → KnowledgeFact (interactions, déplétion…)
 *   5. Lookup KnowledgeChunk par drugKey (si Pipeline B alimenté)
 *   6. Génération du summaryText injecté dans le prompt LLM
 *
 * Graceful degradation :
 *   - Médicament non résolu → inclus sans enrichissement (inputLabel conservé)
 *   - KnowledgeFact / KnowledgeChunk absents → sections vides (Pipeline B non encore actif)
 *   - Erreur individuelle → logguée, médicament inclus sans enrichissement
 */

import { db } from "@/lib/db";
import { matchDrugFromIntake } from "@/lib/knowledge/medications/services/drug-matcher";
import { parseMedicationIntake } from "@/lib/knowledge/medications/services/parse-medication-intake";

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export interface BdpmChunkContext {
  id:         string;
  text:       string;
  kind:       string;
  score:      number | null;
}

export interface BdpmFactContext {
  predicate: string;
  object:    string;
  qualifier: string | null;
}

export interface BdpmMedContext {
  inputLabel:       string;
  drugProductId:    string | null;
  drugSubstanceId:  string | null;
  productName:      string | null;   // Nom officiel BDPM (ex: "DOLIPRANE 1000 mg, comprimé pelliculé")
  substanceName:    string | null;   // DCI officielle (ex: "Paracétamol")
  activeSubstances: Array<{          // compositions du produit (depuis DrugProductSubstance)
    name:       string;
    dosage:     string | null;       // ex: "1000 mg"
  }>;
  relevantChunks:   BdpmChunkContext[];
  relevantFacts:    BdpmFactContext[];
}

export interface BdpmAnalysisContext {
  medications:  BdpmMedContext[];
  summaryText:  string;             // bloc markdown prêt à injecter dans le prompt LLM
}

// ---------------------------------------------------------------------------
// Service principal
// ---------------------------------------------------------------------------

/**
 * Construit le contexte BDPM pour une liste de noms de médicaments.
 * Appelé dans le pipeline d'analyse avant l'appel LLM.
 */
export async function buildBdpmContext(
  medicationNames: string[],
): Promise<BdpmAnalysisContext> {
  if (medicationNames.length === 0) {
    return { medications: [], summaryText: "" };
  }

  const medications: BdpmMedContext[] = [];

  for (const name of medicationNames) {
    try {
      const med = await enrichOneMedication(name);
      const resolved = med.drugProductId ?? med.drugSubstanceId;
      console.log(
        `[bdpm-context] "${name.slice(0, 50)}" → ` +
        (resolved
          ? `product=${med.drugProductId ?? "-"} substance=${med.drugSubstanceId ?? "-"} ` +
            `substances=${med.activeSubstances.length} facts=${med.relevantFacts.length} chunks=${med.relevantChunks.length}`
          : "non résolu"),
      );
      medications.push(med);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[bdpm-context] Enrichissement échoué pour "${name}" : ${msg}`);
      medications.push({
        inputLabel:       name,
        drugProductId:    null,
        drugSubstanceId:  null,
        productName:      null,
        substanceName:    null,
        activeSubstances: [],
        relevantChunks:   [],
        relevantFacts:    [],
      });
    }
  }

  const summaryText = buildSummaryText(medications);
  return { medications, summaryText };
}

// ---------------------------------------------------------------------------
// Enrichissement d'un médicament
// ---------------------------------------------------------------------------

async function enrichOneMedication(name: string): Promise<BdpmMedContext> {
  const parsed  = parseMedicationIntake(name);
  const match   = await matchDrugFromIntake(parsed.parsedLabel, parsed.parsedBrandName);

  let productName:    string | null = null;
  let substanceName:  string | null = null;
  const activeSubstances: BdpmMedContext["activeSubstances"] = [];
  const relevantFacts:    BdpmFactContext[] = [];
  const relevantChunks:   BdpmChunkContext[] = [];

  // ── Produit ────────────────────────────────────────────────────────────────
  if (match.drugProductId) {
    const product = await db.drugProduct.findUnique({
      where:  { id: match.drugProductId },
      select: {
        name: true,
        substances: {
          select: {
            dosageValue:  true,
            dosageUnit:   true,
            substance:    { select: { canonicalName: true } },
          },
          orderBy: { substanceOrder: "asc" },
        },
      },
    });

    if (product) {
      productName = product.name;
      for (const ps of product.substances) {
        const dosage =
          ps.dosageValue != null && ps.dosageUnit
            ? `${ps.dosageValue} ${ps.dosageUnit}`
            : ps.dosageUnit ?? null;
        activeSubstances.push({ name: ps.substance.canonicalName, dosage });
      }
    }
  }

  // ── Substance (directe ou via premier produit) ─────────────────────────────
  let resolvedSubstanceId =
    match.drugSubstanceId ??
    (match.drugProductId ? await getFirstSubstanceId(match.drugProductId) : null);

  if (!resolvedSubstanceId && activeSubstances.length > 0) {
    // Fallback : première substance active du produit par normalizedKey
    const firstSubstanceName = activeSubstances[0]?.name;
    if (firstSubstanceName) {
      const sub = await db.drugSubstance.findFirst({
        where:  { canonicalName: { equals: firstSubstanceName, mode: "insensitive" } },
        select: { id: true },
      });
      resolvedSubstanceId = sub?.id ?? null;
    }
  }

  if (resolvedSubstanceId) {
    const substance = await db.drugSubstance.findUnique({
      where:  { id: resolvedSubstanceId },
      select: {
        canonicalName:  true,
        normalizedKey:  true,
        knowledgeTermId: true,  // lien direct établi par seed-knowledge-facts-clinical
      },
    });

    if (substance) {
      substanceName = substance.canonicalName;

      // ── KnowledgeTerm → KnowledgeFact ──────────────────────────────────────
      // Priorité 1 : lien direct DrugSubstance.knowledgeTermId (exact, fiable)
      // Priorité 2 : lookup par normalizedKey (fallback Pipeline B / seed-drug-terms)
      const factSelectClause = {
        select: { predicate: true, object: true, qualifier: true, confidence: true },
        orderBy: { confidence: "desc" as const },
        take: 5,
      } as const;

      let term: {
        id: string;
        factsAsSubject: Array<{ predicate: string; object: string; qualifier: string | null; confidence: number }>;
      } | null = null;

      if (substance.knowledgeTermId) {
        term = await db.knowledgeTerm.findUnique({
          where:  { id: substance.knowledgeTermId },
          select: {
            id: true,
            factsAsSubject: factSelectClause,
          },
        });
      }

      if (!term) {
        term = await db.knowledgeTerm.findFirst({
          where:  { normalizedKey: substance.normalizedKey },
          select: {
            id: true,
            factsAsSubject: factSelectClause,
          },
        });
      }

      if (term) {
        for (const f of term.factsAsSubject) {
          relevantFacts.push({
            predicate: f.predicate,
            object:    f.object,
            qualifier: f.qualifier,
          });
        }

        // ── KnowledgeChunk via drug_key (Pipeline B — BDPM RAG) ──────────────
        // Note : KnowledgeDocument(BDPM) est vide tant que Pipeline B n'a pas tourné.
        // Les chunks seront récupérés automatiquement dès que l'ingestion n8n/BDPM est active.
        const chunks = await db.$queryRaw<Array<{ id: string; excerpt: string; kind: string }>>`
          SELECT kc.id, kc.excerpt, kc.kind
          FROM knowledge_chunks kc
          JOIN knowledge_documents kd ON kd.id = kc."documentId"
          WHERE kd."drugKey" = ${substance.normalizedKey}
            AND kc.embedding IS NOT NULL
          ORDER BY kc."createdAt" DESC
          LIMIT 3
        `;
        for (const c of chunks) {
          relevantChunks.push({ id: c.id, text: c.excerpt, kind: c.kind, score: null });
        }
      }
    }
  }

  return {
    inputLabel:      name,
    drugProductId:   match.drugProductId,
    drugSubstanceId: match.drugSubstanceId,
    productName,
    substanceName,
    activeSubstances,
    relevantChunks,
    relevantFacts,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getFirstSubstanceId(productId: string): Promise<string | null> {
  const ps = await db.drugProductSubstance.findFirst({
    where:   { productId },
    select:  { substanceId: true },
    orderBy: { substanceOrder: "asc" },
  });
  return ps?.substanceId ?? null;
}

// ---------------------------------------------------------------------------
// Sérialisation → markdown pour le prompt LLM
// ---------------------------------------------------------------------------

/**
 * Génère un bloc markdown structuré à injecter dans le prompt LLM.
 * Ciblé sur ce qui est vraiment utile pour l'analyse clinique :
 *   - Nom officiel BDPM (évite confusion marque / DCI)
 *   - Substances actives avec dosages (détection déplétion, interaction)
 *   - Faits connus (interactions, déplétion…) issus de la base knowledge
 *   - Chunks documentaires BDPM si disponibles
 */
function buildSummaryText(medications: BdpmMedContext[]): string {
  const resolved   = medications.filter((m) => m.drugProductId ?? m.drugSubstanceId ?? m.substanceName);
  const unresolved = medications.filter((m) => !m.drugProductId && !m.drugSubstanceId && !m.substanceName);

  if (resolved.length === 0 && unresolved.length === 0) return "";

  const lines: string[] = ["## DONNÉES BDPM — MÉDICAMENTS RÉSOLUS", ""];

  for (const med of resolved) {
    lines.push(`### ${med.inputLabel}`);

    if (med.productName) {
      lines.push(`**Spécialité BDPM :** ${med.productName}`);
    }
    if (med.substanceName) {
      lines.push(`**DCI :** ${med.substanceName}`);
    }

    if (med.activeSubstances.length > 0) {
      lines.push("**Composition (substances actives) :**");
      for (const sub of med.activeSubstances) {
        const dosagePart = sub.dosage ? ` — ${sub.dosage}` : "";
        lines.push(`- ${sub.name}${dosagePart}`);
      }
    }

    if (med.relevantFacts.length > 0) {
      lines.push("**Données cliniques connues :**");
      for (const fact of med.relevantFacts) {
        const qualifier = fact.qualifier ? ` (${fact.qualifier})` : "";
        lines.push(`- ${fact.predicate} → ${fact.object}${qualifier}`);
      }
    }

    if (med.relevantChunks.length > 0) {
      lines.push("**Extraits documentaires BDPM :**");
      for (const chunk of med.relevantChunks) {
        lines.push(`> [${chunk.kind}] ${chunk.text.slice(0, 300)}${chunk.text.length > 300 ? "…" : ""}`);
      }
    }

    lines.push("");
  }

  if (unresolved.length > 0) {
    lines.push(
      `> ℹ Médicaments non résolus en BDPM (analyse LLM seule) : ` +
      unresolved.map((m) => m.inputLabel).join(", ")
    );
    lines.push("");
  }

  return lines.join("\n");
}
