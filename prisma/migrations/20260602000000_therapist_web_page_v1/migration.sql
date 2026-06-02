-- Migration : page web thérapeute V1 (Lot A)
--
-- Ajoute :
--   Tables : therapist_web_pages  — page publique 1-1 avec User
--            service_offerings    — prestations métier liées à User
--            practitioner_schedules — disponibilités hebdomadaires (source unique)
--            contact_messages     — messages formulaire de contact (non exposé UI)

-- ── therapist_web_pages ─────────────────────────────────────────────────────

CREATE TABLE "therapist_web_pages" (
    "id"                   TEXT        NOT NULL,
    "userId"               TEXT        NOT NULL,
    "slug"                 TEXT        NOT NULL,
    "slugLockedAt"         TIMESTAMP(3),
    "isPublished"          BOOLEAN     NOT NULL DEFAULT false,
    "publishedAt"          TIMESTAMP(3),
    "logoUrl"              TEXT,
    "heroThemeId"          INTEGER     NOT NULL DEFAULT 1,
    "bio"                  TEXT,
    "presentation"         TEXT,
    "servicesDisplay"      TEXT,
    "pricingDisplay"       TEXT,
    "address"              TEXT,
    "phone"                TEXT,
    "contactEmail"         TEXT,
    "socialLinks"          JSONB,
    "seoTitle"             TEXT,
    "seoDescription"       TEXT,
    "contactFormEnabled"   BOOLEAN     NOT NULL DEFAULT true,
    "appointmentEnabled"   BOOLEAN     NOT NULL DEFAULT false,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_web_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "therapist_web_pages_userId_key"      ON "therapist_web_pages"("userId");
CREATE UNIQUE INDEX "therapist_web_pages_slug_key"        ON "therapist_web_pages"("slug");
CREATE INDEX        "therapist_web_pages_slug_idx"        ON "therapist_web_pages"("slug");
CREATE INDEX        "therapist_web_pages_isPublished_idx" ON "therapist_web_pages"("isPublished");

ALTER TABLE "therapist_web_pages"
    ADD CONSTRAINT "therapist_web_pages_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── service_offerings ───────────────────────────────────────────────────────

CREATE TABLE "service_offerings" (
    "id"              TEXT         NOT NULL,
    "userId"          TEXT         NOT NULL,
    "name"            TEXT         NOT NULL,
    "description"     TEXT,
    "durationMinutes" INTEGER      NOT NULL,
    "price"           DOUBLE PRECISION,
    "isActive"        BOOLEAN      NOT NULL DEFAULT true,
    "displayOrder"    INTEGER      NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_offerings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_offerings_userId_idx"   ON "service_offerings"("userId");
CREATE INDEX "service_offerings_isActive_idx" ON "service_offerings"("isActive");

ALTER TABLE "service_offerings"
    ADD CONSTRAINT "service_offerings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── practitioner_schedules ──────────────────────────────────────────────────

CREATE TABLE "practitioner_schedules" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "scheduleJson" JSONB        NOT NULL DEFAULT '{}',
    "timezone"     TEXT         NOT NULL DEFAULT 'Europe/Paris',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practitioner_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "practitioner_schedules_userId_key" ON "practitioner_schedules"("userId");

ALTER TABLE "practitioner_schedules"
    ADD CONSTRAINT "practitioner_schedules_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── contact_messages ────────────────────────────────────────────────────────

CREATE TABLE "contact_messages" (
    "id"          TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "senderName"  TEXT         NOT NULL,
    "senderEmail" TEXT         NOT NULL,
    "senderPhone" TEXT,
    "message"     TEXT         NOT NULL,
    "isRead"      BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_messages_userId_idx" ON "contact_messages"("userId");
CREATE INDEX "contact_messages_isRead_idx" ON "contact_messages"("isRead");

ALTER TABLE "contact_messages"
    ADD CONSTRAINT "contact_messages_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
