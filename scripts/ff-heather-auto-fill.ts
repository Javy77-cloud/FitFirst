import { and, eq, desc } from "drizzle-orm";
import { runFillQuoteSheet } from "../src/app/actions/quote-sheet";
import { db } from "../src/lib/db";
import { documents, extractionAttempts, quoteSheets } from "../src/lib/db/schema";

const dealId = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

async function main() {
  const docs = await db.select().from(documents).where(eq(documents.dealId, dealId));
  console.log("DOCS", docs.map((d) => ({ filename: d.filename, docType: d.docType, mime: d.mimeType })));
  console.log("FILL_START");
  const counts = await runFillQuoteSheet(dealId, "auto");
  console.log("FILL_COUNTS", JSON.stringify(counts));

  const attempts = await db
    .select()
    .from(extractionAttempts)
    .where(eq(extractionAttempts.dealId, dealId))
    .orderBy(desc(extractionAttempts.createdAt))
    .limit(8);
  console.log(
    "ATTEMPTS",
    attempts.map((a) => ({
      engine: a.engine,
      status: a.status,
      message: (a.message ?? "").slice(0, 180),
    })),
  );

  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, dealId), eq(quoteSheets.line, "auto")));
  const values = (sheet?.values ?? {}) as Record<string, { value?: string; source?: string; status?: string }>;
  const filled = Object.entries(values)
    .filter(([, cell]) => String(cell?.value ?? "").trim() && cell?.status !== "missing")
    .map(([k, cell]) => ({
      key: k,
      value: String(cell?.value ?? "").slice(0, 90),
      source: cell?.source,
      status: cell?.status,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
  // Highlight auto-ish keys
  const autoish = filled.filter((f) =>
    /vin|vehicle|driver|liability|pip|comp_|collision|garaging|um_uim|named_insured|policy_number|current_|years_with|currently_insured|expiration/i.test(
      f.key,
    ),
  );
  console.log("AUTOISH_FILLED", JSON.stringify(autoish, null, 2));
  console.log("FILLED_COUNT", filled.length);
  console.log("AUTOISH_COUNT", autoish.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
