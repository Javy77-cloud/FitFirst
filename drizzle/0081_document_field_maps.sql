-- sep7at: per-form extract maps + property enrichment cache.
-- Additive only. Does not wipe or reseed. No db:seed.
-- Runtime extract reads TypeScript maps; this table mirrors them.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_field_maps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "doc_type" text NOT NULL,
  "source_label" text NOT NULL,
  "sheet_field" text NOT NULL,
  "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_field_maps_type_idx" ON "document_field_maps" ("tenant_id", "doc_type");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "document_field_maps_uidx" ON "document_field_maps" ("tenant_id", "doc_type", "source_label");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_enrichment_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "deal_id" uuid REFERENCES "deals"("id"),
  "address_key" text NOT NULL,
  "provider" text NOT NULL,
  "facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_enrichment_cache_addr_idx" ON "property_enrichment_cache" ("tenant_id", "address_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "property_enrichment_cache_uidx" ON "property_enrichment_cache" ("tenant_id", "address_key");
--> statement-breakpoint
INSERT INTO "document_field_maps" ("tenant_id", "doc_type", "source_label", "sheet_field", "aliases")
SELECT '11111111-1111-4111-8111-111111111111', v.doc_type, v.source_label, v.sheet_field, v.aliases::jsonb
FROM (VALUES
  ('wind_mit', 'Roof covering', 'roof_covering', '["Roof cov","Roof type","Roof material"]'),
  ('wind_mit', 'Roof deck attachment', 'roof_deck', '["Roof deck"]'),
  ('wind_mit', 'Roof-to-wall connection', 'roof_to_wall', '["Roof to wall connection","Roof to wall"]'),
  ('wind_mit', 'Opening protection', 'opening_protection', '["Opn prot","Shutters"]'),
  ('wind_mit', 'Roof geometry', 'roof_shape', '["Roof shape"]'),
  ('wind_mit', 'Secondary water resistance', 'swr', '["SWR","Secondary water"]'),
  ('four_point', 'Age of electrical panel', 'electrical_year', '["Electrical year"]'),
  ('four_point', 'Year last updated', 'electrical_updated', '["Electrical updated"]'),
  ('four_point', 'Age of piping supply system', 'plumbing_year', '["Plumbing year"]'),
  ('four_point', 'Age of water heater', 'water_heater_year', '["Water heater year","Water heater"]'),
  ('four_point', 'HVAC year', 'hvac_year', '["Age of HVAC"]'),
  ('four_point', 'Actual year built', 'year_built', '["Year built","Year of construction"]'),
  ('dec', 'Coverage A', 'coverage_a', '["Coverage A Dwelling","Cov A","Dwelling","Dwelling limit"]'),
  ('dec', 'Named insured', 'named_insured', '["Primary named insured","Insured"]'),
  ('dec', 'Location', 'address', '["Property address","Insured location","Residence premises"]'),
  ('dec', 'Year built', 'year_built', '["Yr Blt","Year of construction","Built"]'),
  ('policy', 'Policy number', 'policy_number', '["Policy no"]'),
  ('policy', 'Form', 'form', '["Policy form"]')
) AS v(doc_type, source_label, sheet_field, aliases)
WHERE EXISTS (SELECT 1 FROM "tenants" WHERE "id" = '11111111-1111-4111-8111-111111111111')
ON CONFLICT ("tenant_id", "doc_type", "source_label") DO NOTHING;
