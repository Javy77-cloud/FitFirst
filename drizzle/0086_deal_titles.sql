-- sep7bh: retitle deals to First Last Lob (Home, Auto, Flood, …).
-- Additive only. Does not wipe or reseed the Zoho book. No db:seed.
-- Leaves coverage, stage, bind, and Ana unbound. Boot also backfills leftovers.
--> statement-breakpoint
UPDATE deals AS d
SET title = new_title.title
FROM (
  SELECT
    d2.id,
    trim(both ' ' FROM concat_ws(' ',
      NULLIF(trim(coalesce(c.first_name, l.first_name, '')), ''),
      NULLIF(trim(coalesce(c.last_name, l.last_name, a.name, '')), ''),
      CASE upper(d2.line_of_business)
        WHEN 'HO' THEN 'Home'
        WHEN 'AUTO' THEN 'Auto'
        WHEN 'FLOOD' THEN 'Flood'
        WHEN 'UMBRELLA' THEN 'Umbrella'
        WHEN 'GL' THEN 'GL'
        WHEN 'BOP' THEN 'BOP'
        WHEN 'LIFE' THEN 'Life'
        WHEN 'HEALTH' THEN 'Health'
        WHEN 'RV' THEN 'RV'
        WHEN 'WC' THEN 'Workers Comp'
        ELSE initcap(replace(lower(d2.line_of_business), '_', ' '))
      END
    )) AS title
  FROM deals d2
  LEFT JOIN contacts c ON c.id = d2.contact_id
  LEFT JOIN leads l ON l.id = d2.lead_id
  LEFT JOIN accounts a ON a.id = d2.account_id
) AS new_title
WHERE d.id = new_title.id
  AND new_title.title IS NOT NULL
  AND new_title.title <> ''
  AND new_title.title NOT IN ('Home', 'Auto', 'Flood', 'Umbrella', 'GL', 'BOP', 'Life', 'Health', 'RV', 'Workers Comp')
  AND new_title.title IS DISTINCT FROM d.title;
