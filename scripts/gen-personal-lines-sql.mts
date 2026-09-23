import { writeFileSync } from "node:fs";
import {
  PERSONAL_LINES_CARRIERS,
  PERSONAL_LINES_FIXTURE_TAG,
  PERSONAL_LINES_NOTES_DATE,
  personalLinesAppetiteNote,
  personalLinesCarrierInfo,
  personalLinesDontWrite,
} from "../src/lib/appetite/personal-lines-carriers.ts";

function dollar(tag: string, s: string): string {
  return `$${tag}$${s}$${tag}$`;
}
function quote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}
function jsonbLiteral(value: unknown): string {
  return `${quote(JSON.stringify(value))}::jsonb`;
}

const out: string[] = [];
out.push(`-- Personal-lines carriers from Javy notes ${PERSONAL_LINES_NOTES_DATE}.`);
out.push(`-- Match existing by name needles; insert only when missing.`);
out.push(`-- American Modern is enrich-only — never insert a duplicate.`);
out.push(`-- Portal quoting out of scope. UW→RP densify PARKED.`);
out.push(`--> statement-breakpoint`);
out.push(`DO $$`);
out.push(`DECLARE`);
out.push(`  tenant uuid := '11111111-1111-4111-8111-111111111111';`);
out.push(`  existing_id uuid;`);
out.push(`  v_written jsonb;`);
out.push(`  v_tags jsonb;`);
out.push(`  v_rows jsonb;`);
out.push(`  v_note text;`);
out.push(`  v_info text;`);
out.push(`  v_dont text;`);
out.push(`  v_terr text;`);
out.push(`  cname text;`);
out.push(`  seed_id uuid;`);
out.push(`  enrich_only boolean;`);
out.push(`  needles text[];`);
out.push(`  excludes text[];`);
out.push(`  add_lines text[];`);
out.push(`  add_tags text[];`);
out.push(`  v_appetite jsonb;`);
out.push(`BEGIN`);
out.push(`  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN`);
out.push(`    RETURN;`);
out.push(`  END IF;`);

for (const spec of PERSONAL_LINES_CARRIERS) {
  const noteTxt = personalLinesAppetiteNote(spec);
  const infoTxt = personalLinesCarrierInfo(spec);
  const dontTxt = personalLinesDontWrite(spec);
  const lobs = spec.appetiteLobs?.length ? spec.appetiteLobs : spec.writtenLines;
  const appetite = lobs.map((lob) => ({
    id: `pl-${spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${lob.toLowerCase()}-2026-09`,
    dateRequested: PERSONAL_LINES_NOTES_DATE,
    lob,
    roofAge: "",
    waterHeater: "",
    hvac: "",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "accept",
    notes: noteTxt,
  }));
  const excludes = spec.matchExclude ?? [];

  out.push(`  -- ${spec.name}`);
  out.push(`  seed_id := ${quote(spec.seedId)};`);
  out.push(`  enrich_only := ${spec.enrichOnly ? "true" : "false"};`);
  out.push(`  cname := ${dollar("n", spec.name)};`);
  out.push(`  v_note := ${dollar("note", noteTxt)};`);
  out.push(`  v_info := ${dollar("info", infoTxt)};`);
  out.push(`  v_dont := ${dontTxt ? dollar("dw", dontTxt) : "NULL"};`);
  out.push(`  v_terr := ${dollar("terr", spec.territory)};`);
  out.push(`  needles := ARRAY[${spec.matchNeedles.map(quote).join(", ")}]::text[];`);
  out.push(excludes.length ? `  excludes := ARRAY[${excludes.map(quote).join(", ")}]::text[];` : `  excludes := ARRAY[]::text[];`);
  out.push(`  add_lines := ARRAY[${spec.writtenLines.map(quote).join(", ")}]::text[];`);
  out.push(`  add_tags := ARRAY[${spec.tags.map(quote).join(", ")}]::text[];`);
  out.push(`  v_appetite := ${jsonbLiteral(appetite)};`);
  out.push(`  SELECT c.id INTO existing_id`);
  out.push(`  FROM carriers c`);
  out.push(`  WHERE c.tenant_id = tenant`);
  out.push(`    AND (`);
  out.push(`      c.id = seed_id`);
  out.push(`      OR EXISTS (`);
  out.push(`        SELECT 1 FROM unnest(needles) AS n(v)`);
  out.push(`        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')`);
  out.push(`      )`);
  out.push(`    )`);
  out.push(`    AND NOT EXISTS (`);
  out.push(`      SELECT 1 FROM unnest(excludes) AS x(v)`);
  out.push(`      WHERE x.v <> '' AND lower(c.name) LIKE '%' || x.v || '%'`);
  out.push(`    )`);
  out.push(`  ORDER BY`);
  out.push(`    CASE WHEN c.id::text ~* '^(33333333-|a0a00000-)' THEN 1 ELSE 0 END,`);
  out.push(`    CASE`);
  out.push(`      WHEN EXISTS (`);
  out.push(`        SELECT 1 FROM unnest(needles) AS n(v)`);
  out.push(`        WHERE lower(c.name) ~ ('(^|[^a-z0-9])' || n.v || '([^a-z0-9]|$)')`);
  out.push(`      ) THEN 0 ELSE 1`);
  out.push(`    END,`);
  out.push(`    c.created_at`);
  out.push(`  LIMIT 1;`);
  out.push(`  IF existing_id IS NULL AND enrich_only THEN`);
  out.push(`    NULL;`);
  out.push(`  ELSIF existing_id IS NULL THEN`);
  out.push(`    INSERT INTO carriers (`);
  out.push(`      id, tenant_id, name, written_lines, portal_status, territory,`);
  out.push(`      carrier_info, appetite_notes, dont_write_notes, appetite_rows, tags,`);
  out.push(`      fixture_tag, active, created_at, updated_at`);
  out.push(`    ) VALUES (`);
  out.push(`      seed_id, tenant, cname, to_jsonb(add_lines), 'open', v_terr,`);
  out.push(`      v_info, v_note, v_dont, v_appetite, to_jsonb(add_tags),`);
  out.push(`      ${quote(PERSONAL_LINES_FIXTURE_TAG)}, true, now(), now()`);
  out.push(`    );`);
  out.push(`  ELSE`);
  out.push(`    SELECT coalesce(c.written_lines, '[]'::jsonb), coalesce(c.tags, '[]'::jsonb), coalesce(c.appetite_rows, '[]'::jsonb)`);
  out.push(`      INTO v_written, v_tags, v_rows`);
  out.push(`    FROM carriers c WHERE c.id = existing_id;`);
  out.push(`    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_written FROM (`);
  out.push(`      SELECT jsonb_array_elements_text(v_written) AS v`);
  out.push(`      UNION`);
  out.push(`      SELECT unnest(add_lines)`);
  out.push(`    ) s;`);
  out.push(`    SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) INTO v_tags FROM (`);
  out.push(`      SELECT jsonb_array_elements_text(v_tags) AS v`);
  out.push(`      UNION`);
  out.push(`      SELECT unnest(add_tags)`);
  out.push(`    ) s;`);
  out.push(`    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) INTO v_rows`);
  out.push(`    FROM jsonb_array_elements(v_rows) elem`);
  out.push(`    WHERE coalesce(elem->>'id', '') NOT IN (`);
  out.push(`      SELECT coalesce(a->>'id', '') FROM jsonb_array_elements(v_appetite) a`);
  out.push(`    );`);
  out.push(`    v_rows := v_rows || v_appetite;`);
  out.push(`    UPDATE carriers SET`);
  out.push(`      written_lines = v_written,`);
  out.push(`      tags = v_tags,`);
  out.push(`      territory = v_terr,`);
  out.push(`      carrier_info = v_info,`);
  out.push(`      appetite_notes = v_note,`);
  out.push(`      dont_write_notes = v_dont,`);
  out.push(`      appetite_rows = v_rows,`);
  out.push(`      portal_status = 'open',`);
  out.push(`      active = true,`);
  out.push(`      updated_at = now()`);
  out.push(`    WHERE id = existing_id;`);
  out.push(`  END IF;`);
  out.push(`  existing_id := NULL;`);
}

out.push(`END $$;`);
out.push(``);
writeFileSync("drizzle/0151_personal_lines_carriers.sql", out.join("\n"));
console.log(`wrote drizzle/0151_personal_lines_carriers.sql (${PERSONAL_LINES_CARRIERS.length} carriers)`);
