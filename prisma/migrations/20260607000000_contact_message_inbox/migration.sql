-- Migration : contact_message_inbox (additive)
--
-- Ajoute : enum ContactMessageStatus, colonnes status / readAt / repliedAt /
--          archivedAt / notes / updatedAt sur contact_messages.
-- Backfill : isRead=true → status='READ', sinon 'UNREAD'.
-- isRead est conservé — suppression prévue en migration ultérieure après validation.

-- ── Enum statut message ─────────────────────────────────────────────────────

CREATE TYPE "ContactMessageStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED', 'ARCHIVED');

-- ── Nouvelles colonnes ───────────────────────────────────────────────────────

ALTER TABLE "contact_messages"
  ADD COLUMN "status"     "ContactMessageStatus" NOT NULL DEFAULT 'UNREAD',
  ADD COLUMN "readAt"     TIMESTAMP(3),
  ADD COLUMN "repliedAt"  TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "notes"      TEXT,
  ADD COLUMN "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ── Backfill depuis isRead ───────────────────────────────────────────────────

UPDATE "contact_messages"
SET "status" = 'READ',
    "readAt" = "createdAt"
WHERE "isRead" = true;

-- ── Indices inbox ────────────────────────────────────────────────────────────

CREATE INDEX "contact_messages_status_idx"    ON "contact_messages"("status");
CREATE INDEX "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");
