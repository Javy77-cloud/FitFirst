import { db } from "/Users/franciscogarcia/FitFirst/src/lib/db";
import { sql } from "drizzle-orm";

const DP3 = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const HO3 = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const AT = "e66c7eef-e6a2-44e5-8255-9fe15b11803d";
const PTI = "67d52980-9167-4d94-8017-23509ded489a";

function cell(v: any) {
  if (!v || typeof v !== "object") return { value: v ?? "", source: "", status: "" };
  return { value: v.value ?? "", source: v.source ?? "", status: v.status ?? "", sourceLabel: v.sourceLabel ?? "" };
}

async function main() {
  const atQ = await db.execute(sql`
    select id, quote_number, premium, coverage_a, risk_outcome, next_step, bindable,
           carrier_open_url, bind_requirements, left(notes, 500) as notes
    from quotes where deal_id = ${DP3} and carrier_id = ${AT}
  `);
  console.log("AT_QUOTE", JSON.stringify(atQ, null, 2));

  const pti = await db.execute(sql`
    select id, name, portal_url, agent_portal_url, website, portal_login, portal_username_hint,
           agency_code, phone, customer_service_phone, claims_phone, underwriter_email, email,
           mailing_address, left(appetite_notes, 400) as appetite_notes_head,
           jsonb_array_length(coalesce(appetite_rows, '[]'::jsonb)) as appetite_rows_len
    from carriers where id = ${PTI}
  `);
  console.log("PTI_CARRIER", JSON.stringify(pti, null, 2));

  const ptiHo3 = await db.execute(sql`
    select id, risk_outcome, next_step, bindable, quote_number, premium, coverage_a,
           left(notes, 300) as notes, bind_requirements
    from quotes where deal_id = ${HO3} and carrier_id = ${PTI}
  `);
  console.log("PTI_HO3_QUOTE", JSON.stringify(ptiHo3, null, 2));

  const sheets = await db.execute(sql`
    select id, line, updated_at from quote_sheets where deal_id = ${DP3}
  `);
  console.log("DP3_SHEETS", JSON.stringify(sheets, null, 2));

  const sheetVals = await db.execute(sql`
    select values from quote_sheets where deal_id = ${DP3} and line = 'home'
  `);
  const values = (sheetVals as any[])[0]?.values ?? {};
  const keys = [
    "form","usage","roof_shape","roof_covering","roof_year","year_built","stories","square_feet",
    "occupancy","construction","exterior","garage_type","pool","insurance_score_range",
    "loss_history","coverage_a","address","city","state","zip"
  ];
  const pick: Record<string, unknown> = {};
  for (const k of keys) pick[k] = cell(values[k]);
  console.log("DP3_SHEET_FIELDS", JSON.stringify(pick, null, 2));
  console.log("DP3_SHEET_KEY_COUNT", Object.keys(values).length);

  const risk = await db.execute(sql`
    select id, year_built, roof_year, roof_covering, construction, occupancy, stories,
           pool, protection_class, miles_to_coast, city, county, coverage_a,
           opening_protection, address1, address_1
    from risks where deal_id = ${DP3}
  `);
  console.log("DP3_RISK", JSON.stringify(risk, null, 2));

  const existingPtiDp3 = await db.execute(sql`
    select id, risk_outcome, quote_number, premium, left(notes, 200) as notes
    from quotes where deal_id = ${DP3} and carrier_id = ${PTI}
  `);
  console.log("PTI_DP3_EXISTING", JSON.stringify(existingPtiDp3, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
