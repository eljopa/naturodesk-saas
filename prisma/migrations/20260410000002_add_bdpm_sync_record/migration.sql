-- Migration : Ajout du modèle BdpmSyncRecord pour le suivi des lots d'ingestion BDPM

CREATE TABLE "bdpm_sync_records" (
    "id"               TEXT NOT NULL,
    "source"           TEXT NOT NULL,
    "batchId"          TEXT NOT NULL,
    "storageBucket"    TEXT,
    "storagePath"      TEXT,
    "status"           TEXT NOT NULL,
    "startedAt"        TIMESTAMP(3),
    "completedAt"      TIMESTAMP(3),
    "filesProcessed"   INTEGER,
    "documentsCreated" INTEGER,
    "chunksCreated"    INTEGER,
    "factsCreated"     INTEGER,
    "errorMessage"     TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bdpm_sync_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bdpm_sync_records_source_batchId_key"
    ON "bdpm_sync_records"("source", "batchId");

CREATE INDEX "bdpm_sync_records_source_status_idx"
    ON "bdpm_sync_records"("source", "status");

CREATE INDEX "bdpm_sync_records_status_startedAt_idx"
    ON "bdpm_sync_records"("status", "startedAt");
