/**
 * One-shot: empty Rosa Castellanos Flood Risk Profile values only.
 * Leaves HO3 / home (and auto) quote sheets untouched.
 *
 * Usage: npx tsx --env-file=/workspace/fitfirst-neon.env scripts/ff-rosa-clear-flood-risk-profile.mts
 */
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { quoteSheets } from "@/lib/db/schema";

const DEAL_ID = "260de6f1-d91b-4e9f-ae0e-61e38de04b52";
const LINE = "flood";

function nonEmptyKeys(values: Record<string, unknown> | null | undefined): string[] {
  const vals = values ?? {};
  return Object.keys(vals).filter((k) => {
    const cell = vals[k] as { value?: unknown } | unknown;
    const v =
      cell && typeof cell === "object" && cell !== null && "value" in cell
        ? (cell as { value?: unknown }).value
        : cell;
    return v != null && String(v).trim() !== "";
  });
}

async function main() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL_ID), eq(quoteSheets.line, LINE)));
  if (!sheet) {
    console.log(JSON.stringify({ ok: false, error: "flood quote sheet not found", dealId: DEAL_ID }));
    process.exit(1);
  }
  const before = nonEmptyKeys(sheet.values as Record<string, unknown>);
  console.log(
    JSON.stringify({
      phase: "before",
      sheetId: sheet.id,
      line: sheet.line,
      nonEmptyCount: before.length,
      keys: before,
    }),
  );

  await db
    .update(quoteSheets)
    .set({ values: {}, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));

  const [afterSheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, sheet.id));
  const after = nonEmptyKeys(afterSheet?.values as Record<string, unknown>);

  // Confirm home untouched
  const [home] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL_ID), eq(quoteSheets.line, "home")));
  const homeKeys = nonEmptyKeys(home?.values as Record<string, unknown>);

  console.log(
    JSON.stringify({
      phase: "after",
      floodNonEmptyCount: after.length,
      floodKeys: after,
      homeNonEmptyCount: homeKeys.length,
      homeIntact: homeKeys.length > 0,
      clearedKeys: before,
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
