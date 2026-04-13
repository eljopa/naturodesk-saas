/**
 * Parser CIS_COMPO_bdpm.txt
 *
 * Format : TSV, 8 colonnes.
 * On ne conserve que les lignes où nature = "SA" (substance active).
 * Les "FT" (formes thérapeutiques) sont ignorées.
 */

import type { CompoRow } from "../types";

const COL_CIS            = 0;
const COL_ELEMENT_DESIG  = 1;
const COL_SUBSTANCE_CODE = 2;
const COL_SUBSTANCE_NAME = 3;
const COL_DOSAGE         = 4;
const COL_DOSAGE_REF     = 5;
const COL_NATURE         = 6;
const COL_ORDER          = 7;

export function parseCompoFile(content: string): CompoRow[] {
  const rows: CompoRow[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = line.split("\t");
    if (cols.length < 7) continue;

    const nature = (cols[COL_NATURE] ?? "").trim().toUpperCase();
    if (nature !== "SA") continue;  // on ne veut que les substances actives

    const cisCode = (cols[COL_CIS] ?? "").trim();
    if (!/^\d+$/.test(cisCode)) continue;

    const substanceCode = (cols[COL_SUBSTANCE_CODE] ?? "").trim();
    if (!substanceCode) continue;

    const orderRaw = parseInt((cols[COL_ORDER] ?? "1").trim(), 10);

    rows.push({
      cisCode,
      elementDesig:  (cols[COL_ELEMENT_DESIG]  ?? "").trim(),
      substanceCode,
      substanceName: (cols[COL_SUBSTANCE_NAME] ?? "").trim(),
      dosageRaw:     (cols[COL_DOSAGE]         ?? "").trim(),
      dosageRef:     (cols[COL_DOSAGE_REF]     ?? "").trim(),
      nature:        "SA",
      substanceOrder: isNaN(orderRaw) ? 1 : orderRaw,
    });
  }

  return rows;
}
