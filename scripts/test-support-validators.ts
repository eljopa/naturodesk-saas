/**
 * Script de test local — validateurs support (lot backend tickets).
 *
 * Exécution :
 *   npx tsx scripts/test-support-validators.ts
 */

import { CreateTicketSchema, ReplyTicketSchema } from "@/lib/validators/support";

function main() {
  console.log("=== CreateTicketSchema ===");
  const valid = CreateTicketSchema.safeParse({ title: "Problème de facturation", body: "La facture ne se génère pas correctement depuis hier." });
  if (!valid.success) throw new Error("ANOMALIE: un ticket valide a été rejeté");
  if (valid.data.priority !== "NORMAL") throw new Error("ANOMALIE: la priorité par défaut devrait être NORMAL");
  console.log("Ticket valide accepté, priorité par défaut =", valid.data.priority);

  const tooShortTitle = CreateTicketSchema.safeParse({ title: "abc", body: "La facture ne se génère pas correctement depuis hier." });
  if (tooShortTitle.success) throw new Error("ANOMALIE: un titre trop court a été accepté");
  console.log("Titre trop court rejeté — OK");

  const withPriority = CreateTicketSchema.safeParse({ title: "Problème urgent", body: "Impossible de me connecter à mon compte.", priority: "URGENT" });
  if (!withPriority.success || withPriority.data.priority !== "URGENT") throw new Error("ANOMALIE: priorité explicite non respectée");
  console.log("Priorité explicite respectée — OK");

  console.log("\n=== ReplyTicketSchema ===");
  const emptyReply = ReplyTicketSchema.safeParse({ body: "   " });
  if (emptyReply.success) throw new Error("ANOMALIE: une réponse vide a été acceptée");
  console.log("Réponse vide rejetée — OK");

  const validReply = ReplyTicketSchema.safeParse({ body: "Merci, c'est corrigé de mon côté." });
  if (!validReply.success) throw new Error("ANOMALIE: une réponse valide a été rejetée");
  console.log("Réponse valide acceptée — OK");

  console.log("\nToutes les vérifications sont passées.");
}

main();
