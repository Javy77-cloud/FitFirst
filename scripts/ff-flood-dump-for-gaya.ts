import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const FLOOD = "fa61a32c-5351-4c43-8f91-2f92ef83b123";

async function main() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, FLOOD), eq(quoteSheets.line, "flood")));
  if (!sheet) throw new Error("no flood sheet");
  const values = (sheet.values || {}) as Record<string, any>;
  const filled: string[] = [];
  const yellows: string[] = [];
  const empty: string[] = [];
  for (const [k, cell] of Object.entries(values).sort(([a], [b]) => a.localeCompare(b))) {
    if (k === "records_check" || k === "returnTo") continue;
    const v = cell?.value;
    const status = String(cell?.status || "").toLowerCase();
    const src = cell?.source || "";
    if (v == null || String(v).trim() === "") {
      empty.push(k);
      continue;
    }
    const line = `${k}=${String(v)} [status=${status || "ok"} source=${src}]`;
    if (status.includes("check") || status.includes("yellow") || status.includes("missing") || status === "review") {
      yellows.push(line);
    }
    filled.push(line);
  }
  console.log(JSON.stringify({ sheetId: sheet.id, filledCount: filled.length, filled, yellows, empty }, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
