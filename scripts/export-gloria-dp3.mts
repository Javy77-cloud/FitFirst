import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { writeFileSync } from "fs";

const DP3 = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const SENSITIVE = /ssn|password|secret|tax.?id|itin|driver.?license.?number|dl_number/i;

function cellVal(cell: any): string {
  if (cell == null) return "";
  if (typeof cell !== "object") return String(cell);
  const v = cell.value ?? cell.val ?? cell.text ?? "";
  return v == null ? "" : String(v);
}
function cellStatus(cell: any): string {
  if (cell && typeof cell === "object") return String(cell.status ?? "");
  return "";
}
function cellSource(cell: any): string {
  if (cell && typeof cell === "object") return String(cell.source ?? "");
  return "";
}
function isEmpty(v: string, status: string) {
  return !String(v).trim() || status === "missing" || status === "yellow" || status === "needs_review";
}

async function main() {
  const dealRows = await db.execute(sql`
    select d.id, d.title, d.pipeline_stage, d.line_of_business, d.policy_sub_type,
           d.quoting_line, d.quoting_form, d.primary_named_insured, d.secondary_named_insured,
           d.property_oneliner, d.current_carrier, d.coverage_amount, d.shop_lines,
           d.created_at, d.updated_at, d.contact_id, d.account_id
    from deals d where d.id = ${DP3}
  `);
  const deal: any = (dealRows as any[])[0];

  let customArr: any[] = [];
  try {
    const custom = await db.execute(sql`
      select field_key, value, updated_at
      from desk_custom_field_values
      where record_id = ${DP3}
      order by field_key
    `);
    customArr = custom as any[];
  } catch (e: any) {
    console.error("custom values skip:", e?.cause?.message || e.message);
  }

  const sheets = await db.execute(sql`
    select id, line, values, updated_at from quote_sheets where deal_id = ${DP3} order by line
  `);

  let riskArr: any[] = [];
  try {
    const risks = await db.execute(sql`select * from risks where deal_id = ${DP3}`);
    riskArr = risks as any[];
  } catch (e: any) {
    console.error("risks skip:", e?.cause?.message || e.message);
  }

  const lines: string[] = [];
  lines.push(`# Gloria Martinez — DP3 / Home Master Quote Sheet Export`);
  lines.push(``);
  lines.push(`- **Deal ID:** \`${DP3}\``);
  lines.push(`- **Exported:** ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`);
  lines.push(`- **Purpose:** Hand values to Gaya (no passwords/SSN)`);
  lines.push(``);

  lines.push(`## Deal Details`);
  lines.push(``);
  if (!deal) {
    lines.push(`_Deal not found_`);
  } else {
    const dealFields: [string, any][] = [
      ["title", deal.title],
      ["primary_named_insured", deal.primary_named_insured],
      ["secondary_named_insured", deal.secondary_named_insured],
      ["line_of_business", deal.line_of_business],
      ["policy_sub_type", deal.policy_sub_type],
      ["quoting_line", deal.quoting_line],
      ["quoting_form", deal.quoting_form],
      ["property_oneliner / address", deal.property_oneliner],
      ["current_carrier", deal.current_carrier],
      ["coverage_amount", deal.coverage_amount],
      ["pipeline_stage", deal.pipeline_stage],
      ["shop_lines", deal.shop_lines ? JSON.stringify(deal.shop_lines) : ""],
      ["contact_id", deal.contact_id],
      ["updated_at", deal.updated_at],
    ];
    lines.push(`| Field | Value |`);
    lines.push(`|---|---|`);
    for (const [k, v] of dealFields) {
      if (v == null || String(v).trim() === "") continue;
      lines.push(`| ${k} | ${String(v).replace(/\|/g, "\\|")} |`);
    }
  }
  lines.push(``);

  if (customArr?.length) {
    lines.push(`## Desk Custom Field Values`);
    lines.push(``);
    lines.push(`| Field | Value |`);
    lines.push(`|---|---|`);
    let any = false;
    for (const c of customArr) {
      const key = String(c.field_key ?? "");
      if (SENSITIVE.test(key)) continue;
      let val = c.value;
      if (val != null && typeof val === "object") val = JSON.stringify(val);
      if (val == null || String(val).trim() === "") continue;
      if (SENSITIVE.test(String(val))) continue;
      any = true;
      lines.push(`| ${key} | ${String(val).replace(/\|/g, "\\|")} |`);
    }
    if (!any) lines.push(`_No non-empty custom values_`);
    lines.push(``);
  } else {
    lines.push(`## Desk Custom Field Values`);
    lines.push(``);
    lines.push(`_None stored separately_`);
    lines.push(``);
  }

  if (riskArr?.length) {
    lines.push(`## Risks (non-empty scalar fields)`);
    lines.push(``);
    const skip = new Set([
      "id", "tenant_id", "deal_id", "contact_id", "created_at", "updated_at",
      "raw", "meta", "data", "values", "payload",
    ]);
    for (const r of riskArr) {
      lines.push(`- **risk_id:** \`${r.id}\` · type=\`${r.risk_type ?? ""}\``);
      lines.push(``);
      lines.push(`| Field | Value |`);
      lines.push(`|---|---|`);
      for (const [k, v] of Object.entries(r)) {
        if (skip.has(k) || v == null) continue;
        if (SENSITIVE.test(k)) continue;
        if (typeof v === "object") continue;
        const s = String(v).trim();
        if (!s) continue;
        lines.push(`| ${k} | ${s.replace(/\|/g, "\\|")} |`);
      }
      lines.push(``);
    }
  }

  let totalFilled = 0;
  let totalEmpty = 0;
  const criticalMissing: string[] = [];
  const CRITICAL = [
    "applicant_name", "named_insured", "address1", "city", "state", "zip",
    "year_built", "construction", "square_feet", "occupancy", "usage",
    "coverage_a", "coverage_b", "coverage_c", "coverage_d", "coverage_e",
    "aop_deductible", "hurricane_deductible", "effective_date",
    "applicant_dob", "form", "roof_year", "roof_type", "roof_shape", "roof_covering",
    "landlord_liability", "lease_term", "tenant_name", "loss_of_rents",
    "applicant_email", "applicant_phone", "protection_class",
  ];

  for (const row of sheets as any[]) {
    const vals = row.values || {};
    const entries = Object.entries(vals).map(([k, cell]: any) => ({
      key: k,
      value: cellVal(cell),
      status: cellStatus(cell),
      source: cellSource(cell),
    })).filter((e) => !SENSITIVE.test(e.key));

    const filled = entries.filter((e) => !isEmpty(e.value, e.status));
    const empty = entries.filter((e) => isEmpty(e.value, e.status));
    totalFilled += filled.length;
    totalEmpty += empty.length;
    for (const ck of CRITICAL) {
      const hit = entries.find((e) => e.key === ck);
      if (!hit || isEmpty(hit.value, hit.status)) {
        if (!criticalMissing.includes(ck)) criticalMissing.push(ck);
      }
    }

    lines.push(`## Home Quote Sheet (\`${row.line}\`)`);
    lines.push(``);
    lines.push(`- Sheet updated: ${row.updated_at}`);
    lines.push(`- Total keys: ${entries.length} · **Filled: ${filled.length}** · **Empty/yellow: ${empty.length}**`);
    lines.push(``);
    lines.push(`### Filled (non-empty)`);
    lines.push(``);
    lines.push(`| Field | Value | Source | Status |`);
    lines.push(`|---|---|---|---|`);
    for (const e of filled.sort((a, b) => a.key.localeCompare(b.key))) {
      if (e.key === "records_check" || e.key === "returnTo") continue;
      let v = e.value.replace(/\n/g, " ").replace(/\|/g, "\\|");
      if (v.length > 200) v = v.slice(0, 197) + "...";
      lines.push(`| ${e.key} | ${v} | ${e.source} | ${e.status} |`);
    }
    lines.push(``);
    lines.push(`### Empty / yellow keys (brief)`);
    lines.push(``);
    lines.push(empty.map((e) => `\`${e.key}\``).sort().join(", ") || "_none_");
    lines.push(``);
  }

  if (!(sheets as any[]).length) {
    lines.push(`## Home Quote Sheet`);
    lines.push(``);
    lines.push(`_No quote_sheets rows for this deal_`);
    lines.push(``);
  }

  lines.push(`## Summary for Gaya`);
  lines.push(``);
  lines.push(`- **Filled cells:** ${totalFilled}`);
  lines.push(`- **Empty/yellow cells:** ${totalEmpty}`);
  lines.push(`- **Critical missing for quoting:** ${criticalMissing.length ? criticalMissing.map((k) => `\`${k}\``).join(", ") : "_none detected among checklist_"}`);
  lines.push(``);
  lines.push(`### Notes`);
  lines.push(`- Property risk: 10358 NW 30th TER, Doral FL 33172 (rental / tenant occupancy / DP3).`);
  lines.push(`- Mailing often Miami Lakes (16021 NW 79Th CT) — see sheet \`records_check\` for API/Gemini mismatches.`);
  lines.push(`- Landlord-critical empties called out in Summary (lease_term, tenant_name, contact phone/email if blank).`);
  lines.push(`- No passwords/SSN exported.`);
  lines.push(``);

  const out = "/tmp/gloria-dp3-sheet.md";
  writeFileSync(out, lines.join("\n"), "utf8");
  console.log(JSON.stringify({
    path: out,
    filled: totalFilled,
    empty: totalEmpty,
    criticalMissing,
    dealTitle: deal?.title,
    quotingForm: deal?.quoting_form,
    lob: deal?.line_of_business,
    property: deal?.property_oneliner,
    sheets: (sheets as any[]).map((s: any) => s.line),
    customCount: customArr.length,
    riskCount: riskArr.length,
  }, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
