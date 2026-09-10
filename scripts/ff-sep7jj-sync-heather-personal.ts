/**
 * sep7jj — sync Heather Flood confirmed personal fields onto Home when blank.
 * Deal home: 5ed997ba-…  Flood source: fa61a32c-…
 * Empty-only: never overwrite non-blank Home cells.
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets, type QuoteSheetFieldValue } from "../src/lib/db/schema";

const FLOOD_DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const HOME_DEAL = "5ed997ba-21b5-4a70-bdf8-c78810cc79b1";
const KEYS = [
  "applicant_gender",
  "applicant_marital_status",
  "applicant_occupation",
  "entity_type",
] as const;

function blank(cell?: QuoteSheetFieldValue | null): boolean {
  if (!cell) return true;
  return !String(cell.value ?? "").trim() || cell.status === "missing";
}

async function main() {
  const [flood] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, FLOOD_DEAL), eq(quoteSheets.line, "flood")));
  const [home] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, HOME_DEAL), eq(quoteSheets.line, "home")));
  if (!flood || !home) throw new Error("missing flood or home sheet");

  const src = flood.values as Record<string, QuoteSheetFieldValue>;
  const dst = { ...(home.values as Record<string, QuoteSheetFieldValue>) };
  const synced: string[] = [];
  const skipped: string[] = [];

  for (const key of KEYS) {
    const from = src[key];
    if (!from || blank(from)) {
      skipped.push(`${key}:no-flood-value`);
      continue;
    }
    if (!blank(dst[key])) {
      skipped.push(`${key}:home-has-${dst[key]?.value}`);
      continue;
    }
    dst[key] = {
      value: String(from.value).trim(),
      status: "confirmed",
      source: "agent",
      sourceLabel: from.sourceLabel ?? "synced from Flood",
    };
    synced.push(`${key}=${dst[key].value}`);
  }

  if (synced.length) {
    await db
      .update(quoteSheets)
      .set({ values: dst, updatedAt: new Date() })
      .where(eq(quoteSheets.id, home.id));
  }

  console.log(JSON.stringify({ homeSheetId: home.id, synced, skipped }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
