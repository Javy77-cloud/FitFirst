-- Agency master line-of-business catalog. Deals / policies / forms store `code`.
CREATE TABLE IF NOT EXISTS "agency_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "code" text NOT NULL,
  "label" text NOT NULL,
  "family" text DEFAULT 'pc' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "system" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_lines_tenant_idx" ON "agency_lines" ("tenant_id", "family");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_lines_code_uidx" ON "agency_lines" ("tenant_id", "code");
--> statement-breakpoint
INSERT INTO "agency_lines" ("tenant_id", "code", "label", "family", "active", "sort_order", "aliases", "system")
SELECT t.id, v.code, v.label, v.family, true, v.sort_order, v.aliases::jsonb, true
FROM "tenants" t
CROSS JOIN (
  VALUES
    ('HO', 'Homeowners', 'pc', 0, '["home","homeowners","homeowner","ho3","ho4","ho5","ho6","ho8","mho","mdp","mh","dp","dp1","dp3","renters","landlord","dwelling"]'),
    ('AUTO', 'Auto', 'pc', 1, '["pa","personal auto","car","motorcycle","ca","commercial auto","commercial_auto"]'),
    ('FLOOD', 'Flood', 'pc', 2, '["nfip","flood insurance"]'),
    ('UMBRELLA', 'Umbrella', 'pc', 3, '["pumb","excess","personal umbrella"]'),
    ('RV', 'Rec / RV', 'pc', 4, '["rec","rec rv","rec_rv","boat","boat/watercraft","watercraft"]'),
    ('GL', 'General liability', 'pc', 5, '["general liability","cgl"]'),
    ('BOP', 'BOP', 'pc', 6, '["business owners","business owner''s","business owners policy"]'),
    ('WC', 'Workers Comp', 'pc', 7, '["workers_comp","workers comp","workers'' comp","work comp"]'),
    ('LIFE', 'Life', 'life', 8, '["term life","whole life","iul","final expense","universal life"]'),
    ('HEALTH', 'Health', 'health', 9, '["marketplace","medicare","medicare advantage","aca","medigap","supplemental"]')
) AS v(code, label, family, sort_order, aliases)
WHERE NOT EXISTS (
  SELECT 1 FROM "agency_lines" existing
  WHERE existing.tenant_id = t.id AND existing.code = v.code
);
--> statement-breakpoint
-- Canonicalize known aliases on deals / policies. Unknown free-text stays (orphans).
UPDATE "deals" SET "line_of_business" = 'HO', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN (
  'HO3','HO4','HO5','HO6','HO8','HOMEOWNERS','HOME','HOMEOWNER','RENTERS','LANDLORD','DP','DP1','DP3','MHO','MDP','MH','DWELLING'
);
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'HO', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN (
  'HO3','HO4','HO5','HO6','HO8','HOMEOWNERS','HOME','HOMEOWNER','RENTERS','LANDLORD','DP','DP1','DP3','MHO','MDP','MH','DWELLING'
);
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'AUTO', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN (
  'PA','PERSONAL AUTO','CAR','MOTORCYCLE','CA','COMMERCIAL AUTO','COMMERCIAL_AUTO'
);
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'AUTO', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN (
  'PA','PERSONAL AUTO','CAR','MOTORCYCLE','CA','COMMERCIAL AUTO','COMMERCIAL_AUTO'
);
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'RV', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('REC','REC RV','REC_RV','BOAT','BOAT/WATERCRAFT','WATERCRAFT');
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'RV', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('REC','REC RV','REC_RV','BOAT','BOAT/WATERCRAFT','WATERCRAFT');
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'WC', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('WORKERS_COMP','WORKERS COMP','WORKERS'' COMP','WORK COMP');
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'WC', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('WORKERS_COMP','WORKERS COMP','WORKERS'' COMP','WORK COMP');
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'LIFE', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('TERM LIFE','WHOLE LIFE','IUL','FINAL EXPENSE','UNIVERSAL LIFE');
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'LIFE', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('TERM LIFE','WHOLE LIFE','IUL','FINAL EXPENSE','UNIVERSAL LIFE');
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'HEALTH', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('MARKETPLACE','MEDICARE','MEDICARE ADVANTAGE','ACA','MEDIGAP','SUPPLEMENTAL');
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'HEALTH', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('MARKETPLACE','MEDICARE','MEDICARE ADVANTAGE','ACA','MEDIGAP','SUPPLEMENTAL');
