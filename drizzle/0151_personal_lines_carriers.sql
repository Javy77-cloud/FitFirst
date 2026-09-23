-- Personal-lines carriers from Javy notes 2026-09-22.
-- Match existing by name needles; insert only when missing.
-- American Modern is enrich-only — never insert a duplicate.
-- Portal quoting out of scope. UW→RP densify PARKED.
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  existing_id uuid;
  v_written jsonb;
  v_tags jsonb;
  v_rows jsonb;
  v_note text;
  v_info text;
  v_dont text;
  v_terr text;
  cname text;
  seed_id uuid;
  enrich_only boolean;
  needles text[];
  excludes text[];
  add_lines text[];
  add_tags text[];
  v_appetite jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;
  -- State Farm
  seed_id := '33333333-3333-4333-8333-333333333345';
  enrich_only := false;
  cname := $n$State Farm$n$;
  v_note := $note$State Farm. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: preferred risks, good credit, newer roofs/HVAC. Dislikes: older roofs, prior claims, high-value coastal. Auto, HO-3, umbrella, RV, boat, motorcycle, manufactured home (limited). Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$State Farm. Auto, HO-3, umbrella, RV, boat, motorcycle, manufactured home (limited). Likes preferred risks, good credit, newer roofs/HVAC. Dislikes older roofs, prior claims, high-value coastal.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states$terr$;
  needles := ARRAY['state farm']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'RV', 'BOAT']::text[];
  add_tags := ARRAY['personal-lines', 'preferred', 'national']::text[];
  v_appetite := '[{"id":"pl-state-farm-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"State Farm. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: preferred risks, good credit, newer roofs/HVAC. Dislikes: older roofs, prior claims, high-value coastal. Auto, HO-3, umbrella, RV, boat, motorcycle, manufactured home (limited). Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-state-farm-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"State Farm. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: preferred risks, good credit, newer roofs/HVAC. Dislikes: older roofs, prior claims, high-value coastal. Auto, HO-3, umbrella, RV, boat, motorcycle, manufactured home (limited). Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-state-farm-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"State Farm. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: preferred risks, good credit, newer roofs/HVAC. Dislikes: older roofs, prior claims, high-value coastal. Auto, HO-3, umbrella, RV, boat, motorcycle, manufactured home (limited). Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Progressive
  seed_id := '1d29f707-67e5-4e64-8528-2a0f58ad92a4';
  enrich_only := false;
  cname := $n$Progressive$n$;
  v_note := $note$Progressive. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: non-standard auto. Dislikes: very old homes, high-value coastal without mitigation. Auto, home (via partners), RV, boat, motorcycle, umbrella. Auto-first — not a property leader; no new DP-3. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Progressive. Auto, home (via partners), RV, boat, motorcycle, umbrella. Auto-first — not a property leader; no new DP-3. Likes non-standard auto. Dislikes very old homes, high-value coastal without mitigation.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states$terr$;
  needles := ARRAY['progressive']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'RV', 'BOAT']::text[];
  add_tags := ARRAY['personal-lines', 'nonstandard-auto', 'national']::text[];
  v_appetite := '[{"id":"pl-progressive-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Progressive. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: non-standard auto. Dislikes: very old homes, high-value coastal without mitigation. Auto, home (via partners), RV, boat, motorcycle, umbrella. Auto-first — not a property leader; no new DP-3. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-progressive-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Progressive. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: non-standard auto. Dislikes: very old homes, high-value coastal without mitigation. Auto, home (via partners), RV, boat, motorcycle, umbrella. Auto-first — not a property leader; no new DP-3. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-progressive-rv-2026-09","dateRequested":"2026-09-22","lob":"RV","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Progressive. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: non-standard auto. Dislikes: very old homes, high-value coastal without mitigation. Auto, home (via partners), RV, boat, motorcycle, umbrella. Auto-first — not a property leader; no new DP-3. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-progressive-boat-2026-09","dateRequested":"2026-09-22","lob":"BOAT","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Progressive. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: non-standard auto. Dislikes: very old homes, high-value coastal without mitigation. Auto, home (via partners), RV, boat, motorcycle, umbrella. Auto-first — not a property leader; no new DP-3. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Geico
  seed_id := 'eaf069fd-d37e-41ed-8965-3d4ddc61ddf0';
  enrich_only := false;
  cname := $n$Geico$n$;
  v_note := $note$Geico. All 50 states. Writes: AUTO, HO, RV, BOAT. Likes: clean records. Dislikes: older homes, high-value coastal. Berkshire Hathaway / GEICO. Auto, home, RV, boat, motorcycle. Quietly routes MH customers to Foremost. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Geico. Berkshire Hathaway / GEICO. Auto, home, RV, boat, motorcycle. Quietly routes MH customers to Foremost. Likes clean records. Dislikes older homes, high-value coastal.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states$terr$;
  needles := ARRAY['geico']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'RV', 'BOAT']::text[];
  add_tags := ARRAY['personal-lines', 'national', 'berkshire-hathaway']::text[];
  v_appetite := '[{"id":"pl-geico-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Geico. All 50 states. Writes: AUTO, HO, RV, BOAT. Likes: clean records. Dislikes: older homes, high-value coastal. Berkshire Hathaway / GEICO. Auto, home, RV, boat, motorcycle. Quietly routes MH customers to Foremost. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Allstate
  seed_id := '4848e59a-0a78-4d69-8364-cb1c8a3ef037';
  enrich_only := false;
  cname := $n$Allstate$n$;
  v_note := $note$Allstate. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs, prior water claims. Auto, home, umbrella, RV, boat. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Allstate. Auto, home, umbrella, RV, boat. Likes bundling. Dislikes older roofs, prior water claims.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states$terr$;
  needles := ARRAY['allstate']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'RV', 'BOAT']::text[];
  add_tags := ARRAY['personal-lines', 'national', 'bundle']::text[];
  v_appetite := '[{"id":"pl-allstate-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Allstate. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs, prior water claims. Auto, home, umbrella, RV, boat. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-allstate-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Allstate. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs, prior water claims. Auto, home, umbrella, RV, boat. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-allstate-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Allstate. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs, prior water claims. Auto, home, umbrella, RV, boat. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- USAA
  seed_id := '33333333-3333-4333-8333-333333333346';
  enrich_only := false;
  cname := $n$USAA$n$;
  v_note := $note$USAA. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: preferred military. Dislikes: older homes. Military membership only — not an open market. Auto, home, umbrella, RV, boat. Quietly routes MH to Foremost. Don't write / limits: Non-military / ineligible members. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$USAA. Military membership only — not an open market. Auto, home, umbrella, RV, boat. Quietly routes MH to Foremost. Likes preferred military. Dislikes older homes.$info$;
  v_dont := $dw$Non-military / ineligible members$dw$;
  v_terr := $terr$All 50 states — military only$terr$;
  needles := ARRAY['usaa']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'RV', 'BOAT']::text[];
  add_tags := ARRAY['personal-lines', 'military-only', 'national']::text[];
  v_appetite := '[{"id":"pl-usaa-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"USAA. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: preferred military. Dislikes: older homes. Military membership only — not an open market. Auto, home, umbrella, RV, boat. Quietly routes MH to Foremost. Don''t write / limits: Non-military / ineligible members. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-usaa-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"USAA. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: preferred military. Dislikes: older homes. Military membership only — not an open market. Auto, home, umbrella, RV, boat. Quietly routes MH to Foremost. Don''t write / limits: Non-military / ineligible members. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-usaa-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"USAA. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: preferred military. Dislikes: older homes. Military membership only — not an open market. Auto, home, umbrella, RV, boat. Quietly routes MH to Foremost. Don''t write / limits: Non-military / ineligible members. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Liberty Mutual
  seed_id := '3b11b057-541b-4112-8361-44c175539d3c';
  enrich_only := false;
  cname := $n$Liberty Mutual$n$;
  v_note := $note$Liberty Mutual. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, RV, boat, motorcycle. Distinct from Safeco. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Liberty Mutual. Auto, home, umbrella, RV, boat, motorcycle. Distinct from Safeco. Likes bundling. Dislikes older roofs, high-value coastal.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states$terr$;
  needles := ARRAY['liberty mutual']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'RV', 'BOAT']::text[];
  add_tags := ARRAY['personal-lines', 'national', 'bundle']::text[];
  v_appetite := '[{"id":"pl-liberty-mutual-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Liberty Mutual. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, RV, boat, motorcycle. Distinct from Safeco. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-liberty-mutual-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Liberty Mutual. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, RV, boat, motorcycle. Distinct from Safeco. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-liberty-mutual-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Liberty Mutual. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, RV, boat, motorcycle. Distinct from Safeco. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Travelers
  seed_id := 'bbb8f6b3-a170-4841-8be2-656c5e89575a';
  enrich_only := false;
  cname := $n$Travelers$n$;
  v_note := $note$Travelers. All 50 states. Writes: AUTO, HO, UMBRELLA, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Travelers. Auto, home, umbrella, commercial. Likes standard homes. Dislikes older roofs, high-value coastal.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states$terr$;
  needles := ARRAY['travelers']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'COMMERCIAL']::text[];
  add_tags := ARRAY['personal-lines', 'national', 'commercial']::text[];
  v_appetite := '[{"id":"pl-travelers-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Travelers. All 50 states. Writes: AUTO, HO, UMBRELLA, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-travelers-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Travelers. All 50 states. Writes: AUTO, HO, UMBRELLA, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-travelers-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Travelers. All 50 states. Writes: AUTO, HO, UMBRELLA, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-travelers-bop-2026-09","dateRequested":"2026-09-22","lob":"BOP","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Travelers. All 50 states. Writes: AUTO, HO, UMBRELLA, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Farmers
  seed_id := '33333333-3333-4333-8333-333333333347';
  enrich_only := false;
  cname := $n$Farmers$n$;
  v_note := $note$Farmers. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: older/hard-to-place homes. Dislikes: very high-value coastal without mitigation. Farmers / Foremost family. Auto, home, manufactured home, RV, boat, motorcycle, vacant, seasonal. Shop Foremost for MH/vacant first. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Farmers. Farmers / Foremost family. Auto, home, manufactured home, RV, boat, motorcycle, vacant, seasonal. Shop Foremost for MH/vacant first. Likes older/hard-to-place homes. Dislikes very high-value coastal without mitigation.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states (confirm appointment)$terr$;
  needles := ARRAY['farmers']::text[];
  excludes := ARRAY['farm bureau', 'southern farm']::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'RV', 'BOAT']::text[];
  add_tags := ARRAY['personal-lines', 'national', 'hard-to-place']::text[];
  v_appetite := '[{"id":"pl-farmers-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Farmers. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: older/hard-to-place homes. Dislikes: very high-value coastal without mitigation. Farmers / Foremost family. Auto, home, manufactured home, RV, boat, motorcycle, vacant, seasonal. Shop Foremost for MH/vacant first. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-farmers-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Farmers. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: older/hard-to-place homes. Dislikes: very high-value coastal without mitigation. Farmers / Foremost family. Auto, home, manufactured home, RV, boat, motorcycle, vacant, seasonal. Shop Foremost for MH/vacant first. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-farmers-mho-2026-09","dateRequested":"2026-09-22","lob":"MHO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Farmers. All 50 states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: older/hard-to-place homes. Dislikes: very high-value coastal without mitigation. Farmers / Foremost family. Auto, home, manufactured home, RV, boat, motorcycle, vacant, seasonal. Shop Foremost for MH/vacant first. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Foremost
  seed_id := 'e5b1223c-52cd-4c47-83cd-5f2c3045bc26';
  enrich_only := false;
  cname := $n$Foremost$n$;
  v_note := $note$Foremost. All 50 states. Writes: HO, AUTO, RV. Likes: homes any age/model/make/value (rare); seniors 50+, newer homes, approved parks, bundling. Dislikes: standard preferred HO when a specialty market is not needed. Default first call for manufactured / mobile. GEICO/USAA quietly route MH here. FL MHO appetite: any age/model/make/value. Discounts: seniors 50+, newer homes, approved parks, bundling. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Foremost. Default first call for manufactured / mobile. GEICO/USAA quietly route MH here. FL MHO appetite: any age/model/make/value. Discounts: seniors 50+, newer homes, approved parks, bundling. Likes homes any age/model/make/value (rare); seniors 50+, newer homes, approved parks, bundling. Dislikes standard preferred HO when a specialty market is not needed.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states$terr$;
  needles := ARRAY['foremost']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO', 'AUTO', 'RV']::text[];
  add_tags := ARRAY['personal-lines', 'specialty', 'manufactured', 'mho-default']::text[];
  v_appetite := '[{"id":"pl-foremost-mho-2026-09","dateRequested":"2026-09-22","lob":"MHO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Foremost. All 50 states. Writes: HO, AUTO, RV. Likes: homes any age/model/make/value (rare); seniors 50+, newer homes, approved parks, bundling. Dislikes: standard preferred HO when a specialty market is not needed. Default first call for manufactured / mobile. GEICO/USAA quietly route MH here. FL MHO appetite: any age/model/make/value. Discounts: seniors 50+, newer homes, approved parks, bundling. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-foremost-dp1-2026-09","dateRequested":"2026-09-22","lob":"DP1","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Foremost. All 50 states. Writes: HO, AUTO, RV. Likes: homes any age/model/make/value (rare); seniors 50+, newer homes, approved parks, bundling. Dislikes: standard preferred HO when a specialty market is not needed. Default first call for manufactured / mobile. GEICO/USAA quietly route MH here. FL MHO appetite: any age/model/make/value. Discounts: seniors 50+, newer homes, approved parks, bundling. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-foremost-dp3-2026-09","dateRequested":"2026-09-22","lob":"DP3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Foremost. All 50 states. Writes: HO, AUTO, RV. Likes: homes any age/model/make/value (rare); seniors 50+, newer homes, approved parks, bundling. Dislikes: standard preferred HO when a specialty market is not needed. Default first call for manufactured / mobile. GEICO/USAA quietly route MH here. FL MHO appetite: any age/model/make/value. Discounts: seniors 50+, newer homes, approved parks, bundling. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-foremost-vacant-2026-09","dateRequested":"2026-09-22","lob":"VACANT","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Foremost. All 50 states. Writes: HO, AUTO, RV. Likes: homes any age/model/make/value (rare); seniors 50+, newer homes, approved parks, bundling. Dislikes: standard preferred HO when a specialty market is not needed. Default first call for manufactured / mobile. GEICO/USAA quietly route MH here. FL MHO appetite: any age/model/make/value. Discounts: seniors 50+, newer homes, approved parks, bundling. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- American Modern
  seed_id := '33333333-3333-4333-8333-333333333344';
  enrich_only := true;
  cname := $n$American Modern$n$;
  v_note := $note$American Modern. All 50 states. Writes: HO. Likes: older homes in fair condition; manufactured/mobile. Dislikes: very high-value coastal. Already on desk — enrich only, never duplicate. MHO / DP1 / DP3. Collector cars, powersports, boats, pet, farm/ranch (nine states). Does not write standard personal auto, standard HO-3, or life. Don't write / limits: Standard personal auto, standard HO-3 homeowners, life. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$American Modern. Already on desk — enrich only, never duplicate. MHO / DP1 / DP3. Collector cars, powersports, boats, pet, farm/ranch (nine states). Does not write standard personal auto, standard HO-3, or life. Likes older homes in fair condition; manufactured/mobile. Dislikes very high-value coastal.$info$;
  v_dont := $dw$Standard personal auto, standard HO-3 homeowners, life$dw$;
  v_terr := $terr$Manufactured and mobile: all 50 states, no age cap$terr$;
  needles := ARRAY['american modern']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'specialty', 'manufactured', 'mho']::text[];
  v_appetite := '[{"id":"pl-american-modern-mho-2026-09","dateRequested":"2026-09-22","lob":"MHO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Modern. All 50 states. Writes: HO. Likes: older homes in fair condition; manufactured/mobile. Dislikes: very high-value coastal. Already on desk — enrich only, never duplicate. MHO / DP1 / DP3. Collector cars, powersports, boats, pet, farm/ranch (nine states). Does not write standard personal auto, standard HO-3, or life. Don''t write / limits: Standard personal auto, standard HO-3 homeowners, life. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-american-modern-dp1-2026-09","dateRequested":"2026-09-22","lob":"DP1","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Modern. All 50 states. Writes: HO. Likes: older homes in fair condition; manufactured/mobile. Dislikes: very high-value coastal. Already on desk — enrich only, never duplicate. MHO / DP1 / DP3. Collector cars, powersports, boats, pet, farm/ranch (nine states). Does not write standard personal auto, standard HO-3, or life. Don''t write / limits: Standard personal auto, standard HO-3 homeowners, life. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-american-modern-dp3-2026-09","dateRequested":"2026-09-22","lob":"DP3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Modern. All 50 states. Writes: HO. Likes: older homes in fair condition; manufactured/mobile. Dislikes: very high-value coastal. Already on desk — enrich only, never duplicate. MHO / DP1 / DP3. Collector cars, powersports, boats, pet, farm/ranch (nine states). Does not write standard personal auto, standard HO-3, or life. Don''t write / limits: Standard personal auto, standard HO-3 homeowners, life. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- American Family
  seed_id := '33333333-3333-4333-8333-333333333348';
  enrich_only := false;
  cname := $n$American Family$n$;
  v_note := $note$American Family. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs. Midwest/Southeast regional. Auto, home, umbrella, RV, boat. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$American Family. Midwest/Southeast regional. Auto, home, umbrella, RV, boat. Likes bundling. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~19 states (Midwest/Southeast) — list unknown$terr$;
  needles := ARRAY['american family', 'amfam']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'RV', 'BOAT']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'bundle']::text[];
  v_appetite := '[{"id":"pl-american-family-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Family. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs. Midwest/Southeast regional. Auto, home, umbrella, RV, boat. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-american-family-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Family. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs. Midwest/Southeast regional. Auto, home, umbrella, RV, boat. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-american-family-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Family. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA, RV, BOAT. Likes: bundling. Dislikes: older roofs. Midwest/Southeast regional. Auto, home, umbrella, RV, boat. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Nationwide
  seed_id := '59ce34a0-1bca-477a-879a-95d2127bff9e';
  enrich_only := false;
  cname := $n$Nationwide$n$;
  v_note := $note$Nationwide. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA, RV, BOAT, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, RV, boat, commercial. Powersports (boat/moto/RV) notes already on desk. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Nationwide. Auto, home, umbrella, RV, boat, commercial. Powersports (boat/moto/RV) notes already on desk. Likes standard homes. Dislikes older roofs, high-value coastal.$info$;
  v_dont := NULL;
  v_terr := $terr$~46 states — exact list on nationals pack; confirm HO footprint$terr$;
  needles := ARRAY['nationwide']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'RV', 'BOAT', 'COMMERCIAL']::text[];
  add_tags := ARRAY['personal-lines', 'national', 'powersports']::text[];
  v_appetite := '[{"id":"pl-nationwide-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Nationwide. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA, RV, BOAT, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, RV, boat, commercial. Powersports (boat/moto/RV) notes already on desk. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-nationwide-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Nationwide. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA, RV, BOAT, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, RV, boat, commercial. Powersports (boat/moto/RV) notes already on desk. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-nationwide-rv-2026-09","dateRequested":"2026-09-22","lob":"RV","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Nationwide. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA, RV, BOAT, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, RV, boat, commercial. Powersports (boat/moto/RV) notes already on desk. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-nationwide-boat-2026-09","dateRequested":"2026-09-22","lob":"BOAT","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Nationwide. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA, RV, BOAT, COMMERCIAL. Likes: standard homes. Dislikes: older roofs, high-value coastal. Auto, home, umbrella, RV, boat, commercial. Powersports (boat/moto/RV) notes already on desk. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- The Hartford
  seed_id := '22f3242e-fdfa-4fb7-8bd7-406d0d6a1d3e';
  enrich_only := false;
  cname := $n$The Hartford$n$;
  v_note := $note$The Hartford. All 50 states. Writes: AUTO, HO, UMBRELLA, COMMERCIAL. Likes: standard homes. Dislikes: older roofs. Auto, home, umbrella, commercial. Personal lines often via AARP / affinity. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$The Hartford. Auto, home, umbrella, commercial. Personal lines often via AARP / affinity. Likes standard homes. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states (personal often via AARP / affinity)$terr$;
  needles := ARRAY['hartford']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA', 'COMMERCIAL']::text[];
  add_tags := ARRAY['personal-lines', 'national', 'aarp']::text[];
  v_appetite := '[{"id":"pl-the-hartford-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"The Hartford. All 50 states. Writes: AUTO, HO, UMBRELLA, COMMERCIAL. Likes: standard homes. Dislikes: older roofs. Auto, home, umbrella, commercial. Personal lines often via AARP / affinity. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-the-hartford-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"The Hartford. All 50 states. Writes: AUTO, HO, UMBRELLA, COMMERCIAL. Likes: standard homes. Dislikes: older roofs. Auto, home, umbrella, commercial. Personal lines often via AARP / affinity. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-the-hartford-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"The Hartford. All 50 states. Writes: AUTO, HO, UMBRELLA, COMMERCIAL. Likes: standard homes. Dislikes: older roofs. Auto, home, umbrella, commercial. Personal lines often via AARP / affinity. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Chubb
  seed_id := '2ff82334-c0a6-4668-8cbb-4d42ca509d49';
  enrich_only := false;
  cname := $n$Chubb$n$;
  v_note := $note$Chubb. All 50 states. Writes: HO, AUTO, UMBRELLA, BOAT. Likes: high-value homes. Dislikes: older/standard homes. High-value home, auto, umbrella, boat, jewelry. Not a mass-market HO shop. Don't write / limits: Mass-market / standard preferred HO as primary play. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Chubb. High-value home, auto, umbrella, boat, jewelry. Not a mass-market HO shop. Likes high-value homes. Dislikes older/standard homes.$info$;
  v_dont := $dw$Mass-market / standard preferred HO as primary play$dw$;
  v_terr := $terr$All 50 states — high-value selective$terr$;
  needles := ARRAY['chubb']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO', 'AUTO', 'UMBRELLA', 'BOAT']::text[];
  add_tags := ARRAY['personal-lines', 'high-value', 'hnw']::text[];
  v_appetite := '[{"id":"pl-chubb-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Chubb. All 50 states. Writes: HO, AUTO, UMBRELLA, BOAT. Likes: high-value homes. Dislikes: older/standard homes. High-value home, auto, umbrella, boat, jewelry. Not a mass-market HO shop. Don''t write / limits: Mass-market / standard preferred HO as primary play. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-chubb-ho5-2026-09","dateRequested":"2026-09-22","lob":"HO5","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Chubb. All 50 states. Writes: HO, AUTO, UMBRELLA, BOAT. Likes: high-value homes. Dislikes: older/standard homes. High-value home, auto, umbrella, boat, jewelry. Not a mass-market HO shop. Don''t write / limits: Mass-market / standard preferred HO as primary play. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-chubb-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Chubb. All 50 states. Writes: HO, AUTO, UMBRELLA, BOAT. Likes: high-value homes. Dislikes: older/standard homes. High-value home, auto, umbrella, boat, jewelry. Not a mass-market HO shop. Don''t write / limits: Mass-market / standard preferred HO as primary play. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Erie
  seed_id := '33333333-3333-4333-8333-333333333349';
  enrich_only := false;
  cname := $n$Erie$n$;
  v_note := $note$Erie. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA. Likes: preferred. Dislikes: older homes. Regional preferred auto/home/umbrella. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Erie. Regional preferred auto/home/umbrella. Likes preferred. Dislikes older homes.$info$;
  v_dont := NULL;
  v_terr := $terr$~12 states + DC — list unknown$terr$;
  needles := ARRAY['erie']::text[];
  excludes := ARRAY['coterie']::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'preferred']::text[];
  v_appetite := '[{"id":"pl-erie-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Erie. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA. Likes: preferred. Dislikes: older homes. Regional preferred auto/home/umbrella. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-erie-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Erie. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA. Likes: preferred. Dislikes: older homes. Regional preferred auto/home/umbrella. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-erie-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Erie. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA. Likes: preferred. Dislikes: older homes. Regional preferred auto/home/umbrella. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Amica
  seed_id := '33333333-3333-4333-8333-333333333350';
  enrich_only := false;
  cname := $n$Amica$n$;
  v_note := $note$Amica. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA. Likes: preferred. Dislikes: older roofs. Preferred auto/home/umbrella. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Amica. Preferred auto/home/umbrella. Likes preferred. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~48 states — list unknown$terr$;
  needles := ARRAY['amica']::text[];
  excludes := ARRAY['amicable', 'american amicable']::text[];
  add_lines := ARRAY['AUTO', 'HO', 'UMBRELLA']::text[];
  add_tags := ARRAY['personal-lines', 'preferred']::text[];
  v_appetite := '[{"id":"pl-amica-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Amica. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA. Likes: preferred. Dislikes: older roofs. Preferred auto/home/umbrella. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-amica-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Amica. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA. Likes: preferred. Dislikes: older roofs. Preferred auto/home/umbrella. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-amica-umb-2026-09","dateRequested":"2026-09-22","lob":"UMB","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Amica. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, UMBRELLA. Likes: preferred. Dislikes: older roofs. Preferred auto/home/umbrella. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Mercury
  seed_id := '05750826-2f3b-425c-8314-e76d1f2c12bc';
  enrich_only := false;
  cname := $n$Mercury$n$;
  v_note := $note$Mercury. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: standard. Dislikes: older roofs. CA-focused regional. Auto, home. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Mercury. CA-focused regional. Auto, home. Likes standard. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~10 states (CA-focused) — list unknown$terr$;
  needles := ARRAY['mercury']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'ca-focused']::text[];
  v_appetite := '[{"id":"pl-mercury-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Mercury. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: standard. Dislikes: older roofs. CA-focused regional. Auto, home. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-mercury-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Mercury. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: standard. Dislikes: older roofs. CA-focused regional. Auto, home. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- AAA
  seed_id := 'ff89f4a7-158b-4ad8-81c4-8f52059ca114';
  enrich_only := false;
  cname := $n$AAA$n$;
  v_note := $note$AAA. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, RV. Likes: members. Dislikes: older homes. CSAA / AAA. Auto, home, RV. Member-oriented. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$AAA. CSAA / AAA. Auto, home, RV. Member-oriented. Likes members. Dislikes older homes.$info$;
  v_dont := NULL;
  v_terr := $terr$~10 states (CSAA / AAA) — list unknown$terr$;
  needles := ARRAY['aaa', 'csaa']::text[];
  excludes := ARRAY['auto club enterprises']::text[];
  add_lines := ARRAY['AUTO', 'HO', 'RV']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'aaa', 'csaa']::text[];
  v_appetite := '[{"id":"pl-aaa-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"AAA. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, RV. Likes: members. Dislikes: older homes. CSAA / AAA. Auto, home, RV. Member-oriented. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-aaa-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"AAA. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, RV. Likes: members. Dislikes: older homes. CSAA / AAA. Auto, home, RV. Member-oriented. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-aaa-rv-2026-09","dateRequested":"2026-09-22","lob":"RV","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"AAA. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, RV. Likes: members. Dislikes: older homes. CSAA / AAA. Auto, home, RV. Member-oriented. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Auto Club Enterprises
  seed_id := '33333333-3333-4333-8333-333333333351';
  enrich_only := false;
  cname := $n$Auto Club Enterprises$n$;
  v_note := $note$Auto Club Enterprises. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: standard. Dislikes: older roofs. Auto Club Enterprises (distinct AAA club). Auto, home. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Auto Club Enterprises. Auto Club Enterprises (distinct AAA club). Auto, home. Likes standard. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~10 states — list unknown$terr$;
  needles := ARRAY['auto club enterprises', 'ace aaa']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'aaa']::text[];
  v_appetite := '[{"id":"pl-auto-club-enterprises-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Auto Club Enterprises. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: standard. Dislikes: older roofs. Auto Club Enterprises (distinct AAA club). Auto, home. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-auto-club-enterprises-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Auto Club Enterprises. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: standard. Dislikes: older roofs. Auto Club Enterprises (distinct AAA club). Auto, home. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Shelter
  seed_id := '33333333-3333-4333-8333-333333333352';
  enrich_only := false;
  cname := $n$Shelter$n$;
  v_note := $note$Shelter. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older homes. Regional preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Shelter. Regional preferred auto/home. Likes preferred. Dislikes older homes.$info$;
  v_dont := NULL;
  v_terr := $terr$~10 states — list unknown$terr$;
  needles := ARRAY['shelter']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'preferred']::text[];
  v_appetite := '[{"id":"pl-shelter-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Shelter. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older homes. Regional preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-shelter-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Shelter. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older homes. Regional preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- COUNTRY Financial
  seed_id := '33333333-3333-4333-8333-333333333353';
  enrich_only := false;
  cname := $n$COUNTRY Financial$n$;
  v_note := $note$COUNTRY Financial. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. COUNTRY Financial. Preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$COUNTRY Financial. COUNTRY Financial. Preferred auto/home. Likes preferred. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~17 states — list unknown$terr$;
  needles := ARRAY['country financial', 'country mutual']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'preferred']::text[];
  v_appetite := '[{"id":"pl-country-financial-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"COUNTRY Financial. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. COUNTRY Financial. Preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-country-financial-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"COUNTRY Financial. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. COUNTRY Financial. Preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- NJM
  seed_id := '33333333-3333-4333-8333-333333333354';
  enrich_only := false;
  cname := $n$NJM$n$;
  v_note := $note$NJM. Footprint: NJ. Writes: AUTO, HO. Likes: preferred. Dislikes: older homes. New Jersey Manufacturers — NJ only. Don't write / limits: Risks outside NJ. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$NJM. New Jersey Manufacturers — NJ only. Likes preferred. Dislikes older homes.$info$;
  v_dont := $dw$Risks outside NJ$dw$;
  v_terr := $terr$NJ only$terr$;
  needles := ARRAY['njm', 'new jersey manufacturers']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO']::text[];
  add_tags := ARRAY['personal-lines', 'nj-only', 'preferred']::text[];
  v_appetite := '[{"id":"pl-njm-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"NJM. Footprint: NJ. Writes: AUTO, HO. Likes: preferred. Dislikes: older homes. New Jersey Manufacturers — NJ only. Don''t write / limits: Risks outside NJ. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-njm-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"NJM. Footprint: NJ. Writes: AUTO, HO. Likes: preferred. Dislikes: older homes. New Jersey Manufacturers — NJ only. Don''t write / limits: Risks outside NJ. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Westfield
  seed_id := '33333333-3333-4333-8333-333333333355';
  enrich_only := false;
  cname := $n$Westfield$n$;
  v_note := $note$Westfield. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. Regional preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Westfield. Regional preferred auto/home. Likes preferred. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~10 states — list unknown$terr$;
  needles := ARRAY['westfield']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'preferred']::text[];
  v_appetite := '[{"id":"pl-westfield-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Westfield. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. Regional preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-westfield-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Westfield. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. Regional preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Utica National
  seed_id := '33333333-3333-4333-8333-333333333356';
  enrich_only := false;
  cname := $n$Utica National$n$;
  v_note := $note$Utica National. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Utica National. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Utica National. Utica National. Auto, home, commercial. Likes standard. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~10 states — list unknown$terr$;
  needles := ARRAY['utica']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'COMMERCIAL']::text[];
  add_tags := ARRAY['personal-lines', 'regional']::text[];
  v_appetite := '[{"id":"pl-utica-national-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Utica National. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Utica National. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-utica-national-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Utica National. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Utica National. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-utica-national-bop-2026-09","dateRequested":"2026-09-22","lob":"BOP","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Utica National. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Utica National. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- West Bend
  seed_id := '33333333-3333-4333-8333-333333333357';
  enrich_only := false;
  cname := $n$West Bend$n$;
  v_note := $note$West Bend. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. West Bend. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$West Bend. West Bend. Auto, home, commercial. Likes standard. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~10 states — list unknown$terr$;
  needles := ARRAY['west bend']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'COMMERCIAL']::text[];
  add_tags := ARRAY['personal-lines', 'regional']::text[];
  v_appetite := '[{"id":"pl-west-bend-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"West Bend. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. West Bend. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-west-bend-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"West Bend. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. West Bend. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-west-bend-bop-2026-09","dateRequested":"2026-09-22","lob":"BOP","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"West Bend. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. West Bend. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Acuity
  seed_id := '33333333-3333-4333-8333-333333333358';
  enrich_only := false;
  cname := $n$Acuity$n$;
  v_note := $note$Acuity. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Acuity. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Acuity. Acuity. Auto, home, commercial. Likes standard. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~30 states — list unknown$terr$;
  needles := ARRAY['acuity']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'COMMERCIAL']::text[];
  add_tags := ARRAY['personal-lines', 'regional']::text[];
  v_appetite := '[{"id":"pl-acuity-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Acuity. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Acuity. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-acuity-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Acuity. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Acuity. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-acuity-bop-2026-09","dateRequested":"2026-09-22","lob":"BOP","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Acuity. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Acuity. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Federated Mutual
  seed_id := '33333333-3333-4333-8333-333333333359';
  enrich_only := false;
  cname := $n$Federated Mutual$n$;
  v_note := $note$Federated Mutual. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Federated Mutual. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Federated Mutual. Federated Mutual. Auto, home, commercial. Likes standard. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~10 states — list unknown$terr$;
  needles := ARRAY['federated mutual', 'federated insurance']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO', 'COMMERCIAL']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'commercial']::text[];
  v_appetite := '[{"id":"pl-federated-mutual-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Federated Mutual. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Federated Mutual. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-federated-mutual-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Federated Mutual. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Federated Mutual. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-federated-mutual-bop-2026-09","dateRequested":"2026-09-22","lob":"BOP","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Federated Mutual. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO, COMMERCIAL. Likes: standard. Dislikes: older roofs. Federated Mutual. Auto, home, commercial. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Alfa
  seed_id := '33333333-3333-4333-8333-333333333360';
  enrich_only := false;
  cname := $n$Alfa$n$;
  v_note := $note$Alfa. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. Alfa. Preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Alfa. Alfa. Preferred auto/home. Likes preferred. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~10 states — list unknown$terr$;
  needles := ARRAY['alfa']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'preferred']::text[];
  v_appetite := '[{"id":"pl-alfa-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Alfa. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. Alfa. Preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-alfa-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Alfa. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. Alfa. Preferred auto/home. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Southern Farm Bureau
  seed_id := '33333333-3333-4333-8333-333333333361';
  enrich_only := false;
  cname := $n$Southern Farm Bureau$n$;
  v_note := $note$Southern Farm Bureau. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. Southern Farm Bureau. Other Farm Bureau groups are state-specific — do not invent a merged national Farm Bureau carrier. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Southern Farm Bureau. Southern Farm Bureau. Other Farm Bureau groups are state-specific — do not invent a merged national Farm Bureau carrier. Likes preferred. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$~15 states — list unknown; other Farm Bureau groups are state-specific$terr$;
  needles := ARRAY['southern farm bureau']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['AUTO', 'HO']::text[];
  add_tags := ARRAY['personal-lines', 'regional', 'farm-bureau', 'preferred']::text[];
  v_appetite := '[{"id":"pl-southern-farm-bureau-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Southern Farm Bureau. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. Southern Farm Bureau. Other Farm Bureau groups are state-specific — do not invent a merged national Farm Bureau carrier. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-southern-farm-bureau-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Southern Farm Bureau. Footprint under 50 states — exact list unknown; do not invent states. Writes: AUTO, HO. Likes: preferred. Dislikes: older roofs. Southern Farm Bureau. Other Farm Bureau groups are state-specific — do not invent a merged national Farm Bureau carrier. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Citizens
  seed_id := '6b053cdf-0199-473c-8b0f-e8c2177642b2';
  enrich_only := false;
  cname := $n$Citizens$n$;
  v_note := $note$Citizens. Footprint: FL. Writes: HO. Likes: high-risk coastal (takes what others decline). Dislikes: nothing — residual market. Florida residual property. Home last resort. Quoting depends on appointment. Don't write / limits: Non-FL risks. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Citizens. Florida residual property. Home last resort. Quoting depends on appointment. Likes high-risk coastal (takes what others decline). Dislikes nothing — residual market.$info$;
  v_dont := $dw$Non-FL risks$dw$;
  v_terr := $terr$FL only — residual / last resort property$terr$;
  needles := ARRAY['citizens']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'fl-only', 'residual']::text[];
  v_appetite := '[{"id":"pl-citizens-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Citizens. Footprint: FL. Writes: HO. Likes: high-risk coastal (takes what others decline). Dislikes: nothing — residual market. Florida residual property. Home last resort. Quoting depends on appointment. Don''t write / limits: Non-FL risks. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-citizens-dp1-2026-09","dateRequested":"2026-09-22","lob":"DP1","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Citizens. Footprint: FL. Writes: HO. Likes: high-risk coastal (takes what others decline). Dislikes: nothing — residual market. Florida residual property. Home last resort. Quoting depends on appointment. Don''t write / limits: Non-FL risks. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-citizens-dp3-2026-09","dateRequested":"2026-09-22","lob":"DP3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Citizens. Footprint: FL. Writes: HO. Likes: high-risk coastal (takes what others decline). Dislikes: nothing — residual market. Florida residual property. Home last resort. Quoting depends on appointment. Don''t write / limits: Non-FL risks. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Florida Peninsula
  seed_id := '6a0f669f-1489-4501-83cf-197b0c90db93';
  enrich_only := false;
  cname := $n$Florida Peninsula$n$;
  v_note := $note$Florida Peninsula. Footprint: FL. Writes: HO. Likes: Florida risks. Dislikes: older roofs without mitigation. FL-focused home/auto takeout writer. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Florida Peninsula. FL-focused home/auto takeout writer. Likes Florida risks. Dislikes older roofs without mitigation.$info$;
  v_dont := NULL;
  v_terr := $terr$FL only$terr$;
  needles := ARRAY['florida peninsula']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'fl-only', 'fl-specialty']::text[];
  v_appetite := '[{"id":"pl-florida-peninsula-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Florida Peninsula. Footprint: FL. Writes: HO. Likes: Florida risks. Dislikes: older roofs without mitigation. FL-focused home/auto takeout writer. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-florida-peninsula-dp3-2026-09","dateRequested":"2026-09-22","lob":"DP3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Florida Peninsula. Footprint: FL. Writes: HO. Likes: Florida risks. Dislikes: older roofs without mitigation. FL-focused home/auto takeout writer. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Tower Hill
  seed_id := 'a11e04a4-7fa6-43fe-8db5-f2d1afae4c85';
  enrich_only := false;
  cname := $n$Tower Hill$n$;
  v_note := $note$Tower Hill. Footprint: FL. Writes: HO. Likes: FL residential; MH no age cap, value up to $300k; up to 2 claims in 3 years; short-term rentals OK. Dislikes: older roofs on site-built without mitigation. FL MHO: no age cap on MH, value up to $300k. RC on homes ≤30 years, ACV older. Up to 2 claims in past 3 years OK. Short-term rentals (Airbnb) allowed. Common MH threads: tie-down cert, roof age/condition, 4-point on homes over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Tower Hill. FL MHO: no age cap on MH, value up to $300k. RC on homes ≤30 years, ACV older. Up to 2 claims in past 3 years OK. Short-term rentals (Airbnb) allowed. Common MH threads: tie-down cert, roof age/condition, 4-point on homes over 30 years. Likes FL residential; MH no age cap, value up to $300k; up to 2 claims in 3 years; short-term rentals OK. Dislikes older roofs on site-built without mitigation.$info$;
  v_dont := NULL;
  v_terr := $terr$FL / SE select$terr$;
  needles := ARRAY['tower hill']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'fl-specialty', 'mho']::text[];
  v_appetite := '[{"id":"pl-tower-hill-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Tower Hill. Footprint: FL. Writes: HO. Likes: FL residential; MH no age cap, value up to $300k; up to 2 claims in 3 years; short-term rentals OK. Dislikes: older roofs on site-built without mitigation. FL MHO: no age cap on MH, value up to $300k. RC on homes ≤30 years, ACV older. Up to 2 claims in past 3 years OK. Short-term rentals (Airbnb) allowed. Common MH threads: tie-down cert, roof age/condition, 4-point on homes over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-tower-hill-mho-2026-09","dateRequested":"2026-09-22","lob":"MHO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Tower Hill. Footprint: FL. Writes: HO. Likes: FL residential; MH no age cap, value up to $300k; up to 2 claims in 3 years; short-term rentals OK. Dislikes: older roofs on site-built without mitigation. FL MHO: no age cap on MH, value up to $300k. RC on homes ≤30 years, ACV older. Up to 2 claims in past 3 years OK. Short-term rentals (Airbnb) allowed. Common MH threads: tie-down cert, roof age/condition, 4-point on homes over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-tower-hill-dp1-2026-09","dateRequested":"2026-09-22","lob":"DP1","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Tower Hill. Footprint: FL. Writes: HO. Likes: FL residential; MH no age cap, value up to $300k; up to 2 claims in 3 years; short-term rentals OK. Dislikes: older roofs on site-built without mitigation. FL MHO: no age cap on MH, value up to $300k. RC on homes ≤30 years, ACV older. Up to 2 claims in past 3 years OK. Short-term rentals (Airbnb) allowed. Common MH threads: tie-down cert, roof age/condition, 4-point on homes over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-tower-hill-dp3-2026-09","dateRequested":"2026-09-22","lob":"DP3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Tower Hill. Footprint: FL. Writes: HO. Likes: FL residential; MH no age cap, value up to $300k; up to 2 claims in 3 years; short-term rentals OK. Dislikes: older roofs on site-built without mitigation. FL MHO: no age cap on MH, value up to $300k. RC on homes ≤30 years, ACV older. Up to 2 claims in past 3 years OK. Short-term rentals (Airbnb) allowed. Common MH threads: tie-down cert, roof age/condition, 4-point on homes over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- American Integrity
  seed_id := '33333333-3333-4333-8333-333333333309';
  enrich_only := false;
  cname := $n$American Integrity$n$;
  v_note := $note$American Integrity. Footprint: FL. Writes: HO. Likes: Florida risks; seasonal. Dislikes: older roofs without mitigation; mobile home. FL-focused. Good SE HO/DP and seasonal. Not a mobile-home market. Don't write / limits: Mobile / manufactured home. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$American Integrity. FL-focused. Good SE HO/DP and seasonal. Not a mobile-home market. Likes Florida risks; seasonal. Dislikes older roofs without mitigation; mobile home.$info$;
  v_dont := $dw$Mobile / manufactured home$dw$;
  v_terr := $terr$FL / SE$terr$;
  needles := ARRAY['american integrity']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'fl-specialty']::text[];
  v_appetite := '[{"id":"pl-american-integrity-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Integrity. Footprint: FL. Writes: HO. Likes: Florida risks; seasonal. Dislikes: older roofs without mitigation; mobile home. FL-focused. Good SE HO/DP and seasonal. Not a mobile-home market. Don''t write / limits: Mobile / manufactured home. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-american-integrity-dp3-2026-09","dateRequested":"2026-09-22","lob":"DP3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Integrity. Footprint: FL. Writes: HO. Likes: Florida risks; seasonal. Dislikes: older roofs without mitigation; mobile home. FL-focused. Good SE HO/DP and seasonal. Not a mobile-home market. Don''t write / limits: Mobile / manufactured home. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-american-integrity-seasonal-2026-09","dateRequested":"2026-09-22","lob":"SEASONAL","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Integrity. Footprint: FL. Writes: HO. Likes: Florida risks; seasonal. Dislikes: older roofs without mitigation; mobile home. FL-focused. Good SE HO/DP and seasonal. Not a mobile-home market. Don''t write / limits: Mobile / manufactured home. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- American Traditions
  seed_id := 'e66c7eef-e6a2-44e5-8255-9fe15b11803d';
  enrich_only := false;
  cname := $n$American Traditions$n$;
  v_note := $note$American Traditions. Footprint: FL. Writes: HO. Likes: Florida manufactured homes; tiers SA (full RC), SSH (RC contents / ACV home), DP1 (straight ACV); top tier back to ~1970. Dislikes: older roofs without mitigation. Florida manufactured-home leader. Water damage capped $10k on homes older than 40 years. Roof wind/hail may settle on payment schedule by roof age (discount trade, not decline). Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$American Traditions. Florida manufactured-home leader. Water damage capped $10k on homes older than 40 years. Roof wind/hail may settle on payment schedule by roof age (discount trade, not decline). Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Likes Florida manufactured homes; tiers SA (full RC), SSH (RC contents / ACV home), DP1 (straight ACV); top tier back to ~1970. Dislikes older roofs without mitigation.$info$;
  v_dont := NULL;
  v_terr := $terr$FL — manufactured-home leader$terr$;
  needles := ARRAY['american traditions']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'fl-specialty', 'mho', 'manufactured']::text[];
  v_appetite := '[{"id":"pl-american-traditions-mho-2026-09","dateRequested":"2026-09-22","lob":"MHO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Traditions. Footprint: FL. Writes: HO. Likes: Florida manufactured homes; tiers SA (full RC), SSH (RC contents / ACV home), DP1 (straight ACV); top tier back to ~1970. Dislikes: older roofs without mitigation. Florida manufactured-home leader. Water damage capped $10k on homes older than 40 years. Roof wind/hail may settle on payment schedule by roof age (discount trade, not decline). Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-american-traditions-dp1-2026-09","dateRequested":"2026-09-22","lob":"DP1","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Traditions. Footprint: FL. Writes: HO. Likes: Florida manufactured homes; tiers SA (full RC), SSH (RC contents / ACV home), DP1 (straight ACV); top tier back to ~1970. Dislikes: older roofs without mitigation. Florida manufactured-home leader. Water damage capped $10k on homes older than 40 years. Roof wind/hail may settle on payment schedule by roof age (discount trade, not decline). Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-american-traditions-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"American Traditions. Footprint: FL. Writes: HO. Likes: Florida manufactured homes; tiers SA (full RC), SSH (RC contents / ACV home), DP1 (straight ACV); top tier back to ~1970. Dislikes: older roofs without mitigation. Florida manufactured-home leader. Water damage capped $10k on homes older than 40 years. Roof wind/hail may settle on payment schedule by roof age (discount trade, not decline). Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Safe Harbor
  seed_id := '33333333-3333-4333-8333-333333333363';
  enrich_only := false;
  cname := $n$Safe Harbor$n$;
  v_note := $note$Safe Harbor. Footprint: FL. Writes: HO. Likes: Florida risks. Dislikes: older roofs without mitigation. FL-focused home/auto group note (Javy 2026-09-22). Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Safe Harbor. FL-focused home/auto group note (Javy 2026-09-22). Likes Florida risks. Dislikes older roofs without mitigation.$info$;
  v_dont := NULL;
  v_terr := $terr$FL-focused$terr$;
  needles := ARRAY['safe harbor']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'fl-specialty']::text[];
  v_appetite := '[{"id":"pl-safe-harbor-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Safe Harbor. Footprint: FL. Writes: HO. Likes: Florida risks. Dislikes: older roofs without mitigation. FL-focused home/auto group note (Javy 2026-09-22). Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Heritage
  seed_id := 'cfcca399-1f0f-46be-8603-861d06258508';
  enrich_only := false;
  cname := $n$Heritage$n$;
  v_note := $note$Heritage. Footprint: FL. Writes: HO. Likes: coastal habitational; newer roofs. Dislikes: older roofs — strictest of FL MHO four on roofs. FL specialist. MH: older roofs often ACV, sometimes 50–70% depreciation; wind shingle damage often “cosmetic” with little/no pay. Binding guidelines with appointed agents, not public site. Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Heritage. FL specialist. MH: older roofs often ACV, sometimes 50–70% depreciation; wind shingle damage often “cosmetic” with little/no pay. Binding guidelines with appointed agents, not public site. Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Likes coastal habitational; newer roofs. Dislikes older roofs — strictest of FL MHO four on roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$FL / SE coastal$terr$;
  needles := ARRAY['heritage']::text[];
  excludes := ARRAY['florida heritage']::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'fl-specialty', 'mho-strict-roof']::text[];
  v_appetite := '[{"id":"pl-heritage-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Heritage. Footprint: FL. Writes: HO. Likes: coastal habitational; newer roofs. Dislikes: older roofs — strictest of FL MHO four on roofs. FL specialist. MH: older roofs often ACV, sometimes 50–70% depreciation; wind shingle damage often “cosmetic” with little/no pay. Binding guidelines with appointed agents, not public site. Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-heritage-mho-2026-09","dateRequested":"2026-09-22","lob":"MHO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Heritage. Footprint: FL. Writes: HO. Likes: coastal habitational; newer roofs. Dislikes: older roofs — strictest of FL MHO four on roofs. FL specialist. MH: older roofs often ACV, sometimes 50–70% depreciation; wind shingle damage often “cosmetic” with little/no pay. Binding guidelines with appointed agents, not public site. Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-heritage-dp-2026-09","dateRequested":"2026-09-22","lob":"DP","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Heritage. Footprint: FL. Writes: HO. Likes: coastal habitational; newer roofs. Dislikes: older roofs — strictest of FL MHO four on roofs. FL specialist. MH: older roofs often ACV, sometimes 50–70% depreciation; wind shingle damage often “cosmetic” with little/no pay. Binding guidelines with appointed agents, not public site. Common MH threads: tie-down cert, roof age/condition, 4-point over 30 years. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Florida Specialty
  seed_id := '33333333-3333-4333-8333-333333333364';
  enrich_only := false;
  cname := $n$Florida Specialty$n$;
  v_note := $note$Florida Specialty. Footprint: FL. Writes: HO, AUTO. Likes: Florida risks. Dislikes: older roofs without mitigation. FL-focused home/auto (Javy group note 2026-09-22). Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Florida Specialty. FL-focused home/auto (Javy group note 2026-09-22). Likes Florida risks. Dislikes older roofs without mitigation.$info$;
  v_dont := NULL;
  v_terr := $terr$FL-focused$terr$;
  needles := ARRAY['florida specialty']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO', 'AUTO']::text[];
  add_tags := ARRAY['personal-lines', 'fl-specialty']::text[];
  v_appetite := '[{"id":"pl-florida-specialty-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Florida Specialty. Footprint: FL. Writes: HO, AUTO. Likes: Florida risks. Dislikes: older roofs without mitigation. FL-focused home/auto (Javy group note 2026-09-22). Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-florida-specialty-auto-2026-09","dateRequested":"2026-09-22","lob":"AUTO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Florida Specialty. Footprint: FL. Writes: HO, AUTO. Likes: Florida risks. Dislikes: older roofs without mitigation. FL-focused home/auto (Javy group note 2026-09-22). Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Universal P&C
  seed_id := '76ccf3a7-68c2-436b-8642-554cf96391c2';
  enrich_only := false;
  cname := $n$Universal P&C$n$;
  v_note := $note$Universal P&C. Footprint: FL, TX. Writes: HO. Likes: high-risk habitational. Dislikes: older roofs. Universal Property & Casualty. Home. Distinct from UICNA. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Universal P&C. Universal Property & Casualty. Home. Distinct from UICNA. Likes high-risk habitational. Dislikes older roofs.$info$;
  v_dont := NULL;
  v_terr := $terr$FL / TX$terr$;
  needles := ARRAY['universal p&c', 'universal property']::text[];
  excludes := ARRAY['north america', 'uicna']::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'fl-specialty', 'high-risk']::text[];
  v_appetite := '[{"id":"pl-universal-p-c-ho3-2026-09","dateRequested":"2026-09-22","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Universal P&C. Footprint: FL, TX. Writes: HO. Likes: high-risk habitational. Dislikes: older roofs. Universal Property & Casualty. Home. Distinct from UICNA. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-universal-p-c-dp1-2026-09","dateRequested":"2026-09-22","lob":"DP1","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Universal P&C. Footprint: FL, TX. Writes: HO. Likes: high-risk habitational. Dislikes: older roofs. Universal Property & Casualty. Home. Distinct from UICNA. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-universal-p-c-dp3-2026-09","dateRequested":"2026-09-22","lob":"DP3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Universal P&C. Footprint: FL, TX. Writes: HO. Likes: high-risk habitational. Dislikes: older roofs. Universal Property & Casualty. Home. Distinct from UICNA. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
  -- Assurant
  seed_id := '33333333-3333-4333-8333-333333333362';
  enrich_only := false;
  cname := $n$Assurant$n$;
  v_note := $note$Assurant. All 50 states. Writes: HO. Likes: older homes; manufactured / mobile / renters. Dislikes: very high-value coastal. Manufactured home, renters, mobile via partners. Javy personal-lines notes 2026-09-22. No UW mins invented.$note$;
  v_info := $info$Assurant. Manufactured home, renters, mobile via partners. Likes older homes; manufactured / mobile / renters. Dislikes very high-value coastal.$info$;
  v_dont := NULL;
  v_terr := $terr$All 50 states (via partners)$terr$;
  needles := ARRAY['assurant']::text[];
  excludes := ARRAY[]::text[];
  add_lines := ARRAY['HO']::text[];
  add_tags := ARRAY['personal-lines', 'specialty', 'manufactured', 'renters']::text[];
  v_appetite := '[{"id":"pl-assurant-mho-2026-09","dateRequested":"2026-09-22","lob":"MHO","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Assurant. All 50 states. Writes: HO. Likes: older homes; manufactured / mobile / renters. Dislikes: very high-value coastal. Manufactured home, renters, mobile via partners. Javy personal-lines notes 2026-09-22. No UW mins invented."},{"id":"pl-assurant-ho4-2026-09","dateRequested":"2026-09-22","lob":"HO4","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"Assurant. All 50 states. Writes: HO. Likes: older homes; manufactured / mobile / renters. Dislikes: very high-value coastal. Manufactured home, renters, mobile via partners. Javy personal-lines notes 2026-09-22. No UW mins invented."}]'::jsonb;
  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seed_id
      OR EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(excludes) AS x(v)
      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'
    )
  ORDER BY
    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(needles) AS n(v)
        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')
      ) THEN 0 ELSE 1
    END,
    c.created_at
  LIMIT 1;
  IF existing_id IS NULL AND enrich_only THEN
    NULL;
  ELSIF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, territory,
      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,
      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),
      'personal-lines-2026-09-22', true, now(), now()
    );
  ELSE
    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)
      INTO v_written, v_tags, v_rows
    FROM carriers c WHERE c.id = existing_id;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (
      SELECT jsonb_array_elements_text(v_written) AS v
      UNION
      SELECT unnest(add_lines)
    ) s;
    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (
      SELECT jsonb_array_elements_text(v_tags) AS v
      UNION
      SELECT unnest(add_tags)
    ) s;
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows
    FROM jsonb_array_elements(v_rows) elem
    WHERE coalesce(elem->>'id', '') NOT IN (
      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a
    );
    v_rows := v_rows || v_appetite;
    UPDATE carriers SET
      written_lines = v_written,
      tags = v_tags,
      territory = v_terr,
      carrier_info = v_info,
      appetite_notes = v_note,
      dont_write_notes = v_dont,
      appetite_rows = v_rows,
      portal_status = 'open',
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;
  existing_id := NULL;
END $$;
