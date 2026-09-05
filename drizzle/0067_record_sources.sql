ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "source" text;
--> statement-breakpoint
UPDATE "deals" AS d
SET "source" = l."source"
FROM "leads" AS l
WHERE d."lead_id" = l."id"
  AND d."source" IS NULL
  AND l."source" IS NOT NULL;
--> statement-breakpoint
UPDATE "contacts" AS c
SET "source" = d."source"
FROM "deals" AS d
WHERE d."contact_id" = c."id"
  AND c."source" IS NULL
  AND d."source" IS NOT NULL;
--> statement-breakpoint
UPDATE "contacts" AS c
SET "source" = l."source"
FROM "leads" AS l
WHERE l."email" IS NOT NULL
  AND c."email" IS NOT NULL
  AND lower(l."email") = lower(c."email")
  AND c."source" IS NULL
  AND l."source" IS NOT NULL;
