// Serveur uniquement — ne jamais importer côté client

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdviceSheetDraftContext {
  patientFirstName:  string;
  patientLastName:   string;
  patientAge:        number | null;
  patientAllergies:  string | null;
  patientHistory:    string | null;
  consultationDate:  Date;
  context:           string | null;
  terrainSummary:    string | null;
  symptoms:   Array<{ label: string; intensity: number | null }>;
  medications: Array<{ name: string; dosage: string | null }>;
  supplements: Array<{ name: string; dosage: string | null }>;
  validatedFindings: Array<{ category: string; title: string; description: string }>;
  clinicalExplanations: string[];
}

export interface AdviceSheetDraft {
  consultationSummary?: string;
  objectives?:          string;
  dietaryAdvice?:       string;
  supplements?:         string;
  phytotherapy?:        string;
  aromatherapy?:        string;
  micronutrition?:      string;
  gemmotherapy?:        string;
  bachFlowers?:         string;
  lifestyle?:           string;
  physicalActivity?:    string;
  additionalNotes?:     string;
  precautions?:         string;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(ctx: AdviceSheetDraftContext): string {
  const lines: string[] = [];

  lines.push(
    "Tu es un assistant de rédaction pour un naturopathe. " +
    "Tu génères des suggestions de contenu pour une fiche conseil patient. " +
    "Ces suggestions sont des aides à la rédaction uniquement — " +
    "le praticien est seul responsable de toute recommandation remise au client. " +
    "Tu restes strictement dans le champ naturopathique (nutrition, compléments, hygiène de vie, plantes). " +
    "Ne formule aucun diagnostic médical. Toujours rédiger en français."
  );
  lines.push("");
  lines.push("## DONNÉES DU BILAN");
  lines.push("");

  const age = ctx.patientAge ? ` — ${ctx.patientAge} ans` : "";
  lines.push(`**Patient :** ${ctx.patientLastName} ${ctx.patientFirstName}${age}`);
  if (ctx.patientAllergies) lines.push(`**Allergies :** ${ctx.patientAllergies}`);
  if (ctx.patientHistory)   lines.push(`**Antécédents :** ${ctx.patientHistory}`);
  lines.push(`**Date du bilan :** ${ctx.consultationDate.toLocaleDateString("fr-FR")}`);
  if (ctx.context) lines.push(`**Contexte :** ${ctx.context}`);
  if (ctx.terrainSummary) lines.push(`**Terrain :** ${ctx.terrainSummary}`);
  lines.push("");

  if (ctx.symptoms.length > 0) {
    lines.push("**Symptômes :**");
    for (const s of ctx.symptoms) {
      const int = s.intensity != null ? ` (${s.intensity}/10)` : "";
      lines.push(`- ${s.label}${int}`);
    }
    lines.push("");
  }

  if (ctx.medications.length > 0) {
    lines.push("**Médicaments en cours :**");
    for (const m of ctx.medications) {
      lines.push(`- ${m.name}${m.dosage ? ` — ${m.dosage}` : ""}`);
    }
    lines.push("");
  }

  if (ctx.supplements.length > 0) {
    lines.push("**Compléments déclarés :**");
    for (const s of ctx.supplements) {
      lines.push(`- ${s.name}${s.dosage ? ` — ${s.dosage}` : ""}`);
    }
    lines.push("");
  }

  if (ctx.validatedFindings.length > 0) {
    lines.push("**Observations validées par le praticien :**");
    for (const f of ctx.validatedFindings) {
      lines.push(`- [${f.category}] ${f.title} : ${f.description}`);
    }
    lines.push("");
  }

  if (ctx.clinicalExplanations.length > 0) {
    lines.push("**Analyse clinique :**");
    for (const e of ctx.clinicalExplanations) {
      lines.push(`- ${e}`);
    }
    lines.push("");
  }

  lines.push("## INSTRUCTIONS");
  lines.push("");
  lines.push("Génère une réponse JSON valide avec exactement la structure suivante.");
  lines.push("Chaque section doit contenir 2 à 5 phrases pratiques, claires, directement adressées au patient.");
  lines.push("Omets une section (null) si les données ne justifient pas de recommandations dans cette discipline.");
  lines.push("Ne remplis PAS gemmotherapy, bachFlowers si aucune donnée ne les suggère.");
  lines.push("");
  lines.push(`{
  "consultationSummary": "Synthèse courte (2-3 phrases) du bilan pour introduction de la fiche",
  "objectives": "Objectifs du protocole — 2-4 phrases",
  "dietaryAdvice": "Conseils alimentaires pratiques ou null",
  "supplements": "Compléments recommandés avec posologie indicative ou null",
  "phytotherapy": "Plantes médicinales recommandées ou null",
  "aromatherapy": "Huiles essentielles recommandées ou null",
  "micronutrition": "Recommandations micronutritionnelles ou null",
  "gemmotherapy": "Bourgeons recommandés ou null",
  "bachFlowers": "Fleurs de Bach recommandées ou null",
  "lifestyle": "Conseils d'hygiène de vie ou null",
  "physicalActivity": "Recommandations d'activité physique ou null",
  "additionalNotes": "Remarques complémentaires ou null",
  "precautions": "Précautions liées aux médicaments ou allergies ou null"
}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// OpenAI call
// ---------------------------------------------------------------------------

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}

function parseDraft(raw: string): AdviceSheetDraft {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const str = (key: string): string | undefined => {
    const v = parsed[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    return undefined;
  };

  return {
    consultationSummary: str("consultationSummary"),
    objectives:          str("objectives"),
    dietaryAdvice:       str("dietaryAdvice"),
    supplements:         str("supplements"),
    phytotherapy:        str("phytotherapy"),
    aromatherapy:        str("aromatherapy"),
    micronutrition:      str("micronutrition"),
    gemmotherapy:        str("gemmotherapy"),
    bachFlowers:         str("bachFlowers"),
    lifestyle:           str("lifestyle"),
    physicalActivity:    str("physicalActivity"),
    additionalNotes:     str("additionalNotes"),
    precautions:         str("precautions"),
  };
}

export async function generateAdviceSheetDraft(
  ctx: AdviceSheetDraftContext
): Promise<AdviceSheetDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const prompt = buildPrompt(ctx);

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
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  return parseDraft(content);
}
