-- Overlay Javy live-sheet phones / portals (Carrier Rep Contact List + MATRIX Phone row, 2026-09-17).
-- Update-in-place only. Never overwrite a filled field with blank. Full MATRIX when spreadsheet provided.
--> statement-breakpoint
UPDATE carriers
SET
  phone = coalesce(nullif(phone, ''), '800-775-7896'),
  agent_phone = coalesce(nullif(agent_phone, ''), '800-775-7896'),
  updated_at = now()
WHERE lower(trim(name)) IN ('mutual of omaha', 'moo', 'united of omaha')
  AND (coalesce(phone, '') IN ('', '800-693-6083') OR coalesce(agent_phone, '') IN ('', '800-693-6083'));
--> statement-breakpoint
UPDATE carriers
SET
  phone = coalesce(nullif(phone, ''), '833-520-2131'),
  agent_phone = coalesce(nullif(agent_phone, ''), '833-520-2131'),
  updated_at = now()
WHERE lower(trim(name)) IN ('banner life', 'banner', 'lga', 'legal & general america')
  AND (coalesce(phone, '') IN ('', '800-839-5960') OR coalesce(agent_phone, '') IN ('', '800-839-5960'));
--> statement-breakpoint
UPDATE carriers
SET
  phone = coalesce(nullif(phone, ''), '800-770-4561'),
  agent_phone = coalesce(nullif(agent_phone, ''), '800-770-4561'),
  updated_at = now()
WHERE lower(trim(name)) IN ('royal neighbors', 'royal neighbors of america')
  AND (coalesce(phone, '') IN ('', '800-627-4762') OR coalesce(agent_phone, '') IN ('', '800-627-4762'));
--> statement-breakpoint
UPDATE carriers
SET
  phone = coalesce(nullif(phone, ''), '877-454-4768'),
  agent_phone = coalesce(nullif(agent_phone, ''), '877-454-4768'),
  updated_at = now()
WHERE lower(trim(name)) LIKE 'transamerica%'
  AND (coalesce(phone, '') IN ('', '877-234-4848') OR coalesce(agent_phone, '') IN ('', '877-234-4848'));
--> statement-breakpoint
UPDATE carriers
SET
  phone = coalesce(nullif(phone, ''), '877-399-7747'),
  agent_phone = coalesce(nullif(agent_phone, ''), '877-399-7747'),
  updated_at = now()
WHERE lower(trim(name)) IN ('corebridge', 'corebridge financial', 'aig life')
  AND (coalesce(phone, '') IN ('', '800-280-2011') OR coalesce(agent_phone, '') IN ('', '800-280-2011'));
