-- Add legal acceptance timestamps to users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3);
