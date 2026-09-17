-- Named Life reps from Carrier Rep Contact List (browser extract 2026-09-17)
-- plus Americo build-chart seed pointer. Fill marketing_contact_* where empty.
-- Never overwrite a filled main / agent phone. Does not rewrite 0128-0130 or HO.
-- Maps American Amicable→AMAM, American General→Corebridge, Fidelity & Guaranty→F&G.
-- Captain applies this file on Neon after merge.
--> statement-breakpoint
UPDATE carriers
SET
  marketing_contact_name = coalesce(nullif(marketing_contact_name, ''), 'Pete Mejia'),
  marketing_contact_email = coalesce(nullif(marketing_contact_email, ''), 'Pmejia@aatx.com'),
  marketing_contact_phone = coalesce(nullif(marketing_contact_phone, ''), '254-297-2777 x3416'),
  updated_at = now()
WHERE lower(trim(name)) IN (
  'american amicable',
  'amam',
  'am-am',
  'american memorial',
  'american-amicable',
  'occidental life',
  'occidental'
)
   OR lower(trim(name)) LIKE 'american amicable/%'
   OR lower(trim(name)) LIKE 'american amicable %';
--> statement-breakpoint
UPDATE carriers
SET
  marketing_contact_name = coalesce(nullif(marketing_contact_name, ''), 'Andrew Kostus'),
  marketing_contact_email = coalesce(nullif(marketing_contact_email, ''), 'andrew.kostus@americo.com'),
  marketing_contact_phone = coalesce(nullif(marketing_contact_phone, ''), '816-512-2889'),
  carrier_info = CASE
    WHEN coalesce(carrier_info, '') ILIKE '%Americo height/weight%' THEN carrier_info
    WHEN coalesce(carrier_info, '') = '' THEN
      'Americo build chart sample: data/appetite/fitfirst-life-build.csv (4''8"-5''2"). Other heights Unknown.'
    ELSE carrier_info || E'\nAmerico build chart sample: data/appetite/fitfirst-life-build.csv (4''8"-5''2"). Other heights Unknown.'
  END,
  updated_at = now()
WHERE lower(trim(name)) IN ('americo', 'americo financial life', 'americo life')
   OR lower(trim(name)) LIKE 'americo %';
--> statement-breakpoint
UPDATE carriers
SET
  marketing_contact_name = coalesce(nullif(marketing_contact_name, ''), 'Trevor Keeble (GIWL)'),
  marketing_contact_email = coalesce(nullif(marketing_contact_email, ''), 'Trevor.keeble@corebridgefinancial.com'),
  marketing_contact_phone = coalesce(nullif(marketing_contact_phone, ''), '615-785-3828'),
  updated_at = now()
WHERE lower(trim(name)) IN (
  'corebridge',
  'corebridge financial',
  'aig life',
  'american general',
  'american general (aig)'
)
   OR lower(trim(name)) LIKE 'american general %'
   OR lower(trim(name)) LIKE 'corebridge %';
--> statement-breakpoint
UPDATE carriers
SET
  marketing_contact_name = coalesce(nullif(marketing_contact_name, ''), 'Kelly Steinmetz'),
  marketing_contact_email = coalesce(nullif(marketing_contact_email, ''), 'KSteinmetz@foresters.com'),
  marketing_contact_phone = coalesce(nullif(marketing_contact_phone, ''), '800-461-8431 x5935'),
  updated_at = now()
WHERE lower(trim(name)) IN ('foresters', 'foresters financial', 'the independent order of foresters')
   OR lower(trim(name)) LIKE 'foresters %';
-- F&G / Fidelity & Guaranty: contact-list row was blank. Keep existing main phones.
--> statement-breakpoint
DO $$
DECLARE
  rec record;
  tenant uuid;
  existing_id uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      (
        'American Equity',
        ARRAY['american equity', 'american-equity', 'american equity investment'],
        'Tom Kostek',
        'tkostek@american-equity.com',
        '888-221-1234 x1894',
        'Carrier Rep Contact List (2026-09-17). Not a MATRIX product column.'
      ),
      (
        'Assurity',
        ARRAY['assurity', 'assurity life'],
        'Jamie Johnson',
        'jjohnson@assurity.com',
        '402-437-4526',
        'Carrier Rep Contact List (2026-09-17). Not a MATRIX product column.'
      ),
      (
        'Athene',
        ARRAY['athene', 'athene annuity'],
        'Heather Fitzpatrick',
        'hfitzpatrick@athene.com',
        '888-266-8489 x18677',
        'Carrier Rep Contact List (2026-09-17). Not a MATRIX product column.'
      ),
      (
        'Columbus Life',
        ARRAY['columbus life', 'columbus life insurance'],
        'Ward Carson',
        'ward.carson@columbuslife.com',
        '864-993-6117',
        'Carrier Rep Contact List (2026-09-17). Not a MATRIX product column.'
      )
    ) AS t(name, aliases, marketing_name, marketing_email, marketing_phone, note)
  LOOP
    FOR tenant IN
      SELECT DISTINCT c.tenant_id FROM carriers c
    LOOP
      SELECT c.id INTO existing_id
      FROM carriers c
      WHERE c.tenant_id = tenant
        AND (
          lower(trim(c.name)) = lower(rec.name)
          OR lower(trim(c.name)) = ANY (rec.aliases)
        )
      ORDER BY
        CASE WHEN lower(trim(c.name)) = lower(rec.name) THEN 0 ELSE 1 END,
        c.created_at
      LIMIT 1;

      IF existing_id IS NULL THEN
        INSERT INTO carriers (
          id, tenant_id, name, written_lines, portal_status,
          marketing_contact_name, marketing_contact_email, marketing_contact_phone,
          carrier_info, fixture_tag, active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          tenant,
          rec.name,
          '["LIFE"]'::jsonb,
          'open',
          rec.marketing_name,
          rec.marketing_email,
          rec.marketing_phone,
          rec.note,
          'life-rep-contacts-2026-09',
          true,
          now(),
          now()
        );
      ELSE
        UPDATE carriers
        SET
          written_lines = CASE
            WHEN written_lines @> '["LIFE"]'::jsonb THEN written_lines
            ELSE coalesce(written_lines, '[]'::jsonb) || '["LIFE"]'::jsonb
          END,
          marketing_contact_name = coalesce(nullif(marketing_contact_name, ''), rec.marketing_name),
          marketing_contact_email = coalesce(nullif(marketing_contact_email, ''), rec.marketing_email),
          marketing_contact_phone = coalesce(nullif(marketing_contact_phone, ''), rec.marketing_phone),
          carrier_info = CASE
            WHEN coalesce(carrier_info, '') = '' THEN rec.note
            WHEN carrier_info ILIKE '%Carrier Rep Contact List%' THEN carrier_info
            ELSE carrier_info || E'\n' || rec.note
          END,
          updated_at = now()
        WHERE id = existing_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;
