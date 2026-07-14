/**
 * Génération d'image de secours en SVG — porté (simplifié) depuis
 * scripts/blog-image-templates.mjs (SelfHook). Utilisé quand OPENAI_API_KEY
 * est absente ou que l'appel à l'API images échoue : le pipeline ne bloque
 * jamais sur les images (spec §6 étape 7). Déterministe (via stableSeed) pour
 * que deux régénérations du même slot produisent un visuel identique.
 */

import { stableSeed } from "../dna/diversity-governor";

const PALETTE = {
  cream: "#FAF7F0",
  sageDeep: "#5E7349",
  sage: "#799664",
  sageSoft: "#AAB59F",
  sageTint: "#E8EDE0",
};

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function truncateLabel(text: string, maxLength = 48): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export interface SvgFallbackOptions {
  keyword: string;
  seed: string; // ex: "<slug>::<anchor>" — garantit un rendu stable par emplacement
  width?: number;
  height?: number;
}

/** Génère une image de secours SVG (fond crème, formes organiques sage, libellé). */
export function generateSvgFallback(opts: SvgFallbackOptions): string {
  const width = opts.width ?? 1200;
  const height = opts.height ?? 630;

  const seedX = stableSeed(`${opts.seed}::x`);
  const seedY = stableSeed(`${opts.seed}::y`);
  const seedR = stableSeed(`${opts.seed}::r`);

  const blobCx = width * (0.55 + seedX * 0.35);
  const blobCy = height * (0.25 + seedY * 0.35);
  const blobR = 160 + seedR * 140;

  const label = escapeXml(truncateLabel(opts.keyword));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PALETTE.cream}" />
  <circle cx="${blobCx.toFixed(1)}" cy="${blobCy.toFixed(1)}" r="${blobR.toFixed(1)}" fill="${PALETTE.sageTint}" opacity="0.9" />
  <circle cx="${(blobCx - blobR * 0.45).toFixed(1)}" cy="${(blobCy + blobR * 0.55).toFixed(1)}" r="${(blobR * 0.45).toFixed(1)}" fill="${PALETTE.sageSoft}" opacity="0.55" />
  <circle cx="${(blobCx + blobR * 0.5).toFixed(1)}" cy="${(blobCy - blobR * 0.3).toFixed(1)}" r="${(blobR * 0.28).toFixed(1)}" fill="${PALETTE.sage}" opacity="0.35" />
  <text x="80" y="${height - 90}" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="600" fill="${PALETTE.sageDeep}">${label}</text>
  <text x="80" y="${height - 48}" font-family="Arial, Helvetica, sans-serif" font-size="20" letter-spacing="1" fill="${PALETTE.sage}">NATURODESK</text>
</svg>`;
}
