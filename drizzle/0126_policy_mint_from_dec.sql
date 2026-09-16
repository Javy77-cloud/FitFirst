-- Dec-first policy mint: unpublished until Gemini confirm queue is done.
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "published_at" timestamptz;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "source_quote_id" uuid;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "source_document_id" uuid;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "source_product" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "mint_payload" jsonb;

-- Policy issued sits after Bound on shopping boards (chip-owned stages still apply).
INSERT INTO "pipeline_stages" ("id", "tenant_id", "pipeline_id", "name", "slug", "sort_order", "color", "seeded")
SELECT gen_random_uuid(), p."tenant_id", p."id", 'Policy issued', 'policy_issued', 5, 'emerald', true
FROM "pipelines" p
WHERE p."slug" IN ('p-c', 'health', 'life', 'flood')
  AND NOT EXISTS (
    SELECT 1 FROM "pipeline_stages" s
    WHERE s."pipeline_id" = p."id" AND s."slug" = 'policy_issued'
  );

UPDATE "pipeline_stages" AS s
SET "sort_order" = CASE s."slug"
  WHEN 'gather' THEN 0
  WHEN 'quotes' THEN 1
  WHEN 'review' THEN 2
  WHEN 'quote_sent' THEN 3
  WHEN 'bound' THEN 4
  WHEN 'policy_issued' THEN 5
  WHEN 'pending_inspection' THEN 6
  WHEN 'closed_won' THEN 7
  WHEN 'closed_lost' THEN 8
  ELSE s."sort_order"
END
WHERE s."pipeline_id" IN (
  SELECT "id" FROM "pipelines" WHERE "slug" IN ('p-c', 'health', 'life', 'flood')
);
