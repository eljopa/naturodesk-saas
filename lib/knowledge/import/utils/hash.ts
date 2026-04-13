import { createHash } from "crypto";

import type { SourceSection } from "../types";

/**
 * Calcule un hash SHA-256 du contenu textuel brut d'un document.
 * Utilisé pour l'idempotence de l'import : si le hash correspond à un document
 * existant en base, on ne le réinsère pas.
 */
export function computeContentHash(sections: SourceSection[]): string {
  const content = sections.map((s) => `${s.sectionPath}|${s.text}`).join("\n---\n");
  return createHash("sha256").update(content, "utf8").digest("hex");
}
