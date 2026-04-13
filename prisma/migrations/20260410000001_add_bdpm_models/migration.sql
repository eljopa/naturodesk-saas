-- ============================================================================
-- Migration : Ajout des modèles BDPM + mise à jour ConsultationMedicationIntake
-- ============================================================================

-- DrugSyncBatch
CREATE TABLE "drug_sync_batches" (
    "id"             TEXT NOT NULL,
    "batchRef"       TEXT NOT NULL,
    "source"         TEXT NOT NULL DEFAULT 'BDPM',
    "status"         TEXT NOT NULL DEFAULT 'PENDING',
    "productCount"   INTEGER NOT NULL DEFAULT 0,
    "substanceCount" INTEGER NOT NULL DEFAULT 0,
    "newCount"       INTEGER NOT NULL DEFAULT 0,
    "updatedCount"   INTEGER NOT NULL DEFAULT 0,
    "inactiveCount"  INTEGER NOT NULL DEFAULT 0,
    "errorMessage"   TEXT,
    "startedAt"      TIMESTAMP(3),
    "finishedAt"     TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_sync_batches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_sync_batches_batchRef_key" ON "drug_sync_batches"("batchRef");

-- DrugSubstance
CREATE TABLE "drug_substances" (
    "id"              TEXT NOT NULL,
    "substanceCode"   TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "canonicalName"   TEXT NOT NULL,
    "normalizedKey"   TEXT NOT NULL,
    "drugClass"       TEXT,
    "aliases"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive"        BOOLEAN NOT NULL DEFAULT TRUE,
    "batchId"         TEXT,
    "knowledgeTermId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_substances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_substances_substanceCode_key" ON "drug_substances"("substanceCode");
CREATE UNIQUE INDEX "drug_substances_normalizedKey_key"  ON "drug_substances"("normalizedKey");
CREATE INDEX "drug_substances_normalizedKey_idx" ON "drug_substances"("normalizedKey");
CREATE INDEX "drug_substances_drugClass_idx"     ON "drug_substances"("drugClass");

-- DrugGenericGroup (avant DrugProduct car FK)
CREATE TABLE "drug_generic_groups" (
    "id"          TEXT NOT NULL,
    "bdpmGroupId" TEXT NOT NULL,
    "label"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_generic_groups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_generic_groups_bdpmGroupId_key" ON "drug_generic_groups"("bdpmGroupId");

-- DrugProduct
CREATE TABLE "drug_products" (
    "id"              TEXT NOT NULL,
    "cisCode"         TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "normalizedName"  TEXT NOT NULL,
    "normalizedBrand" TEXT,
    "form"            TEXT,
    "route"           TEXT,
    "marketingStatus" TEXT,
    "ammStatus"       TEXT,
    "genericGroupId"  TEXT,
    "contentHash"     TEXT,
    "batchId"         TEXT,
    "isActive"        BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_products_cisCode_key"        ON "drug_products"("cisCode");
CREATE INDEX "drug_products_normalizedName_idx"  ON "drug_products"("normalizedName");
CREATE INDEX "drug_products_normalizedBrand_idx" ON "drug_products"("normalizedBrand");
CREATE INDEX "drug_products_cisCode_idx"         ON "drug_products"("cisCode");
CREATE INDEX "drug_products_isActive_idx"        ON "drug_products"("isActive");

-- DrugProductSubstance
CREATE TABLE "drug_product_substances" (
    "id"             TEXT NOT NULL,
    "productId"      TEXT NOT NULL,
    "substanceId"    TEXT NOT NULL,
    "dosageValue"    DOUBLE PRECISION,
    "dosageUnit"     TEXT,
    "dosageRef"      TEXT,
    "substanceOrder" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "drug_product_substances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_product_substances_productId_substanceId_key"
    ON "drug_product_substances"("productId", "substanceId");
CREATE INDEX "drug_product_substances_productId_idx"   ON "drug_product_substances"("productId");
CREATE INDEX "drug_product_substances_substanceId_idx" ON "drug_product_substances"("substanceId");

-- DrugAlias
CREATE TABLE "drug_aliases" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "productId"   TEXT,
    "substanceId" TEXT,
    "source"      TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_aliases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_aliases_key_key" ON "drug_aliases"("key");
CREATE INDEX "drug_aliases_key_idx"         ON "drug_aliases"("key");
CREATE INDEX "drug_aliases_productId_idx"   ON "drug_aliases"("productId");
CREATE INDEX "drug_aliases_substanceId_idx" ON "drug_aliases"("substanceId");

-- DrugPresentation
CREATE TABLE "drug_presentations" (
    "id"           TEXT NOT NULL,
    "productId"    TEXT NOT NULL,
    "cip7"         TEXT,
    "cip13"        TEXT,
    "label"        TEXT NOT NULL,
    "adminStatus"  TEXT,
    "marketStatus" TEXT,
    "batchId"      TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_presentations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_presentations_cip7_key"  ON "drug_presentations"("cip7")  WHERE "cip7"  IS NOT NULL;
CREATE UNIQUE INDEX "drug_presentations_cip13_key" ON "drug_presentations"("cip13") WHERE "cip13" IS NOT NULL;
CREATE INDEX "drug_presentations_productId_idx" ON "drug_presentations"("productId");

-- DrugClass
CREATE TABLE "drug_classes" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_classes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_classes_code_key" ON "drug_classes"("code");

-- DrugClassMember
CREATE TABLE "drug_class_members" (
    "id"          TEXT NOT NULL,
    "classId"     TEXT NOT NULL,
    "substanceId" TEXT NOT NULL,
    "source"      TEXT NOT NULL,

    CONSTRAINT "drug_class_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_class_members_classId_substanceId_key"
    ON "drug_class_members"("classId", "substanceId");
CREATE INDEX "drug_class_members_classId_idx"     ON "drug_class_members"("classId");
CREATE INDEX "drug_class_members_substanceId_idx" ON "drug_class_members"("substanceId");

-- ============================================================================
-- Mise à jour ConsultationMedicationIntake : ajout drugProductId + drugSubstanceId
-- ============================================================================
ALTER TABLE "consultation_medication_intakes"
    ADD COLUMN "drugProductId"   TEXT,
    ADD COLUMN "drugSubstanceId" TEXT;

CREATE INDEX "consultation_medication_intakes_drugSubstanceId_idx"
    ON "consultation_medication_intakes"("drugSubstanceId");

-- ============================================================================
-- Foreign Keys
-- ============================================================================

ALTER TABLE "drug_substances"
    ADD CONSTRAINT "drug_substances_knowledgeTermId_fkey"
    FOREIGN KEY ("knowledgeTermId") REFERENCES "knowledge_terms"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "drug_products"
    ADD CONSTRAINT "drug_products_genericGroupId_fkey"
    FOREIGN KEY ("genericGroupId") REFERENCES "drug_generic_groups"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "drug_product_substances"
    ADD CONSTRAINT "drug_product_substances_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "drug_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "drug_product_substances"
    ADD CONSTRAINT "drug_product_substances_substanceId_fkey"
    FOREIGN KEY ("substanceId") REFERENCES "drug_substances"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "drug_aliases"
    ADD CONSTRAINT "drug_aliases_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "drug_products"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "drug_aliases"
    ADD CONSTRAINT "drug_aliases_substanceId_fkey"
    FOREIGN KEY ("substanceId") REFERENCES "drug_substances"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "drug_presentations"
    ADD CONSTRAINT "drug_presentations_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "drug_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "drug_class_members"
    ADD CONSTRAINT "drug_class_members_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "drug_classes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "drug_class_members"
    ADD CONSTRAINT "drug_class_members_substanceId_fkey"
    FOREIGN KEY ("substanceId") REFERENCES "drug_substances"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consultation_medication_intakes"
    ADD CONSTRAINT "consultation_medication_intakes_drugProductId_fkey"
    FOREIGN KEY ("drugProductId") REFERENCES "drug_products"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "consultation_medication_intakes"
    ADD CONSTRAINT "consultation_medication_intakes_drugSubstanceId_fkey"
    FOREIGN KEY ("drugSubstanceId") REFERENCES "drug_substances"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
