/**
 * Orchestrateur d'ingestion BDPM.
 *
 * Pipeline :
 *   1. Crée un DrugSyncBatch (RUNNING)
 *   2. Upsert groupes génériques (CIS_GENER)
 *   3. Upsert substances actives (CIS_COMPO) — par substanceCode unique
 *   4. Upsert spécialités (CIS_bdpm) — hash diff pour minimiser les writes
 *   5. Upsert compositions produit ↔ substance (CIS_COMPO)
 *   6. Upsert présentations CIP (CIS_CIP)
 *   7. Génère DrugAlias automatiques (normalizedBrand + DCI)
 *   8. Marque inactifs les produits absents du batch courant
 *   9. Finalise le batch
 *
 * Idempotent : peut être relancé à tout moment.
 * Diff par contentHash : seuls les enregistrements modifiés reçoivent un UPDATE.
 *
 * Performance :
 *   - createMany + skipDuplicates pour les nouvelles entités (batch)
 *   - Mise à jour ligne par ligne uniquement pour les entités modifiées
 *   - Map en mémoire pour éviter N+1 sur la résolution des IDs
 */

import { db } from "@/lib/db";
import { parseCisFile }   from "./parsers/parse-cis";
import { parseCompoFile } from "./parsers/parse-compo";
import { parseCipFile }   from "./parsers/parse-cip";
import { parseGenerFile } from "./parsers/parse-gener";
import {
  buildBrandSlug,
  toCanonicalFrench,
  parseBdpmDosage,
  computeContentHash,
} from "./normalize";
import { buildNormalizedKey } from "@/lib/knowledge/terms/utils/normalize";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BdpmFiles {
  cis:   string;   // contenu de CIS_bdpm.txt
  compo: string;   // contenu de CIS_COMPO_bdpm.txt
  cip:   string;   // contenu de CIS_CIP_bdpm.txt
  gener: string;   // contenu de CIS_GENER_bdpm.txt
}

export interface IngestResult {
  batchId:          string;
  batchRef:         string;
  substancesUpserted: number;
  productsCreated:  number;
  productsUpdated:  number;
  productsUnchanged: number;
  productsInactive: number;
  presentationsUpserted: number;
  aliasesCreated:   number;
  durationMs:       number;
  errors:           string[];
}

// ---------------------------------------------------------------------------
// upsertSubstance — gestion robuste des conflits de clés
// ---------------------------------------------------------------------------
//
// Deux clés uniques existent sur DrugSubstance :
//   - substanceCode : identifiant BDPM (source de vérité pour les codes COMPO)
//   - normalizedKey : pivot sémantique (source de vérité pour le matching)
//
// Problème courant lors de la première ingestion réelle après un seed :
//   Le seed utilise des substanceCodes arbitraires (ex: "03210" pour sertraline).
//   BDPM réel utilise "03210" pour une substance DIFFÉRENTE, et un autre code
//   pour sertraline. L'upsert naïf par normalizedKey échoue si substanceCode
//   est déjà pris par un autre enregistrement.
//
// 5 cas gérés :
//   1. byKey && byCode && same id  → record cohérent, simple UPDATE champs sémantiques
//   2. byKey && byCode && diff ids → CONFLIT : le record byCode est un fantôme (code BDPM
//                                   assigné à une mauvaise substance). On orpheline byCode,
//                                   on met à jour byKey avec le vrai code.
//   3. byKey seul                  → record sémantiquement correct, substanceCode libéré.
//                                   UPDATE substanceCode + champs.
//   4. byCode seul                 → record avec bon code mais mauvais normalizedKey
//                                   (seed avec normalizedKey différent). UPDATE normalizedKey.
//   5. aucun                       → CREATE.

async function upsertSubstance(
  db: import("@prisma/client").PrismaClient,
  opts: {
    code:          string;
    name:          string;
    canonicalName: string;
    normalizedKey: string;
    batchRef:      string;
  },
): Promise<void> {
  const { code, name, canonicalName, normalizedKey, batchRef } = opts;

  const [byKey, byCode] = await Promise.all([
    db.drugSubstance.findUnique({ where: { normalizedKey }, select: { id: true, substanceCode: true } }),
    db.drugSubstance.findUnique({ where: { substanceCode: code }, select: { id: true, normalizedKey: true } }),
  ]);

  if (byKey && byCode && byKey.id === byCode.id) {
    // Cas 1 — record déjà cohérent (substanceCode et normalizedKey corrects)
    await db.drugSubstance.update({
      where: { id: byKey.id },
      data:  { name, canonicalName, batchId: batchRef, isActive: true },
    });
    return;
  }

  if (byKey && byCode) {
    // Cas 2 — CONFLIT : deux records distincts revendiquent cette substance.
    //   byKey : normalizedKey correct, substanceCode stale (seed ou ancienne ingestion)
    //   byCode : substanceCode correct (BDPM), normalizedKey incorrect (autre substance)
    //
    // Résolution : byKey est la source de vérité sémantique.
    //   → byCode devient orphelin (préfixe __orphan_ + désactivé)
    //   → byKey reçoit le vrai substanceCode BDPM
    const orphanCode = `__orphan_${byCode.id.slice(0, 12)}`;
    console.log(
      `[bdpm] ⚙ Conflit substanceCode résolu — ` +
      `code=${code} normalizedKey=${normalizedKey} ` +
      `(orphan: byCode.id=${byCode.id} normalizedKey=${byCode.normalizedKey})`
    );
    await db.drugSubstance.update({
      where: { id: byCode.id },
      data:  { substanceCode: orphanCode, isActive: false },
    });
    await db.drugSubstance.update({
      where: { id: byKey.id },
      data:  { substanceCode: code, name, canonicalName, batchId: batchRef, isActive: true },
    });
    return;
  }

  if (byKey) {
    // Cas 3 — record trouvé par normalizedKey, slot substanceCode libre
    await db.drugSubstance.update({
      where: { id: byKey.id },
      data:  { substanceCode: code, name, canonicalName, batchId: batchRef, isActive: true },
    });
    return;
  }

  if (byCode) {
    // Cas 4 — record trouvé par substanceCode, normalizedKey différent et slot libre
    // Ce record a un normalizedKey stale → on le met à jour avec les données BDPM
    await db.drugSubstance.update({
      where: { id: byCode.id },
      data:  { normalizedKey, name, canonicalName, batchId: batchRef, isActive: true },
    });
    return;
  }

  // Cas 5 — aucun record existant → CREATE
  await db.drugSubstance.create({
    data: { substanceCode: code, name, canonicalName, normalizedKey, batchId: batchRef },
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function ingestBdpm(
  files:    BdpmFiles,
  batchRef: string,
): Promise<IngestResult> {
  const startedAt = Date.now();
  const errors: string[] = [];

  // ── 1. Batch ──────────────────────────────────────────────────────────────
  const batch = await db.drugSyncBatch.upsert({
    where:  { batchRef },
    create: { batchRef, status: "RUNNING", startedAt: new Date() },
    update: { status: "RUNNING", startedAt: new Date(), errorMessage: null },
  });

  console.log(`[bdpm] Batch ${batchRef} démarré (id=${batch.id})`);

  try {
    // ── 2. Parsing ────────────────────────────────────────────────────────
    console.log("[bdpm] Parsing des fichiers…");
    const cisRows   = parseCisFile(files.cis);
    const compoRows = parseCompoFile(files.compo);
    const cipRows   = parseCipFile(files.cip);
    const generRows = parseGenerFile(files.gener);

    console.log(
      `[bdpm] Parsed — CIS:${cisRows.length} COMPO:${compoRows.length} ` +
      `CIP:${cipRows.length} GENER:${generRows.length}`
    );

    // ── 3. Groupes génériques ─────────────────────────────────────────────
    const uniqueGroups = new Map<string, string>(); // groupId → label
    for (const row of generRows) {
      if (!uniqueGroups.has(row.groupId)) {
        uniqueGroups.set(row.groupId, row.groupLabel);
      }
    }

    for (const [groupId, label] of uniqueGroups) {
      await db.drugGenericGroup.upsert({
        where:  { bdpmGroupId: groupId },
        create: { bdpmGroupId: groupId, label },
        update: { label },
      });
    }

    // Charger la map groupId → DB id
    const groupDbMap = new Map<string, string>(); // bdpmGroupId → id
    const allGroups = await db.drugGenericGroup.findMany({
      select: { id: true, bdpmGroupId: true },
    });
    for (const g of allGroups) groupDbMap.set(g.bdpmGroupId, g.id);

    // Map cisCode → genericGroupId (depuis CIS_GENER)
    const cisToGroupId = new Map<string, string>(); // cisCode → DB groupId
    for (const row of generRows) {
      const dbGroupId = groupDbMap.get(row.groupId);
      if (dbGroupId) cisToGroupId.set(row.cisCode, dbGroupId);
    }

    console.log(`[bdpm] Groupes génériques : ${uniqueGroups.size}`);

    // ── 4. Substances actives ─────────────────────────────────────────────
    // Déduplique par substanceCode (une substance peut apparaître dans plusieurs produits)
    const uniqueSubstances = new Map<string, { name: string; order: number }>();
    for (const row of compoRows) {
      if (!uniqueSubstances.has(row.substanceCode)) {
        uniqueSubstances.set(row.substanceCode, {
          name:  row.substanceName,
          order: row.substanceOrder,
        });
      }
    }

    let substancesUpserted = 0;
    // Track normalizedKeys already processed this batch to avoid in-batch duplicates.
    // BDPM peut avoir deux codes différents qui normalisent vers la même clé
    // (ex: "METFORMINE" et "METFORMINES") — le premier wins.
    const seenNormalizedKeys = new Set<string>();

    for (const [code, { name }] of uniqueSubstances) {
      const canonicalName = toCanonicalFrench(name);
      const normalizedKey = buildNormalizedKey(canonicalName);

      if (seenNormalizedKeys.has(normalizedKey)) continue;
      seenNormalizedKeys.add(normalizedKey);

      await upsertSubstance(db, { code, name, canonicalName, normalizedKey, batchRef });
      substancesUpserted++;
    }

    // Charger la map substanceCode → DB id
    const substanceDbMap = new Map<string, string>(); // substanceCode → id
    const allSubstances = await db.drugSubstance.findMany({
      select: { id: true, substanceCode: true },
    });
    for (const s of allSubstances) substanceDbMap.set(s.substanceCode, s.id);

    console.log(`[bdpm] Substances : ${substancesUpserted} upsertées`);

    // ── 5. Spécialités ────────────────────────────────────────────────────
    // Charger les hashes existants pour diff
    const existingProducts = await db.drugProduct.findMany({
      select: { id: true, cisCode: true, contentHash: true, isActive: true },
    });
    const existingMap = new Map<string, { id: string; hash: string | null }>();
    for (const p of existingProducts) existingMap.set(p.cisCode, { id: p.id, hash: p.contentHash });

    const cisCodesInBatch = new Set<string>();
    let productsCreated   = 0;
    let productsUpdated   = 0;
    let productsUnchanged = 0;

    for (const row of cisRows) {
      cisCodesInBatch.add(row.cisCode);

      const normalizedName  = buildNormalizedKey(row.name);
      const normalizedBrand = buildBrandSlug(row.name);
      const genericGroupId  = cisToGroupId.get(row.cisCode) ?? null;
      const hash = computeContentHash([row.cisCode, row.name, row.form, row.marketStatus]);

      const existing = existingMap.get(row.cisCode);

      if (!existing) {
        // Nouveau produit
        await db.drugProduct.create({
          data: {
            cisCode:        row.cisCode,
            name:           row.name,
            normalizedName,
            normalizedBrand,
            form:           row.form   || null,
            route:          row.routes || null,
            ammStatus:      row.ammStatus    || null,
            marketingStatus: row.marketStatus || null,
            genericGroupId,
            contentHash:    hash,
            batchId:        batchRef,
            isActive:       true,
          },
        });
        productsCreated++;
      } else if (existing.hash !== hash) {
        // Contenu changé
        await db.drugProduct.update({
          where: { cisCode: row.cisCode },
          data: {
            name:           row.name,
            normalizedName,
            normalizedBrand,
            form:           row.form   || null,
            route:          row.routes || null,
            ammStatus:      row.ammStatus    || null,
            marketingStatus: row.marketStatus || null,
            genericGroupId,
            contentHash:    hash,
            batchId:        batchRef,
            isActive:       true,
          },
        });
        productsUpdated++;
      } else {
        // Inchangé — juste mettre à jour batchId et isActive
        await db.drugProduct.update({
          where: { cisCode: row.cisCode },
          data:  { batchId: batchRef, isActive: true },
        });
        productsUnchanged++;
      }
    }

    console.log(
      `[bdpm] Produits — créés:${productsCreated} màj:${productsUpdated} ` +
      `inchangés:${productsUnchanged}`
    );

    // ── 6. Compositions produit ↔ substance ──────────────────────────────
    // Charger la map cisCode → DB product id
    const productDbMap = new Map<string, string>(); // cisCode → id
    const allProducts  = await db.drugProduct.findMany({
      select: { id: true, cisCode: true },
    });
    for (const p of allProducts) productDbMap.set(p.cisCode, p.id);

    // Construire les paires uniques (productId, substanceId)
    const compositionPairs = new Map<string, {
      productId: string;
      substanceId: string;
      dosageValue: number | null;
      dosageUnit: string | null;
      dosageRef: string | null;
      substanceOrder: number;
    }>();

    for (const row of compoRows) {
      const productId   = productDbMap.get(row.cisCode);
      const substanceId = substanceDbMap.get(row.substanceCode);
      if (!productId || !substanceId) continue;

      const key = `${productId}::${substanceId}`;
      if (compositionPairs.has(key)) continue;

      const dosage = parseBdpmDosage(row.dosageRaw);
      compositionPairs.set(key, {
        productId,
        substanceId,
        dosageValue:    dosage.value,
        dosageUnit:     dosage.unit,
        dosageRef:      row.dosageRef || null,
        substanceOrder: row.substanceOrder,
      });
    }

    // Charger les paires déjà en base
    const existingCompo = await db.drugProductSubstance.findMany({
      select: { productId: true, substanceId: true },
    });
    const existingCompoSet = new Set(
      existingCompo.map((c) => `${c.productId}::${c.substanceId}`)
    );

    const newCompositions = [...compositionPairs.values()].filter(
      (p) => !existingCompoSet.has(`${p.productId}::${p.substanceId}`)
    );

    if (newCompositions.length > 0) {
      await db.drugProductSubstance.createMany({
        data:           newCompositions,
        skipDuplicates: true,
      });
    }

    console.log(
      `[bdpm] Compositions : ${newCompositions.length} nouvelles / ${compositionPairs.size} total`
    );

    // ── 7. Présentations CIP ──────────────────────────────────────────────
    let presentationsUpserted = 0;

    // Note : cip7 et cip13 ont des partial unique indexes (WHERE IS NOT NULL),
    // incompatibles avec Prisma upsert (ON CONFLICT). On utilise find + create/update.
    // Pré-charger les présentations existantes pour éviter le N+1.
    const existingPresentations = await db.drugPresentation.findMany({
      select: { id: true, cip7: true, cip13: true },
    });
    const cipMap13 = new Map<string, string>(); // cip13 → id
    const cipMap7  = new Map<string, string>(); // cip7  → id
    for (const p of existingPresentations) {
      if (p.cip13) cipMap13.set(p.cip13, p.id);
      if (p.cip7)  cipMap7.set(p.cip7, p.id);
    }

    for (const row of cipRows) {
      const productId = productDbMap.get(row.cisCode);
      if (!productId) continue;
      if (!row.cip7 && !row.cip13) continue;

      const existingId = (row.cip13 && cipMap13.get(row.cip13))
        ?? (row.cip7 && cipMap7.get(row.cip7))
        ?? null;

      try {
        if (existingId) {
          await db.drugPresentation.update({
            where: { id: existingId },
            data: {
              label:        row.label,
              adminStatus:  row.adminStatus  || null,
              marketStatus: row.marketStatus || null,
              batchId:      batchRef,
            },
          });
        } else {
          const created = await db.drugPresentation.create({
            data: {
              productId,
              cip7:         row.cip7  || null,
              cip13:        row.cip13 || null,
              label:        row.label,
              adminStatus:  row.adminStatus  || null,
              marketStatus: row.marketStatus || null,
              batchId:      batchRef,
            },
            select: { id: true },
          });
          if (row.cip13) cipMap13.set(row.cip13, created.id);
          if (row.cip7)  cipMap7.set(row.cip7, created.id);
        }
        presentationsUpserted++;
      } catch {
        // Skip les CIP dupliqués (race condition ou données corrompues)
      }
    }

    console.log(`[bdpm] Présentations : ${presentationsUpserted} upsertées`);

    // ── 8. Alias automatiques ─────────────────────────────────────────────
    // Pour chaque produit actif : créer un alias sur normalizedBrand → productId
    // Pour chaque substance : créer un alias sur normalizedKey → substanceId
    let aliasesCreated = 0;

    // Alias par normalizedBrand (marque commerciale)
    const activeProducts = await db.drugProduct.findMany({
      where:  { isActive: true },
      select: { id: true, normalizedBrand: true, cisCode: true },
    });

    // Grouper par normalizedBrand — si plusieurs produits partagent la même marque,
    // l'alias pointe vers le premier trouvé (originator > générique dans BDPM)
    const brandToProductId = new Map<string, string>();
    for (const p of activeProducts) {
      if (p.normalizedBrand && !brandToProductId.has(p.normalizedBrand)) {
        brandToProductId.set(p.normalizedBrand, p.id);
      }
    }

    for (const [brandKey, productId] of brandToProductId) {
      if (!brandKey || brandKey.length < 2) continue;
      await db.drugAlias.upsert({
        where:  { key: brandKey },
        create: { key: brandKey, label: brandKey, productId, source: "BDPM" },
        update: { productId, source: "BDPM" },
      });
      aliasesCreated++;
    }

    // Alias par normalizedKey sur substance (DCI)
    const activeSubstances = await db.drugSubstance.findMany({
      where:  { isActive: true },
      select: { id: true, normalizedKey: true, name: true },
    });

    for (const s of activeSubstances) {
      if (!s.normalizedKey || s.normalizedKey.length < 2) continue;
      // Ne pas écraser un alias existant qui pointe déjà vers cette substance
      const existing = await db.drugAlias.findUnique({ where: { key: s.normalizedKey } });
      if (!existing) {
        await db.drugAlias.create({
          data: { key: s.normalizedKey, label: s.name, substanceId: s.id, source: "BDPM" },
        });
        aliasesCreated++;
      }
    }

    console.log(`[bdpm] Alias : ${aliasesCreated} créés/mis à jour`);

    // ── 9. Désactivation des produits absents du batch ────────────────────
    const inactiveResult = await db.drugProduct.updateMany({
      where: {
        isActive: true,
        cisCode: { notIn: [...cisCodesInBatch] },
      },
      data: { isActive: false },
    });
    const productsInactive = inactiveResult.count;

    console.log(`[bdpm] Produits désactivés (absents) : ${productsInactive}`);

    // ── 10. Finalisation batch ────────────────────────────────────────────
    const durationMs = Date.now() - startedAt;
    await db.drugSyncBatch.update({
      where: { id: batch.id },
      data: {
        status:         "DONE",
        productCount:   cisRows.length,
        substanceCount: uniqueSubstances.size,
        newCount:       productsCreated,
        updatedCount:   productsUpdated,
        inactiveCount:  productsInactive,
        finishedAt:     new Date(),
      },
    });

    console.log(
      `[bdpm] ✓ Import terminé — batch=${batchRef} ` +
      `produits=${cisRows.length} substances=${uniqueSubstances.size} ` +
      `durée=${durationMs}ms`
    );

    return {
      batchId:             batch.id,
      batchRef,
      substancesUpserted,
      productsCreated,
      productsUpdated,
      productsUnchanged,
      productsInactive,
      presentationsUpserted,
      aliasesCreated,
      durationMs,
      errors,
    };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[bdpm] ✗ Erreur critique — batch=${batchRef} : ${msg}`);

    await db.drugSyncBatch.update({
      where: { id: batch.id },
      data:  { status: "ERROR", errorMessage: msg.slice(0, 1000), finishedAt: new Date() },
    }).catch(() => {});

    return {
      batchId:             batch.id,
      batchRef,
      substancesUpserted:  0,
      productsCreated:     0,
      productsUpdated:     0,
      productsUnchanged:   0,
      productsInactive:    0,
      presentationsUpserted: 0,
      aliasesCreated:      0,
      durationMs:          Date.now() - startedAt,
      errors:              [msg],
    };
  }
}
