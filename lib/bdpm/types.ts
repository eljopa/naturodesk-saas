/**
 * Types bruts issus des fichiers BDPM (post-parsing, pré-normalisation).
 *
 * Les colonnes BDPM sont en UTF-8 / Latin-1, séparées par des tabulations.
 * Ces interfaces représentent les lignes après découpage, avant transformation.
 */

// CIS_bdpm.txt
export interface CisRow {
  cisCode:        string;
  name:           string;  // dénomination complète
  form:           string;  // forme galénique
  routes:         string;  // voies d'administration (peut être ";" séparé)
  ammStatus:      string;  // "Autorisation active" | "Autorisation retirée" | ...
  ammType:        string;  // procédure AMM
  marketStatus:   string;  // "Commercialisé" | "Non commercialisé" | ...
}

// CIS_COMPO_bdpm.txt (uniquement SA = substance active)
export interface CompoRow {
  cisCode:          string;
  elementDesig:     string;  // "p comprimé", "p ml", etc.
  substanceCode:    string;
  substanceName:    string;  // DCI officielle BDPM
  dosageRaw:        string;  // ex: "500 mg", "0,5 mg/ml"
  dosageRef:        string;  // référence du dosage
  nature:           string;  // "SA" | "FT"
  substanceOrder:   number;
}

// CIS_CIP_bdpm.txt
export interface CipRow {
  cisCode:      string;
  cip7:         string;
  label:        string;
  adminStatus:  string;
  marketStatus: string;
  cip13:        string;
}

// CIS_GENER_bdpm.txt
export interface GenerRow {
  groupId:     string;
  groupLabel:  string;
  cisCode:     string;
  genericType: string;  // "0"=référence, "1"=générique, "2"=hybride, "4"=biosimilaire
}

// Dosage parsé depuis CompoRow.dosageRaw
export interface ParsedDosage {
  value: number | null;
  unit:  string | null;
}
