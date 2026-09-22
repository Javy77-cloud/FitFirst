-- American Modern. Idempotent: reuse an existing American Modern row; never insert a duplicate name.
-- Desk line is HO so MHO / DP1 / DP3 shop as home. mobile_allowed stays true.
-- No portal username or password. Collector vehicles stay in notes (no specialty-auto desk line).
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  seeded_id uuid := '33333333-3333-4333-8333-333333333344';
  existing_id uuid;
  note text := $am$American Modern. Manufactured and mobile homes are the founding line (HO-7 style, FitFirst form MHO, all 50 states, no age cap). Also writes seasonal and vacation homes, vacant property, rental and landlord dwellings (desk forms DP1 and DP3), and non-standard site-built homes (older / hard-to-place primary). Other personal lines, notes only: collector and classic cars; motorcycles, ATVs, UTVs, snowmobiles, and golf carts; boats, yachts, and personal watercraft; pet insurance; farm and ranch in nine states (state list not on this sheet). Does not write standard personal auto, standard HO-3 homeowners, or life. Web https://www.americanmodern.com. No UW mins sheet yet.$am$;
  info text := $info$American Modern. Desk forms MHO, DP1, and DP3. Manufactured and mobile homes in all 50 states, no age cap. Seasonal and vacation homes, vacant property, rental and landlord dwellings, and non-standard site-built homes. Collector and classic cars, motorcycles and off-road vehicles, boats and personal watercraft, pet insurance, and farm and ranch in nine states. Does not write standard personal auto, standard HO-3 homeowners, or life. https://www.americanmodern.com. No UW mins sheet yet.$info$;
  dont_write text := $dw$Does not write standard personal auto, standard HO-3 homeowners, or life.$dw$;
  territory text := $terr$Manufactured and mobile: all 50 states, no age cap. Farm and ranch: nine states (list not on this sheet).$terr$;
  qrg_rows jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;

  qrg_rows := jsonb_build_array(
    jsonb_build_object(
      'id', 'american-modern-mho-2026-09',
      'dateRequested', '2026-09-22',
      'lob', 'MHO',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', '',
      'acceptDecline', 'accept',
      'notes', 'American Modern manufactured and mobile homes (FitFirst form MHO). All 50 states, no age cap. No UW mins sheet yet.'
    ),
    jsonb_build_object(
      'id', 'american-modern-dp1-2026-09',
      'dateRequested', '2026-09-22',
      'lob', 'DP1',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', '',
      'acceptDecline', 'accept',
      'notes', 'American Modern DP1 dwelling. Seasonal, vacant, and rental risks. No UW mins sheet yet.'
    ),
    jsonb_build_object(
      'id', 'american-modern-dp3-2026-09',
      'dateRequested', '2026-09-22',
      'lob', 'DP3',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', '',
      'acceptDecline', 'accept',
      'notes', 'American Modern DP3 landlord / dwelling. No UW mins sheet yet.'
    )
  );

  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seeded_id
      OR lower(c.name) LIKE '%american modern%'
    )
  ORDER BY
    CASE
      WHEN lower(c.name) LIKE '%american modern%' THEN 0
      ELSE 1
    END,
    c.created_at
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, website,
      carrier_info, territory, appetite_notes, dont_write_notes, appetite_rows,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seeded_id,
      tenant,
      'American Modern',
      '["HO"]'::jsonb,
      'open',
      'https://www.americanmodern.com',
      info,
      territory,
      note,
      dont_write,
      qrg_rows,
      'american-modern-2026-09',
      true,
      now(),
      now()
    );
    existing_id := seeded_id;
  ELSE
    UPDATE carriers
    SET
      name = CASE
        WHEN lower(trim(name)) IN (
          'american modern',
          'american modern insurance',
          'american modern insurance group',
          'american modern insurance company'
        ) THEN 'American Modern'
        ELSE name
      END,
      written_lines = (
        SELECT coalesce(jsonb_agg(DISTINCT value), '[]'::jsonb)
        FROM jsonb_array_elements_text(
          coalesce(written_lines, '[]'::jsonb) || '["HO"]'::jsonb
        ) AS t(value)
      ),
      portal_status = 'open',
      website = 'https://www.americanmodern.com',
      carrier_info = info,
      territory = territory,
      appetite_notes = note,
      dont_write_notes = dont_write,
      appetite_rows = (
        SELECT coalesce(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
        FROM (
          SELECT elem, ord
          FROM jsonb_array_elements(coalesce(appetite_rows, '[]'::jsonb))
            WITH ORDINALITY AS t(elem, ord)
          WHERE elem->>'id' IS DISTINCT FROM 'american-modern-mho-2026-09'
            AND elem->>'id' IS DISTINCT FROM 'american-modern-dp1-2026-09'
            AND elem->>'id' IS DISTINCT FROM 'american-modern-dp3-2026-09'
        ) kept
      ) || qrg_rows,
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM appetite_rules
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO'
  ) THEN
    UPDATE appetite_rules
    SET
      notes = note,
      mobile_allowed = true,
      min_cov_a = NULL,
      max_cov_a = NULL,
      min_year_built = NULL,
      max_roof_age = NULL,
      min_miles_to_coast = NULL,
      max_miles_to_coast = NULL,
      allowed_roof_coverings = NULL,
      updated_at = now()
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO';
  ELSE
    INSERT INTO appetite_rules (
      tenant_id, carrier_id, line_of_business, coastal_allowed,
      mobile_allowed, requires_opening_protection, require_replacement_cost,
      notes, created_at, updated_at
    ) VALUES (
      tenant, existing_id, 'HO', true, true, false, false, note, now(), now()
    );
  END IF;
END $$;
