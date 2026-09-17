-- Stable picklist identity so Settings → Picklists rename / delete stick.
-- Additive only. Backfills seed_key from current starter names. Does not rewrite options.
--> statement-breakpoint
ALTER TABLE "desk_field_picklists" ADD COLUMN IF NOT EXISTS "seed_key" text;
--> statement-breakpoint
ALTER TABLE "desk_field_picklists" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "desk_field_picklists"
SET "seed_key" = CASE lower(trim("name"))
  WHEN 'us states' THEN 'us_states'
  WHEN 'lines of business' THEN 'lines_of_business'
  WHEN 'common carriers' THEN 'common_carriers'
  WHEN 'lead cadence' THEN 'lead_cadence'
  WHEN 'occupations' THEN 'occupations'
  WHEN 'industries' THEN 'industries'
  WHEN 'recent life events' THEN 'recent_life_events'
  WHEN 'policy subtypes' THEN 'policy_subtypes'
  WHEN 'cross-selling opportunities' THEN 'cross_selling_opportunities'
  WHEN 'lead source' THEN 'lead_source'
  WHEN 'marital status' THEN 'marital_status'
  WHEN 'education level' THEN 'education_level'
  WHEN 'employment status' THEN 'employment_status'
  WHEN 'preferred contact method' THEN 'preferred_contact_method'
  WHEN 'preferred contact time' THEN 'preferred_contact_time'
  WHEN 'deal notices' THEN 'deal_notices'
  WHEN 'deal notices · p&c' THEN 'deal_notices_pc'
  WHEN 'deal notices · life' THEN 'deal_notices_life'
  WHEN 'deal notices · health' THEN 'deal_notices_health'
  WHEN 'life medical conditions' THEN 'life_medical_conditions'
  ELSE "seed_key"
END
WHERE "seed_key" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "desk_field_picklists_seed_uidx"
  ON "desk_field_picklists" ("tenant_id", "seed_key")
  WHERE "seed_key" IS NOT NULL;
