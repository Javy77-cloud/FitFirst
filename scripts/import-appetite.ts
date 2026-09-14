import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { sql } from "../src/lib/db";
import {
  APPETITE_CSV_RELATIVE_PATH,
  companionStateRulesPath,
  parseAppetiteCsv,
  parseAppetiteStateRulesCsv,
} from "../src/lib/appetite/gate/parse";
import { UICNA_SLUG, UNIVERSAL_PC_SLUG } from "../src/lib/appetite/gate/fl-ho-order";
import { upsertAppetiteCarriers, upsertAppetiteStateRules } from "../src/lib/appetite/gate/store";

function fileArgs(): string[] {
  return process.argv.slice(2).filter((arg) => arg && !arg.startsWith("-"));
}

async function readOptional(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function main() {
  const args = fileArgs();
  const csvPath = path.resolve(process.cwd(), args[0] ?? APPETITE_CSV_RELATIVE_PATH);
  const text = await readFile(csvPath, "utf8");
  const records = parseAppetiteCsv(text);

  const upc = records.find((r) => r.carrierId === UNIVERSAL_PC_SLUG);
  const uicna = records.find((r) => r.carrierId === UICNA_SLUG);
  if (upc || uicna) {
    if (!upc || !uicna) {
      throw new Error("CSV that includes a Universal slug must contain both universal_pc and uicna.");
    }
    if (upc.carrierId === uicna.carrierId) {
      throw new Error("universal_pc must not merge with uicna.");
    }
  }

  const { upserted } = await upsertAppetiteCarriers(records, DEFAULT_TENANT_ID);
  const confirm = records.filter((r) => r.needsStateConfirm).map((r) => r.carrierId);

  console.log(`Appetite import upserted ${upserted} carrier_id rows from ${csvPath}`);
  if (upc && uicna) {
    console.log(`universal_pc states: ${upc.statesAvailable.join(",")}`);
    console.log(`uicna states: ${uicna.statesAvailable.join(",")}`);
  }
  if (confirm.length) {
    console.log(`needs_state_confirm (explicit listed states only): ${confirm.join(", ")}`);
  }

  const rulesArg = args[1] ?? companionStateRulesPath(csvPath);
  if (rulesArg) {
    const rulesPath = path.resolve(process.cwd(), rulesArg);
    const rulesText = await readOptional(rulesPath);
    if (rulesText != null) {
      const rules = parseAppetiteStateRulesCsv(rulesText);
      const { upserted: ruleCount } = await upsertAppetiteStateRules(rules, DEFAULT_TENANT_ID);
      console.log(`Appetite state-rule import upserted ${ruleCount} overlays from ${rulesPath}`);
    } else if (args[1]) {
      throw new Error(`State-rules CSV not found: ${rulesPath}`);
    }
  }

  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
