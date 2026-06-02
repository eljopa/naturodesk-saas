-- Migration : ajout appointmentType sur service_offerings
-- AppointmentType est déjà défini comme enum PostgreSQL dans la migration 0_init.

ALTER TABLE "service_offerings"
  ADD COLUMN "appointmentType" "AppointmentType" NOT NULL DEFAULT 'BILAN';
