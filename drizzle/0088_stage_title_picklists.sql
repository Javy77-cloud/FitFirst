-- sep7bq: First Last / Lob titles + starter field picklists.
-- Additive only. Does not wipe or reseed the Zoho book.
-- Leaves coverage, stage, bind, and Ana unbound. Boot also backfills leftovers.
--> statement-breakpoint
UPDATE deals AS d
SET title = new_title.title
FROM (
  SELECT
    d2.id,
    trim(both ' ' FROM concat_ws(' / ',
      COALESCE(
        NULLIF(trim(concat_ws(' ',
          NULLIF(trim(coalesce(c.first_name, l.first_name, '')), ''),
          NULLIF(trim(coalesce(c.last_name, l.last_name, '')), '')
        )), ''),
        NULLIF(trim(coalesce(a.name, '')), '')
      ),
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
--> statement-breakpoint
INSERT INTO desk_field_picklists (tenant_id, name, options)
SELECT t.id, 'US states', '[
  "AL — Alabama","AK — Alaska","AZ — Arizona","AR — Arkansas","CA — California","CO — Colorado",
  "CT — Connecticut","DE — Delaware","DC — District of Columbia","FL — Florida","GA — Georgia",
  "HI — Hawaii","ID — Idaho","IL — Illinois","IN — Indiana","IA — Iowa","KS — Kansas","KY — Kentucky",
  "LA — Louisiana","ME — Maine","MD — Maryland","MA — Massachusetts","MI — Michigan","MN — Minnesota",
  "MS — Mississippi","MO — Missouri","MT — Montana","NE — Nebraska","NV — Nevada","NH — New Hampshire",
  "NJ — New Jersey","NM — New Mexico","NY — New York","NC — North Carolina","ND — North Dakota",
  "OH — Ohio","OK — Oklahoma","OR — Oregon","PA — Pennsylvania","RI — Rhode Island","SC — South Carolina",
  "SD — South Dakota","TN — Tennessee","TX — Texas","UT — Utah","VT — Vermont","VA — Virginia",
  "WA — Washington","WV — West Virginia","WI — Wisconsin","WY — Wyoming"
]'::jsonb
FROM tenants t
WHERE t.id = '11111111-1111-4111-8111-111111111111'
  AND NOT EXISTS (
    SELECT 1 FROM desk_field_picklists p
    WHERE p.tenant_id = t.id AND lower(p.name) = 'us states'
  );
--> statement-breakpoint
INSERT INTO desk_field_picklists (tenant_id, name, options)
SELECT t.id, 'Lines of business', '[
  "Home","Auto","Flood","Umbrella","GL","BOP","Life","Health","RV","Workers Comp",
  "Homeowners","Renters","Landlord","Motorcycle","Workers'' Comp","Commercial Auto"
]'::jsonb
FROM tenants t
WHERE t.id = '11111111-1111-4111-8111-111111111111'
  AND NOT EXISTS (
    SELECT 1 FROM desk_field_picklists p
    WHERE p.tenant_id = t.id AND lower(p.name) = 'lines of business'
  );
--> statement-breakpoint
INSERT INTO desk_field_picklists (tenant_id, name, options)
SELECT t.id, 'Common carriers', '[
  "American Integrity","Allstate","Benchmark","Citizens","Farmers","Florida Peninsula","Geico",
  "GeoVera","Hadron","Hartford","Heritage","Kin","Liberty Mutual","Nationwide","Progressive","QBE",
  "SageSure","Security First","Slide","State Farm","Tailrow","Tower Hill","Travelers","TypTap",
  "Universal","USAA","VAVE","VYRD"
]'::jsonb
FROM tenants t
WHERE t.id = '11111111-1111-4111-8111-111111111111'
  AND NOT EXISTS (
    SELECT 1 FROM desk_field_picklists p
    WHERE p.tenant_id = t.id AND lower(p.name) = 'common carriers'
  );
