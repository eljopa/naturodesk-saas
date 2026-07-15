-- Add reminder tracking timestamp to appointments table
ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
