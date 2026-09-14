import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { sql } from "../src/lib/db";
import { APPETITE_CSV_RELATIVE_PATH, parseAppetiteCsv } from "../src/lib/appetite/gate/parse";
import { UICNA_SLUG, UNIVERSAL_PC_SLUG } from "../src/lib/appetite/gate/fl-ho-order";
import { upsertAppetiteCarriers } from "../src/lib/appetite/gate/store";

async function main() {
  const csvPath = path.resolve(process.cwd(), APPETITE_CSV_RELATIVE_PATH);
  const text = await readFile(csvPath, "utf8");
  const records = parseAppetiteCsv(text);

  const upc = records.find((r) => r.carrierId === UNIVERSAL_PC_SLUG);
  const uicna = records.find((r) => r.carrierId === UICNA_SLUG);
  if (!upc || !uicna) {
    throw new Error("CSV must contain both universal_pc and uicna as separate rows.");
  }
  if (upc.carrierId === uicna.carrierId) {
    throw new Error("universal_pc must not merge with uicna.");
  }

  const { upserted } = await upsertAppetiteCarriers(records, DEFAULT_TENANT_ID);
  const confirm = records.filter((r) => r.needsStateConfirm).map((r) => r.carrierId);

  console.log(`Appetite import upserted ${upserted} carrier_id rows from ${csvPath}`);
  console.log(`universal_pc states: ${upc.statesAvailable.join(",")}`);
  console.log(`uicna states: ${uicna.statesAvailable.join(",")}`);
  if (confirm.length) {
    console.log(`needs_state_confirm (explicit listed states only): ${confirm.join(", ")}`);
  }
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
