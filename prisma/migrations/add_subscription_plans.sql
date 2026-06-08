-- Ajouter STARTER et GROWTH à l'enum SubscriptionPlan
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'GROWTH';

-- Créer l'enum BillingInterval
DO $$ BEGIN
  CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ajouter la colonne billingInterval à la table subscriptions
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY';
