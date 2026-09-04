ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "middle_name" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "insurance_type_desired" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "preferred_language" text;
