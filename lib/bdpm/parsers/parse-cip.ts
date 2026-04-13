/**
 * Parser CIS_CIP_bdpm.txt
 *
 * Format : TSV, 11 colonnes.
 * On conserve : CIS, CIP7, libellé, statut administratif, statut marché, CIP13.
 */

import type { CipRow } from "../types";

const COL_CIS          = 0;
const COL_CIP7         = 1;
const COL_LABEL        = 2;
const COL_ADMIN_STATUS = 3;
const COL_MKT_STATUS   = 4;
// colonne 5 = date déclaration (ignorée)
const COL_CIP13        = 6;

export function parseCipFile(content: string): CipRow[] {
  const rows: CipRow[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = line.split("\t");
    if (cols.length < 7) continue;

    const cisCode = (cols[COL_CIS] ?? "").trim();
    if (!/^\d+$/.test(cisCode)) continue;

    const cip7  = (cols[COL_CIP7]  ?? "").trim();
    const cip13 = (cols[COL_CIP13] ?? "").trim();
    if (!cip7 && !cip13) continue;

    rows.push({
      cisCode,
      cip7,
      label:        (cols[COL_LABEL]        ?? "").trim(),
      adminStatus:  (cols[COL_ADMIN_STATUS] ?? "").trim(),
      marketStatus: (cols[COL_MKT_STATUS]   ?? "").trim(),
      cip13,
    });
  }

  return rows;
}
