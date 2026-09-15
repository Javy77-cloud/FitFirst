-- Bind-recheck disclosure persistence + line-tag backfill for multi-product deals.
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "bind_recheck_acked_at" timestamptz;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "bind_recheck_ack_fingerprint" text;

-- Prefer the attempt-log LOB when shop_line is missing or the default home stamp is wrong.
UPDATE "quotes" AS q
SET "shop_line" = CASE upper(coalesce(l."line_of_business", ''))
  WHEN 'AUTO' THEN 'auto'
  WHEN 'FLOOD' THEN 'flood'
  WHEN 'HO' THEN 'home'
  WHEN 'RV' THEN 'rec_rv'
  WHEN 'UMBRELLA' THEN 'umbrella'
  WHEN 'LIFE' THEN 'life'
  WHEN 'HEALTH' THEN 'health'
  WHEN 'GL' THEN 'general_liability'
  WHEN 'WC' THEN 'workers_comp'
  WHEN 'BOP' THEN 'bop'
  ELSE q."shop_line"
END
FROM "quote_attempt_logs" AS l
WHERE q."quote_attempt_log_id" = l."id"
  AND (
    q."shop_line" IS NULL
    OR q."shop_line" = ''
    OR (
      q."shop_line" = 'home'
      AND upper(coalesce(l."line_of_business", '')) IN (
        'AUTO', 'FLOOD', 'RV', 'UMBRELLA', 'LIFE', 'HEALTH', 'GL', 'WC', 'BOP'
      )
    )
  );

-- Notes-based tag when still blank (or home-stamped against a clear Auto / Flood note).
UPDATE "quotes"
SET "shop_line" = 'flood'
WHERE (coalesce("shop_line", '') = '' OR "shop_line" = 'home')
  AND coalesce("notes", '') ~* '\y(flood|nfip)\y';

UPDATE "quotes"
SET "shop_line" = 'auto'
WHERE (coalesce("shop_line", '') = '' OR "shop_line" = 'home')
  AND coalesce("notes", '') ~* '\y(auto|vin|personal auto|\ypa\y|motorcycle|form\s+pa)\y'
  AND coalesce("notes", '') !~* '\y(flood|nfip)\y';

UPDATE "quotes"
SET "shop_line" = 'home'
WHERE (coalesce("shop_line", '') = '')
  AND coalesce("notes", '') ~* '\y(ho[34658]|homeowners|dp[13]|dwelling|mho|mdp)\y';
