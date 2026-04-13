-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PRACTITIONER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('BILAN', 'SUIVI');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('DRAFT', 'READY', 'ANALYSIS_PENDING', 'ANALYSIS_RUNNING', 'ANALYSIS_DONE', 'ANALYSIS_ERROR');

-- CreateEnum
CREATE TYPE "MedicationLoadLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FindingCategory" AS ENUM ('SIDE_EFFECT', 'INTERACTION', 'DEPLETION', 'RED_FLAG', 'TERRAIN', 'PROTOCOL', 'QUESTION');

-- CreateEnum
CREATE TYPE "FindingSourceType" AS ENUM ('RULE', 'LLM', 'SEMANTIC', 'MANUAL', 'KNOWLEDGE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'CHECK');

-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('BDPM', 'ANSM', 'PUBMED', 'MANUAL', 'NIH_ODS', 'NIH_DSLD');

-- CreateEnum
CREATE TYPE "KnowledgeDocType" AS ENUM ('MONOGRAPH', 'NOTICE', 'INTERACTION_SHEET', 'STUDY', 'FACT_SHEET', 'PRODUCT_LABEL');

-- CreateEnum
CREATE TYPE "FactPredicate" AS ENUM ('CAUSES', 'INTERACTS_WITH', 'DEPLETES', 'CONTRAINDICATED_WITH', 'TREATS', 'INHIBITS', 'POTENTIATES', 'REDUCES_EFFICACY_OF', 'INCREASES_RISK_OF', 'REQUIRES_MONITORING_WITH');

-- CreateEnum
CREATE TYPE "TermType" AS ENUM ('DRUG', 'SUPPLEMENT', 'NUTRIENT', 'SYMPTOM', 'CONDITION', 'HERB', 'SUBSTANCE');

-- CreateEnum
CREATE TYPE "ExtractionMethod" AS ENUM ('DETERMINISTIC', 'LLM_ASSISTED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'ERROR', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FactType" AS ENUM ('SIDE_EFFECT', 'INTERACTION', 'DEPLETION', 'CONTRAINDICATION', 'WARNING', 'INDICATION', 'MECHANISM', 'DOSAGE_NOTE');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'ERROR');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('RED_FLAG', 'MISSING_DATA', 'MEDICATION_LOAD', 'DEPLETION', 'PROTOCOL_VIGILANCE');

-- CreateEnum
CREATE TYPE "ProtocolCategory" AS ENUM ('DIGESTIVE', 'HORMONAL', 'STRESS', 'DETOX', 'IMMUNITY', 'ENERGY', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('APPOINTMENT', 'CONSULTATION', 'FINDING', 'PROTOCOL_CHANGE', 'SYMPTOM_CHANGE', 'NOTE');

-- CreateEnum
CREATE TYPE "TimelineEventSource" AS ENUM ('SYSTEM', 'PRACTITIONER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cabinetName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PRACTITIONER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "profession" TEXT,
    "allergies" TEXT,
    "medicalHistory" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'BILAN',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "source" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'DRAFT',
    "context" TEXT,
    "medicationLoadScore" DOUBLE PRECISION,
    "medicationLoadLevel" "MedicationLoadLevel",
    "terrainSummary" TEXT,
    "protocolCoherenceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptoms" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "normalizedLabel" TEXT,
    "intensity" INTEGER,
    "duration" TEXT,
    "category" TEXT,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "normalizedName" TEXT,
    "drugKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplements" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "duration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "analysisRunId" TEXT,
    "category" "FindingCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel" TEXT,
    "validated" BOOLEAN,
    "practitionerNote" TEXT,
    "sourceType" "FindingSourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "excerpt" TEXT,
    "url" TEXT,
    "knowledgeFactId" TEXT,
    "knowledgeChunkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "symptomEvolution" TEXT,
    "protocolAdjustment" TEXT,
    "observations" TEXT,
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "drugKey" TEXT NOT NULL,
    "sourceType" "KnowledgeSourceType" NOT NULL,
    "docType" "KnowledgeDocType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "contentHash" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "sectionPath" TEXT,
    "metaJson" JSONB,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_facts" (
    "id" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "factType" "FactType" NOT NULL,
    "subject" TEXT NOT NULL,
    "subjectType" "TermType" NOT NULL,
    "predicate" "FactPredicate" NOT NULL,
    "object" TEXT NOT NULL,
    "objectType" "TermType" NOT NULL,
    "qualifier" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "extractionMethod" "ExtractionMethod" NOT NULL DEFAULT 'DETERMINISTIC',
    "rawExcerpt" TEXT,
    "subjectTermId" TEXT,
    "objectTermId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_terms" (
    "id" TEXT NOT NULL,
    "termType" "TermType" NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "aliases" TEXT[],
    "drugKey" TEXT,
    "odsId" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_source_syncs" (
    "id" TEXT NOT NULL,
    "sourceType" "KnowledgeSourceType" NOT NULL,
    "drugKey" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "docCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_source_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_products" (
    "id" TEXT NOT NULL,
    "dsldId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "marketStatus" TEXT,
    "servingSize" TEXT,
    "servingSizeUom" TEXT,
    "language" TEXT DEFAULT 'EN',
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplement_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_ingredients" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "normalizedKey" TEXT,
    "termId" TEXT,
    "amount" DOUBLE PRECISION,
    "unit" TEXT,
    "ingredientForm" TEXT,
    "dailyValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplement_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "stage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_logs" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_runs" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "matched" BOOLEAN NOT NULL,
    "evidenceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "ProtocolCategory" NOT NULL,
    "contentJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocol_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "TimelineEventType" NOT NULL,
    "label" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "TimelineEventSource" NOT NULL DEFAULT 'SYSTEM',
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pattern_cases" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "symptomCluster" JSONB,
    "terrainType" TEXT,
    "medicationContext" JSONB,
    "protocolSnapshot" JSONB,
    "outcomeScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pattern_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_replies" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_authId_key" ON "users"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "patients_userId_idx" ON "patients"("userId");

-- CreateIndex
CREATE INDEX "patients_isArchived_idx" ON "patients"("isArchived");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "appointments_userId_idx" ON "appointments"("userId");

-- CreateIndex
CREATE INDEX "appointments_startAt_idx" ON "appointments"("startAt");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_appointmentId_key" ON "consultations"("appointmentId");

-- CreateIndex
CREATE INDEX "consultations_patientId_idx" ON "consultations"("patientId");

-- CreateIndex
CREATE INDEX "consultations_status_idx" ON "consultations"("status");

-- CreateIndex
CREATE INDEX "symptoms_consultationId_idx" ON "symptoms"("consultationId");

-- CreateIndex
CREATE INDEX "medications_consultationId_idx" ON "medications"("consultationId");

-- CreateIndex
CREATE INDEX "medications_drugKey_idx" ON "medications"("drugKey");

-- CreateIndex
CREATE INDEX "supplements_consultationId_idx" ON "supplements"("consultationId");

-- CreateIndex
CREATE INDEX "findings_consultationId_idx" ON "findings"("consultationId");

-- CreateIndex
CREATE INDEX "findings_analysisRunId_idx" ON "findings"("analysisRunId");

-- CreateIndex
CREATE INDEX "findings_validated_idx" ON "findings"("validated");

-- CreateIndex
CREATE INDEX "citations_findingId_idx" ON "citations"("findingId");

-- CreateIndex
CREATE INDEX "citations_knowledgeFactId_idx" ON "citations"("knowledgeFactId");

-- CreateIndex
CREATE UNIQUE INDEX "follow_ups_appointmentId_key" ON "follow_ups"("appointmentId");

-- CreateIndex
CREATE INDEX "follow_ups_patientId_idx" ON "follow_ups"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_patientId_idx" ON "invoices"("patientId");

-- CreateIndex
CREATE INDEX "invoices_userId_idx" ON "invoices"("userId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoice_lines_invoiceId_idx" ON "invoice_lines"("invoiceId");

-- CreateIndex
CREATE INDEX "knowledge_documents_drugKey_idx" ON "knowledge_documents"("drugKey");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_documents_drugKey_sourceType_contentHash_key" ON "knowledge_documents"("drugKey", "sourceType", "contentHash");

-- CreateIndex
CREATE INDEX "knowledge_chunks_documentId_idx" ON "knowledge_chunks"("documentId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_kind_idx" ON "knowledge_chunks"("kind");

-- CreateIndex
CREATE INDEX "knowledge_facts_chunkId_idx" ON "knowledge_facts"("chunkId");

-- CreateIndex
CREATE INDEX "knowledge_facts_documentId_idx" ON "knowledge_facts"("documentId");

-- CreateIndex
CREATE INDEX "knowledge_facts_factType_idx" ON "knowledge_facts"("factType");

-- CreateIndex
CREATE INDEX "knowledge_facts_subject_idx" ON "knowledge_facts"("subject");

-- CreateIndex
CREATE INDEX "knowledge_facts_subjectTermId_idx" ON "knowledge_facts"("subjectTermId");

-- CreateIndex
CREATE INDEX "knowledge_facts_predicate_idx" ON "knowledge_facts"("predicate");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_terms_normalizedKey_key" ON "knowledge_terms"("normalizedKey");

-- CreateIndex
CREATE INDEX "knowledge_terms_termType_idx" ON "knowledge_terms"("termType");

-- CreateIndex
CREATE INDEX "knowledge_terms_drugKey_idx" ON "knowledge_terms"("drugKey");

-- CreateIndex
CREATE INDEX "knowledge_terms_odsId_idx" ON "knowledge_terms"("odsId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_terms_termType_canonicalName_key" ON "knowledge_terms"("termType", "canonicalName");

-- CreateIndex
CREATE INDEX "knowledge_source_syncs_status_idx" ON "knowledge_source_syncs"("status");

-- CreateIndex
CREATE INDEX "knowledge_source_syncs_sourceType_idx" ON "knowledge_source_syncs"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_source_syncs_sourceType_drugKey_key" ON "knowledge_source_syncs"("sourceType", "drugKey");

-- CreateIndex
CREATE UNIQUE INDEX "supplement_products_dsldId_key" ON "supplement_products"("dsldId");

-- CreateIndex
CREATE INDEX "supplement_products_brandName_idx" ON "supplement_products"("brandName");

-- CreateIndex
CREATE INDEX "supplement_products_productName_idx" ON "supplement_products"("productName");

-- CreateIndex
CREATE INDEX "supplement_ingredients_productId_idx" ON "supplement_ingredients"("productId");

-- CreateIndex
CREATE INDEX "supplement_ingredients_normalizedKey_idx" ON "supplement_ingredients"("normalizedKey");

-- CreateIndex
CREATE INDEX "supplement_ingredients_termId_idx" ON "supplement_ingredients"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_runs_idempotencyKey_key" ON "analysis_runs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "analysis_runs_consultationId_idx" ON "analysis_runs"("consultationId");

-- CreateIndex
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs"("status");

-- CreateIndex
CREATE INDEX "analysis_logs_runId_idx" ON "analysis_logs"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "rules_code_key" ON "rules"("code");

-- CreateIndex
CREATE INDEX "rule_runs_consultationId_idx" ON "rule_runs"("consultationId");

-- CreateIndex
CREATE UNIQUE INDEX "protocol_templates_slug_key" ON "protocol_templates"("slug");

-- CreateIndex
CREATE INDEX "timeline_events_patientId_idx" ON "timeline_events"("patientId");

-- CreateIndex
CREATE INDEX "timeline_events_date_idx" ON "timeline_events"("date");

-- CreateIndex
CREATE INDEX "pattern_cases_patientId_idx" ON "pattern_cases"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_plan_idx" ON "subscriptions"("plan");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_ticket_replies_ticketId_idx" ON "support_ticket_replies"("ticketId");

-- CreateIndex
CREATE INDEX "support_ticket_replies_authorId_idx" ON "support_ticket_replies"("authorId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminId_idx" ON "admin_audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_targetType_targetId_idx" ON "admin_audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptoms" ADD CONSTRAINT "symptoms_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplements" ADD CONSTRAINT "supplements_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_knowledgeFactId_fkey" FOREIGN KEY ("knowledgeFactId") REFERENCES "knowledge_facts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_knowledgeChunkId_fkey" FOREIGN KEY ("knowledgeChunkId") REFERENCES "knowledge_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_facts" ADD CONSTRAINT "knowledge_facts_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "knowledge_chunks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_facts" ADD CONSTRAINT "knowledge_facts_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_facts" ADD CONSTRAINT "knowledge_facts_subjectTermId_fkey" FOREIGN KEY ("subjectTermId") REFERENCES "knowledge_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_facts" ADD CONSTRAINT "knowledge_facts_objectTermId_fkey" FOREIGN KEY ("objectTermId") REFERENCES "knowledge_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_ingredients" ADD CONSTRAINT "supplement_ingredients_productId_fkey" FOREIGN KEY ("productId") REFERENCES "supplement_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_ingredients" ADD CONSTRAINT "supplement_ingredients_termId_fkey" FOREIGN KEY ("termId") REFERENCES "knowledge_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_logs" ADD CONSTRAINT "analysis_logs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "analysis_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_runs" ADD CONSTRAINT "rule_runs_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_runs" ADD CONSTRAINT "rule_runs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_cases" ADD CONSTRAINT "pattern_cases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_cases" ADD CONSTRAINT "pattern_cases_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_replies" ADD CONSTRAINT "support_ticket_replies_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_replies" ADD CONSTRAINT "support_ticket_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
