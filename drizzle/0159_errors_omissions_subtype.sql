-- NOT APPLIED. Lookup rows only. Do not run until reviewed.
-- Errors & Omissions (short label E&O) on the GL line:
--   global_lists.policy_sub_type label "Errors & Omissions"
--   agency_lobs product_id "eo" (deal product picker reads this table;
--   ensureDefaultAgencyLobs does not backfill an existing tenant)
-- Idempotent. The desk seeder ensureDefaultGlobalLists also inserts the
-- subtype slug when policy lists load. This file is intentionally unapplied.
INSERT INTO "global_lists" (
  "tenant_id",
  "list_key",
  "family",
  "parent_slug",
  "slug",
  "label",
  "sort_order",
  "color",
  "active"
)
SELECT
  '11111111-1111-4111-8111-111111111111',
  'policy_sub_type',
  'P&C',
  NULL,
  'errors-and-omissions',
  'Errors & Omissions',
  COALESCE(
    (
      SELECT MAX("sort_order") + 1
      FROM "global_lists"
      WHERE "tenant_id" = '11111111-1111-4111-8111-111111111111'
        AND "list_key" = 'policy_sub_type'
    ),
    0
  ),
  NULL,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM "global_lists"
  WHERE "tenant_id" = '11111111-1111-4111-8111-111111111111'
    AND "list_key" = 'policy_sub_type'
    AND "slug" = 'errors-and-omissions'
);
--> statement-breakpoint
INSERT INTO "agency_lobs" (
  "tenant_id",
  "product_id",
  "label",
  "lob_code",
  "family",
  "sheet_product",
  "quoting_form",
  "active",
  "built_in",
  "sort_order"
)
SELECT
  '11111111-1111-4111-8111-111111111111',
  'eo',
  'E&O',
  'GL',
  'commercial',
  'eo',
  'Errors & Omissions',
  true,
  true,
  COALESCE(
    (
      SELECT MAX("sort_order") + 1
      FROM "agency_lobs"
      WHERE "tenant_id" = '11111111-1111-4111-8111-111111111111'
    ),
    0
  )
WHERE NOT EXISTS (
  SELECT 1
  FROM "agency_lobs"
  WHERE "tenant_id" = '11111111-1111-4111-8111-111111111111'
    AND "product_id" = 'eo'
);
