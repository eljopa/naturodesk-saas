/**
 * Récupération des findings et citations d'un run knowledge.
 *
 * getFindingsForKnowledgeRun() :
 *   Charge tous les findings KNOWLEDGE d'un run en une seule requête
 *   (include citations → pas de N+1).
 *   Triés par confidence décroissante, puis createdAt croissant.
 *
 * verifyConsultationOwnership() :
 *   Vérifie que la consultation existe et appartient à l'utilisateur connecté.
 *   Passe par Consultation → Patient → userId.
 *   Retourne "not_found" | "forbidden" | "ok".
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Type intermédiaire (résultat brut Prisma avec citations incluses)
// ---------------------------------------------------------------------------

export type FindingWithCitations = {
  id:              string;
  category:        string;
  title:           string;
  description:     string;
  confidence:      number;
  riskLevel:       string | null;
  validated:       boolean | null;
  practitionerNote: string | null;
  citations: {
    id:               string;
    reference:        string;
    excerpt:          string | null;
    knowledgeFactId:  string | null;
    knowledgeChunkId: string | null;
  }[];
};

// ---------------------------------------------------------------------------
// Ownership check
// ---------------------------------------------------------------------------

export type OwnershipResult = "ok" | "not_found" | "forbidden";

/**
 * Vérifie que la consultation existe et appartient à l'utilisateur donné.
 */
export async function verifyConsultationOwnership(
  consultationId: string,
  userId:         string
): Promise<OwnershipResult> {
  const consultation = await db.consultation.findUnique({
    where:  { id: consultationId },
    select: { patient: { select: { userId: true } } },
  });

  if (!consultation)                           return "not_found";
  if (consultation.patient.userId !== userId)  return "forbidden";
  return "ok";
}

// ---------------------------------------------------------------------------
// Findings + citations (une seule requête)
// ---------------------------------------------------------------------------

/**
 * Retourne tous les findings KNOWLEDGE d'un run avec leurs citations.
 * Une seule requête Prisma — pas de N+1.
 */
export async function getFindingsForKnowledgeRun(
  analysisRunId: string
): Promise<FindingWithCitations[]> {
  const findings = await db.finding.findMany({
    where: {
      analysisRunId,
      sourceType: "KNOWLEDGE",
    },
    select: {
      id:              true,
      category:        true,
      title:           true,
      description:     true,
      confidence:      true,
      riskLevel:       true,
      validated:       true,
      practitionerNote: true,
      citations: {
        select: {
          id:               true,
          reference:        true,
          excerpt:          true,
          knowledgeFactId:  true,
          knowledgeChunkId: true,
        },
      },
    },
    orderBy: [
      { confidence: "desc" },
      { createdAt:  "asc"  },
    ],
  });

  // Prisma retourne category comme enum — on cast en string pour le DTO
  return findings.map((f) => ({
    ...f,
    category: f.category as string,
  }));
}
