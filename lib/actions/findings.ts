"use server";

/**
 * Server actions — décisions praticien sur les findings knowledge.
 *
 * validateFindingAction(findingId)     → validated = true
 * rejectFindingAction(findingId)       → validated = false
 * updatePractitionerNoteAction(id, note) → practitionerNote = note | null
 *
 * Sécurité :
 *   Chaque action vérifie que le finding appartient bien à l'utilisateur connecté
 *   via la chaîne finding → consultation → patient → userId.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type FindingActionResult =
  | { success: true }
  | { success: false; error: "not_found" | "invalid_input" | "generic_error" };

// ---------------------------------------------------------------------------
// Ownership check
// ---------------------------------------------------------------------------

/**
 * Vérifie que le finding appartient à l'utilisateur.
 * Retourne le consultationId si ok, null sinon.
 */
async function assertOwnsFinding(
  findingId: string,
  userId: string
): Promise<string | null> {
  const finding = await db.finding.findFirst({
    where: {
      id: findingId,
      consultation: { patient: { userId } },
    },
    select: { consultationId: true },
  });
  return finding?.consultationId ?? null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function validateFindingAction(
  findingId: string
): Promise<FindingActionResult> {
  const user = await requireUser();

  const consultationId = await assertOwnsFinding(findingId, user.id);
  if (!consultationId) {
    console.warn(`[findings:validate] Accès refusé — finding=${findingId} user=${user.id}`);
    return { success: false, error: "not_found" };
  }

  await db.finding.update({
    where: { id: findingId },
    data: { validated: true },
  });

  console.log(`[findings:validate] ✓ finding=${findingId} user=${user.id}`);
  revalidatePath(`/consultations/${consultationId}`);
  return { success: true };
}

export async function rejectFindingAction(
  findingId: string
): Promise<FindingActionResult> {
  const user = await requireUser();

  const consultationId = await assertOwnsFinding(findingId, user.id);
  if (!consultationId) {
    console.warn(`[findings:reject] Accès refusé — finding=${findingId} user=${user.id}`);
    return { success: false, error: "not_found" };
  }

  await db.finding.update({
    where: { id: findingId },
    data: { validated: false },
  });

  console.log(`[findings:reject] ✓ finding=${findingId} user=${user.id}`);
  revalidatePath(`/consultations/${consultationId}`);
  return { success: true };
}

const NoteSchema = z.string().max(2000).trim();

export async function updatePractitionerNoteAction(
  findingId: string,
  note: string
): Promise<FindingActionResult> {
  const user = await requireUser();

  const consultationId = await assertOwnsFinding(findingId, user.id);
  if (!consultationId) {
    console.warn(`[findings:note] Accès refusé — finding=${findingId} user=${user.id}`);
    return { success: false, error: "not_found" };
  }

  const parsed = NoteSchema.safeParse(note);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  // Chaîne vide → null (suppression de la note)
  await db.finding.update({
    where: { id: findingId },
    data: { practitionerNote: parsed.data || null },
  });

  console.log(`[findings:note] ✓ finding=${findingId} user=${user.id}`);
  revalidatePath(`/consultations/${consultationId}`);
  return { success: true };
}
