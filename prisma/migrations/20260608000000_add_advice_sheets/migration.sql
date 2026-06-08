-- CreateEnum
CREATE TYPE "AdviceSheetStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateTable
CREATE TABLE "advice_sheets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT,
    "parentId" TEXT,
    "title" TEXT,
    "versionMajor" INTEGER NOT NULL DEFAULT 1,
    "versionMinor" INTEGER NOT NULL DEFAULT 0,
    "status" "AdviceSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "consultationSummary" TEXT,
    "objectives" TEXT,
    "dietaryAdvice" TEXT,
    "supplements" TEXT,
    "phytotherapy" TEXT,
    "aromatherapy" TEXT,
    "micronutrition" TEXT,
    "gemmotherapy" TEXT,
    "bachFlowers" TEXT,
    "lifestyle" TEXT,
    "physicalActivity" TEXT,
    "additionalNotes" TEXT,
    "precautions" TEXT,
    "aiDraftGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advice_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "advice_sheets_userId_idx" ON "advice_sheets"("userId");

-- CreateIndex
CREATE INDEX "advice_sheets_patientId_idx" ON "advice_sheets"("patientId");

-- CreateIndex
CREATE INDEX "advice_sheets_consultationId_idx" ON "advice_sheets"("consultationId");

-- CreateIndex
CREATE INDEX "advice_sheets_parentId_idx" ON "advice_sheets"("parentId");

-- CreateIndex
CREATE INDEX "advice_sheets_status_idx" ON "advice_sheets"("status");

-- AddForeignKey
ALTER TABLE "advice_sheets" ADD CONSTRAINT "advice_sheets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advice_sheets" ADD CONSTRAINT "advice_sheets_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advice_sheets" ADD CONSTRAINT "advice_sheets_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advice_sheets" ADD CONSTRAINT "advice_sheets_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "advice_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
