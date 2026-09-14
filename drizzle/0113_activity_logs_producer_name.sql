-- Stamp producer name on activity logs (policy Activity & Timeline).
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "producer_name" text;
--> statement-breakpoint
-- Backfill from policies.producer where policy_id is set.
UPDATE "activity_logs" AS al
SET "producer_name" = p."producer"
FROM "policies" AS p
WHERE al."policy_id" = p."id"
  AND al."producer_name" IS NULL
  AND p."producer" IS NOT NULL
  AND btrim(p."producer") <> '';
