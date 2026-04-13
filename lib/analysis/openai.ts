import type { ConsultationSnapshot, LLMResult, LLMFinding, FindingCategoryType, MedLoadLevel, FindingEvidenceLevel } from "./types";
import type { BdpmAnalysisContext } from "./services/build-bdpm-context";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

// ---------------------------------------------------------------------------
// Build clinical prompt
// ---------------------------------------------------------------------------

function buildPrompt(snapshot: ConsultationSnapshot): string {
  const lines: string[] = [];

  lines.push("Tu es un assistant d'analyse clinique pour un naturopathe. Analyse les données du bilan de vitalité ci-dessous et génère des observations cliniques structurées.");
  lines.push("");
  lines.push("## DONNÉES DU BILAN");
  lines.push("");

  lines.push(`**Contexte :** ${snapshot.context?.trim() || "Non renseigné"}`);
  lines.push("");

  if (snapshot.symptoms.length > 0) {
    lines.push("**Symptômes :**");
    for (const s of snapshot.symptoms) {
      const parts = [s.label];
      if (s.intensity != null) parts.push(`intensité ${s.intensity}/10`);
      if (s.duration) parts.push(`durée : ${s.duration}`);
      if (s.category) parts.push(`catégorie : ${s.category}`);
      lines.push(`- ${parts.join(", ")}`);
    }
    lines.push("");
  } else {
    lines.push("**Symptômes :** Aucun renseigné");
    lines.push("");
  }

  if (snapshot.medications.length > 0) {
    lines.push("**Médicaments :**");
    for (const m of snapshot.medications) {
      const parts = [m.name];
      if (m.dosage) parts.push(m.dosage);
      if (m.frequency) parts.push(m.frequency);
      if (m.duration) parts.push(m.duration);
      lines.push(`- ${parts.join(", ")}`);
    }
    lines.push("");
  } else {
    lines.push("**Médicaments :** Aucun");
    lines.push("");
  }

  if (snapshot.supplements.length > 0) {
    lines.push("**Compléments alimentaires :**");
    for (const s of snapshot.supplements) {
      const parts = [s.name];
      if (s.dosage) parts.push(s.dosage);
      if (s.duration) parts.push(s.duration);
      lines.push(`- ${parts.join(", ")}`);
    }
    lines.push("");
  } else {
    lines.push("**Compléments alimentaires :** Aucun");
    lines.push("");
  }

  lines.push("## INSTRUCTIONS");
  lines.push("");
  lines.push("Génère une réponse JSON valide avec exactement la structure suivante :");
  lines.push("");
  lines.push(`{
  "findings": [
    {
      "category": "SIDE_EFFECT | INTERACTION | DEPLETION | RED_FLAG | TERRAIN | PROTOCOL | QUESTION",
      "title": "Titre court (< 80 caractères)",
      "description": "Description clinique détaillée en français (2-5 phrases)",
      "confidence": 0.0 à 1.0,
      "evidenceLevel": "DOCUMENTED | SIGNAL | HYPOTHESIS",
      "sourceRefs": ["référence courte", "..."]
    }
  ],
  "medicationLoadLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "medicationLoadScore": 0.0 à 10.0,
  "terrainSummary": "Résumé du terrain naturopathique du patient en 2-3 phrases (ou null si insuffisant)"
}`);
  lines.push("");
  lines.push("Règles générales :");
  lines.push("- Génère 2 à 6 findings pertinents (évite les doublons avec des observations évidentes)");
  lines.push("- medicationLoadLevel : LOW (0-1 méd), MEDIUM (2-4), HIGH (5-7), CRITICAL (≥8)");
  lines.push("- medicationLoadScore : score de 0 à 10 reflétant la charge globale (polypharmacologie, interactions potentielles, durée)");
  lines.push("- Ne génère que des findings cliniquement pertinents pour un naturopathe");
  lines.push("- Toujours répondre en français");
  lines.push("- Tu assistes un naturopathe, pas un médecin. Les recommandations restent dans le champ naturopathique (nutrition, compléments, hygiène de vie)");
  lines.push("");
  lines.push("Règles de traçabilité — STRICT (evidenceLevel + sourceRefs) :");
  lines.push("- DOCUMENTED : UNIQUEMENT si un KnowledgeFact ou un extrait documentaire BDPM présent dans la section \"DONNÉES BDPM\" prouve directement le finding.");
  lines.push("  → Tu DOIS citer dans sourceRefs la source exacte issue de la section DONNÉES BDPM (ex: 'KnowledgeFact: sertraline DEPLETES vitamine_b6').");
  lines.push("  → Savoir qu'un médicament existe en BDPM NE SUFFIT PAS pour DOCUMENTED.");
  lines.push("  → La composition seule (substance active + dosage) NE SUFFIT PAS pour DOCUMENTED.");
  lines.push("  → Si aucun fait ou extrait BDPM ne prouve directement le finding : utilise SIGNAL ou HYPOTHESIS.");
  lines.push("  → INTERDIT : DOCUMENTED avec sourceRefs vide ou générique comme 'Paracétamol — BDPM'.");
  lines.push("- SIGNAL : indice clinique plausible issu de pharmacologie générale, composition, ou contexte du patient. confidence ≤ 0.75.");
  lines.push("- HYPOTHESIS : vigilance ou interprétation terrain — à confirmer par le praticien. confidence ≤ 0.60.");
  lines.push("- Règle de défaut : en cas de doute entre DOCUMENTED et SIGNAL → toujours SIGNAL.");
  lines.push("- N'invente pas de contre-indications absentes du contexte fourni.");
  lines.push("- Adopte un ton d'aide à la décision, non affirmatif au-delà des preuves disponibles.");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Call OpenAI
// ---------------------------------------------------------------------------

interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
  }>;
  usage?: {
    total_tokens: number;
  };
}

const VALID_CATEGORIES: FindingCategoryType[] = [
  "SIDE_EFFECT", "INTERACTION", "DEPLETION", "RED_FLAG", "TERRAIN", "PROTOCOL", "QUESTION",
];
const VALID_LOAD_LEVELS: MedLoadLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function parseResponse(raw: string, totalTokens: number): LLMResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const VALID_EVIDENCE: FindingEvidenceLevel[] = ["DOCUMENTED", "SIGNAL", "HYPOTHESIS"];

  const findings: LLMFinding[] = [];
  if (Array.isArray(parsed.findings)) {
    for (const f of parsed.findings as Record<string, unknown>[]) {
      const cat = String(f.category ?? "").toUpperCase();
      if (!VALID_CATEGORIES.includes(cat as FindingCategoryType)) continue;

      const rawEvidence = String(f.evidenceLevel ?? "").toUpperCase();
      let evidenceLevel: FindingEvidenceLevel | undefined = VALID_EVIDENCE.includes(rawEvidence as FindingEvidenceLevel)
        ? (rawEvidence as FindingEvidenceLevel)
        : undefined;

      const sourceRefs: string[] = Array.isArray(f.sourceRefs)
        ? (f.sourceRefs as unknown[]).map((r) => String(r).slice(0, 200)).filter(Boolean)
        : [];

      // ── GARDE-FOU : DOCUMENTED sans sourceRefs réelles → downgrade SIGNAL ──
      // Règle 1 : sourceRefs vide → downgrade immédiat
      // Règle 2 : toutes les sourceRefs sont génériques (pattern "Nom — BDPM")
      //           sans référence explicite à un KnowledgeFact → downgrade
      if (evidenceLevel === "DOCUMENTED") {
        const isGenericRef = (ref: string) =>
          /^[^:]{1,60}\s*—\s*BDPM$/i.test(ref.trim()) ||
          /^[^:]{1,60}\s*-\s*BDPM$/i.test(ref.trim());

        const hasRealRef = sourceRefs.some((r) => !isGenericRef(r));

        if (sourceRefs.length === 0 || !hasRealRef) {
          const reason = sourceRefs.length === 0 ? "no source" : "generic source only";
          console.log(`[BDPM GUARD] downgraded DOCUMENTED → SIGNAL (${reason}) : "${String(f.title ?? "").slice(0, 60)}"`);
          evidenceLevel = "SIGNAL";
        }
      }

      findings.push({
        category: cat as FindingCategoryType,
        title: String(f.title ?? "").slice(0, 200),
        description: String(f.description ?? "").slice(0, 2000),
        confidence: Math.min(1, Math.max(0, Number(f.confidence ?? 0.7))),
        evidenceLevel,
        sourceRefs: sourceRefs.length > 0 ? sourceRefs : undefined,
      });
    }
  }

  const rawLevel = String(parsed.medicationLoadLevel ?? "").toUpperCase();
  const medicationLoadLevel: MedLoadLevel = VALID_LOAD_LEVELS.includes(rawLevel as MedLoadLevel)
    ? (rawLevel as MedLoadLevel)
    : "LOW";

  const medicationLoadScore = Math.min(10, Math.max(0, Number(parsed.medicationLoadScore ?? 0)));

  const terrainSummary =
    parsed.terrainSummary && typeof parsed.terrainSummary === "string" && parsed.terrainSummary.trim().length > 0
      ? parsed.terrainSummary.trim()
      : null;

  return { findings, medicationLoadLevel, medicationLoadScore, terrainSummary, tokensUsed: totalTokens };
}

export async function callOpenAI(
  snapshot: ConsultationSnapshot,
  ragContext = "",
  bdpmContext?: BdpmAnalysisContext,
): Promise<LLMResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const basePropmt = buildPrompt(snapshot);
  const parts: string[] = [basePropmt];
  if (bdpmContext?.summaryText) parts.push(bdpmContext.summaryText);
  if (ragContext) parts.push(ragContext);
  const prompt = parts.join("\n\n");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  const tokensUsed = data.usage?.total_tokens ?? 0;

  return parseResponse(content, tokensUsed);
}
