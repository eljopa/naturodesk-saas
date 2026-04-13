/**
 * Parser CIS_bdpm.txt
 *
 * Format : TSV, 12 colonnes, encodage Latin-1 (souvent).
 * On ne conserve que les colonnes utiles (0, 1, 2, 3, 4, 6).
 * Les produits sans code CIS valide sont ignorés.
 */

import type { CisRow } from "../types";

const COL_CIS         = 0;
const COL_NAME        = 1;
const COL_FORM        = 2;
const COL_ROUTES      = 3;
const COL_AMM_STATUS  = 4;
// colonne 5 = type procédure (ignorée)
const COL_MKT_STATUS  = 6;

export function parseCisFile(content: string): CisRow[] {
  const rows: CisRow[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = line.split("\t");
    if (cols.length < 7) continue;

    const cisCode = (cols[COL_CIS] ?? "").trim();
    if (!/^\d+$/.test(cisCode)) continue;  // filtre les lignes malformées

    rows.push({
      cisCode,
      name:         (cols[COL_NAME]       ?? "").trim(),
      form:         (cols[COL_FORM]       ?? "").trim(),
      routes:       (cols[COL_ROUTES]     ?? "").trim(),
      ammStatus:    (cols[COL_AMM_STATUS] ?? "").trim(),
      ammType:      "",
      marketStatus: (cols[COL_MKT_STATUS] ?? "").trim(),
    });
  }

  return rows;
}
