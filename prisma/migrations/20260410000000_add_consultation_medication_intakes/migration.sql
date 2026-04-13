-- CreateTable
CREATE TABLE "consultation_medication_intakes" (
    "id"                   TEXT NOT NULL,
    "consultationId"       TEXT NOT NULL,
    "rawText"              TEXT NOT NULL,
    "parsedLabel"          TEXT,
    "parsedBrandName"      TEXT,
    "normalizedKey"        TEXT,
    "knowledgeTermId"      TEXT,
    "doseValue"            DOUBLE PRECISION,
    "doseUnit"             TEXT,
    "frequencyText"        TEXT,
    "durationText"         TEXT,
    "galenicForm"          TEXT,
    "parseStatus"          "IntakeParseStatus" NOT NULL DEFAULT 'PARTIAL',
    "parseConfidence"      "IntakeConfidence"  NOT NULL DEFAULT 'LOW',
    "resolutionConfidence" TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_medication_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultation_medication_intakes_consultationId_idx"
    ON "consultation_medication_intakes"("consultationId");

-- CreateIndex
CREATE INDEX "consultation_medication_intakes_normalizedKey_idx"
    ON "consultation_medication_intakes"("normalizedKey");

-- AddForeignKey
ALTER TABLE "consultation_medication_intakes"
    ADD CONSTRAINT "consultation_medication_intakes_consultationId_fkey"
    FOREIGN KEY ("consultationId") REFERENCES "consultations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_medication_intakes"
    ADD CONSTRAINT "consultation_medication_intakes_knowledgeTermId_fkey"
    FOREIGN KEY ("knowledgeTermId") REFERENCES "knowledge_terms"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
