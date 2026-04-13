/**
 * Parser CIS_GENER_bdpm.txt
 *
 * Format : TSV, 5 colonnes.
 * Colonnes : groupId, groupLabel, cisCode, genericType, sortOrder
 */

import type { GenerRow } from "../types";

const COL_GROUP_ID    = 0;
const COL_GROUP_LABEL = 1;
const COL_CIS         = 2;
const COL_TYPE        = 3;

export function parseGenerFile(content: string): GenerRow[] {
  const rows: GenerRow[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = line.split("\t");
    if (cols.length < 4) continue;

    const groupId = (cols[COL_GROUP_ID] ?? "").trim();
    const cisCode = (cols[COL_CIS]      ?? "").trim();
    if (!groupId || !/^\d+$/.test(cisCode)) continue;

    rows.push({
      groupId,
      groupLabel:  (cols[COL_GROUP_LABEL] ?? "").trim(),
      cisCode,
      genericType: (cols[COL_TYPE]        ?? "").trim(),
    });
  }

  return rows;
}
