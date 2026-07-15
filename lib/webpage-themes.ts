// Constantes partagées entre le dashboard et la page publique.

// ---------------------------------------------------------------------------
// Couleurs par thème (1–10)
// ---------------------------------------------------------------------------

export interface ThemeConfig {
  heroGradient:     string; // gradient CSS pour le hero sans image
  overlayColor:     string; // rgba pour l'overlay sur l'image hero
  accentHex:        string; // couleur principale accent
  accentDarkHex:    string; // texte sombre sur fond clair
  lightBg:          string; // fond clair des sections "À propos" et formulaire
  darkBg:           string; // fond sombre section Coordonnées
  badgeDurBg:       string; // badge durée — fond
  badgeDurText:     string; // badge durée — texte
  cardBorder:       string; // bordure des cards de prestation
  labelColor:       string; // couleur libellé "AU CABINET" + traits déco
}

export const THEMES: Record<number, ThemeConfig> = {
  1: { // Teal/Sage
    heroGradient:  "linear-gradient(155deg, #33502f 0%, #25391f 58%, #1b2b16 100%)",
    overlayColor:  "rgba(75,95,77,0.72)",
    accentHex:     "#6E8B6E",
    accentDarkHex: "#45593F",
    lightBg:       "#EEF3ED",
    darkBg:        "#3C4D3E",
    badgeDurBg:    "#E5EEE4",
    badgeDurText:  "#45593F",
    cardBorder:    "#ECEFE9",
    labelColor:    "#6E8B6E",
  },
  2: { // Forest
    heroGradient:  "linear-gradient(155deg, #1a3d1a 0%, #14301a 58%, #0e2212 100%)",
    overlayColor:  "rgba(30,70,35,0.72)",
    accentHex:     "#4A7C50",
    accentDarkHex: "#2A5030",
    lightBg:       "#ECF2EC",
    darkBg:        "#253A26",
    badgeDurBg:    "#E0ECDF",
    badgeDurText:  "#2A5030",
    cardBorder:    "#E4EDE4",
    labelColor:    "#4A7C50",
  },
  3: { // Sage
    heroGradient:  "linear-gradient(155deg, #4a6340 0%, #3a5232 58%, #2a3e24 100%)",
    overlayColor:  "rgba(74,99,64,0.70)",
    accentHex:     "#7A9A60",
    accentDarkHex: "#4A6030",
    lightBg:       "#EEF2EA",
    darkBg:        "#3A4E2E",
    badgeDurBg:    "#E4EDE0",
    badgeDurText:  "#4A6030",
    cardBorder:    "#E6EDE0",
    labelColor:    "#7A9A60",
  },
  4: { // Ocean
    heroGradient:  "linear-gradient(155deg, #0a3d62 0%, #0a2d52 58%, #071e38 100%)",
    overlayColor:  "rgba(10,55,100,0.72)",
    accentHex:     "#2979C5",
    accentDarkHex: "#1a4a80",
    lightBg:       "#EAF0F8",
    darkBg:        "#1a3558",
    badgeDurBg:    "#DDEAF7",
    badgeDurText:  "#1a4a80",
    cardBorder:    "#DDE8F5",
    labelColor:    "#2979C5",
  },
  5: { // Terracotta
    heroGradient:  "linear-gradient(155deg, #7a2e0e 0%, #6a2208 58%, #4a1604 100%)",
    overlayColor:  "rgba(120,50,20,0.72)",
    accentHex:     "#C25A35",
    accentDarkHex: "#8a3018",
    lightBg:       "#F5EDE8",
    darkBg:        "#5a2810",
    badgeDurBg:    "#F0E0D8",
    badgeDurText:  "#8a3018",
    cardBorder:    "#EDE0D8",
    labelColor:    "#C25A35",
  },
  6: { // Lavande
    heroGradient:  "linear-gradient(155deg, #4a2d7a 0%, #3a2068 58%, #2a1450 100%)",
    overlayColor:  "rgba(74,45,122,0.72)",
    accentHex:     "#7B5EA7",
    accentDarkHex: "#5A3D80",
    lightBg:       "#F0ECF7",
    darkBg:        "#3A2860",
    badgeDurBg:    "#E8E0F5",
    badgeDurText:  "#5A3D80",
    cardBorder:    "#EAE2F5",
    labelColor:    "#7B5EA7",
  },
  7: { // Charcoal
    heroGradient:  "linear-gradient(155deg, #2d3748 0%, #1e2a38 58%, #131c28 100%)",
    overlayColor:  "rgba(30,42,60,0.78)",
    accentHex:     "#4A90A0",
    accentDarkHex: "#2A6070",
    lightBg:       "#EBF0F2",
    darkBg:        "#1E2A38",
    badgeDurBg:    "#DDEAEE",
    badgeDurText:  "#2A6070",
    cardBorder:    "#DDE8EC",
    labelColor:    "#4A90A0",
  },
  8: { // Olive
    heroGradient:  "linear-gradient(155deg, #5a4a10 0%, #4a3a08 58%, #382c04 100%)",
    overlayColor:  "rgba(88,72,16,0.72)",
    accentHex:     "#968530",
    accentDarkHex: "#6a5c10",
    lightBg:       "#F2EFE0",
    darkBg:        "#48400C",
    badgeDurBg:    "#EAE8D0",
    badgeDurText:  "#6a5c10",
    cardBorder:    "#E8E5CE",
    labelColor:    "#968530",
  },
  9: { // Rose
    heroGradient:  "linear-gradient(155deg, #8a2040 0%, #721838 58%, #541028 100%)",
    overlayColor:  "rgba(138,32,64,0.70)",
    accentHex:     "#C2527A",
    accentDarkHex: "#8a2848",
    lightBg:       "#F7EAEE",
    darkBg:        "#601830",
    badgeDurBg:    "#F5DDE5",
    badgeDurText:  "#8a2848",
    cardBorder:    "#F0DCE4",
    labelColor:    "#C2527A",
  },
  10: { // Indigo
    heroGradient:  "linear-gradient(155deg, #1e1b4b 0%, #16123c 58%, #0e0c2c 100%)",
    overlayColor:  "rgba(30,27,75,0.74)",
    accentHex:     "#5457C8",
    accentDarkHex: "#3438a0",
    lightBg:       "#ECEEF8",
    darkBg:        "#1C1A48",
    badgeDurBg:    "#E0E2F5",
    badgeDurText:  "#3438a0",
    cardBorder:    "#E2E4F5",
    labelColor:    "#5457C8",
  },
};

export function getTheme(id: number): ThemeConfig {
  return THEMES[id] ?? THEMES[1]!;
}

// ---------------------------------------------------------------------------
// Images hero (placeholders gradient — à remplacer par de vraies photos)
// ---------------------------------------------------------------------------

export interface HeroImage {
  id:       string;
  labelFr:  string;
  labelEn:  string;
  gradient: string; // CSS gradient (placeholder visuel)
}

export const HERO_IMAGES: HeroImage[] = [
  {
    id:       "herbs",
    labelFr:  "Plantes",
    labelEn:  "Plants",
    gradient: "radial-gradient(80% 60% at 30% 20%, rgba(180,210,120,0.9) 0%, transparent 60%), radial-gradient(60% 70% at 80% 90%, rgba(60,100,50,0.95) 0%, transparent 70%), linear-gradient(145deg, #8ab870 0%, #5a8840 50%, #3a6025 100%)",
  },
  {
    id:       "forest",
    labelFr:  "Forêt",
    labelEn:  "Forest",
    gradient: "radial-gradient(90% 75% at 78% 6%, rgba(200,235,180,0.5) 0%, transparent 55%), radial-gradient(55% 65% at 12% 95%, rgba(18,38,16,0.9) 0%, transparent 70%), linear-gradient(165deg, #33502f 0%, #25391f 58%, #1b2b16 100%)",
  },
  {
    id:       "stones",
    labelFr:  "Zenitude",
    labelEn:  "Zenitude",
    gradient: "radial-gradient(70% 50% at 30% 25%, rgba(200,215,210,0.8) 0%, transparent 60%), radial-gradient(60% 65% at 75% 80%, rgba(80,100,95,0.9) 0%, transparent 65%), linear-gradient(150deg, #a8b8b0 0%, #788880 50%, #4a5c55 100%)",
  },
  {
    id:       "hands",
    labelFr:  "Soin",
    labelEn:  "Care",
    gradient: "radial-gradient(75% 55% at 25% 20%, rgba(235,215,185,0.9) 0%, transparent 55%), radial-gradient(55% 60% at 80% 88%, rgba(140,100,60,0.8) 0%, transparent 65%), linear-gradient(145deg, #d4b080 0%, #b08050 50%, #8a5830 100%)",
  },
  {
    id:       "flowers",
    labelFr:  "Fleurs",
    labelEn:  "Flowers",
    gradient: "radial-gradient(80% 60% at 35% 15%, rgba(250,248,240,0.95) 0%, transparent 55%), radial-gradient(60% 70% at 78% 85%, rgba(180,155,130,0.85) 0%, transparent 65%), linear-gradient(150deg, #e8dfd0 0%, #c8b898 50%, #a89070 100%)",
  },
  {
    id:       "yoga",
    labelFr:  "Méditation",
    labelEn:  "Meditation",
    gradient: "radial-gradient(85% 55% at 20% 10%, rgba(255,230,150,0.85) 0%, transparent 55%), radial-gradient(60% 65% at 80% 90%, rgba(180,100,30,0.9) 0%, transparent 65%), linear-gradient(155deg, #e8a840 0%, #c07820 50%, #8a4800 100%)",
  },
  {
    id:       "bowl",
    labelFr:  "Bien-être",
    labelEn:  "Wellness",
    gradient: "radial-gradient(70% 50% at 30% 25%, rgba(140,160,175,0.7) 0%, transparent 55%), radial-gradient(55% 60% at 75% 80%, rgba(40,55,75,0.95) 0%, transparent 65%), linear-gradient(150deg, #6a7a90 0%, #485868 50%, #2a3848 100%)",
  },
  {
    id:       "coast",
    labelFr:  "Sérénité",
    labelEn:  "Serenity",
    gradient: "radial-gradient(80% 55% at 25% 15%, rgba(200,225,240,0.85) 0%, transparent 55%), radial-gradient(60% 65% at 78% 85%, rgba(40,80,120,0.85) 0%, transparent 65%), linear-gradient(150deg, #8ab4d0 0%, #5a84a8 50%, #2a5478 100%)",
  },
  {
    id:       "harvest",
    labelFr:  "Nature",
    labelEn:  "Nature",
    gradient: "radial-gradient(75% 55% at 30% 20%, rgba(220,210,160,0.9) 0%, transparent 55%), radial-gradient(55% 65% at 75% 85%, rgba(80,90,30,0.9) 0%, transparent 65%), linear-gradient(150deg, #b8b060 0%, #888038 50%, #585010 100%)",
  },
  {
    id:       "light",
    labelFr:  "Lumière",
    labelEn:  "Light",
    gradient: "radial-gradient(80% 60% at 30% 25%, rgba(255,245,220,0.95) 0%, transparent 55%), radial-gradient(55% 60% at 75% 80%, rgba(180,140,70,0.85) 0%, transparent 65%), linear-gradient(150deg, #f0d898 0%, #d0a850 50%, #a87820 100%)",
  },
];
