import { and, eq } from "drizzle-orm";
import { runFillQuoteSheet } from "../src/app/actions/quote-sheet";
import { db } from "../src/lib/db";
import { documents, quoteSheets } from "../src/lib/db/schema";

async function main() {
  const dealId = process.argv[2];
  if (!dealId) {
    console.error("Usage: refill-deal-keys.ts <dealId>");
    process.exit(2);
  }

  const docs = await db.select().from(documents).where(eq(documents.dealId, dealId));
  console.log(
    "docs",
    docs.map((d) => ({ filename: d.filename, docType: d.docType, status: d.status })),
  );

  await runFillQuoteSheet(dealId, "home");

  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, dealId), eq(quoteSheets.line, "home")));
  const values = sheet?.values ?? {};
  const extractedKeys = Object.entries(values)
    .filter(([, cell]) => {
      if (!cell || typeof cell !== "object") return false;
      const c = cell as { value?: string; source?: string; status?: string };
      return (
        (c.source === "extracted" || c.source === "photo-ocr") &&
        Boolean(String(c.value ?? "").trim()) &&
        c.status !== "missing"
      );
    })
    .map(([k]) => k)
    .sort();
  console.log("FILLED_EXTRACTED_KEY_NAMES", extractedKeys);
  console.log("extracted_count", extractedKeys.length);
  if (extractedKeys.length < 10) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
