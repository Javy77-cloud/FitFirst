
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";
import { fieldsForLine } from "../src/lib/quote-sheet/catalog";

const FLOOD = "fa61a32c-5351-4c43-8f91-2f92ef83b123";

async function main() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, FLOOD), eq(quoteSheets.line, "flood")));
  if (!sheet) throw new Error("no flood sheet");
  const values = sheet.values as Record<string, any>;
  const catalogKeys = new Set(fieldsForLine("flood").map((f) => f.key));
  const filled: any[] = [];
  const filledNotInCatalog: any[] = [];
  const emptyCatalog: string[] = [];
  for (const [k, cell] of Object.entries(values)) {
    const v = cell?.value;
    const has = v != null && String(v).trim() !== "";
    if (has) {
      const row = { key: k, value: String(v), source: cell?.source, status: cell?.status, inCatalog: catalogKeys.has(k) };
      filled.push(row);
      if (!catalogKeys.has(k)) filledNotInCatalog.push(row);
    }
  }
  for (const f of fieldsForLine("flood")) {
    const v = values[f.key]?.value;
    if (v == null || String(v).trim() === "") emptyCatalog.push(`${f.group}|${f.key}|${f.label}`);
  }
  filled.sort((a, b) => a.key.localeCompare(b.key));
  console.log(JSON.stringify({ sheetId: sheet.id, filledCount: filled.length, filled, filledNotInCatalog, emptyCatalog }, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
