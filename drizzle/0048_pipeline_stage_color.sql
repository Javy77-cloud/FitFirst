ALTER TABLE "pipeline_stages" ADD COLUMN IF NOT EXISTS "color" text DEFAULT 'blue' NOT NULL;--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = CASE
  WHEN "slug" IN ('gather', 'shopping') THEN 'blue'
  WHEN "slug" IN ('quotes', 'quoting') THEN 'teal'
  WHEN "slug" IN ('review', 'comparing') THEN 'amber'
  WHEN "slug" IN ('quote_sent') THEN 'violet'
  WHEN "slug" IN ('closed_won', 'bound') THEN 'green'
  WHEN "slug" IN ('closed_lost', 'lost') THEN 'rose'
  WHEN "slug" IN ('archive') THEN 'slate'
  ELSE CASE MOD("sort_order", 6)
    WHEN 0 THEN 'blue'
    WHEN 1 THEN 'teal'
    WHEN 2 THEN 'amber'
    WHEN 3 THEN 'violet'
    WHEN 4 THEN 'green'
    ELSE 'rose'
  END
END
WHERE "color" IS NULL OR "color" = 'blue';
