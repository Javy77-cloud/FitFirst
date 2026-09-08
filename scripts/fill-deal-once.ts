/**
 * One-off: attach a source PDF to a deal (if missing), run Fill, print filled key NAMES only.
 * Usage: npx tsx --env-file=.env scripts/fill-deal-once.ts <dealId> <pdfPath> [docType]
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { runFillQuoteSheet } from "../src/app/actions/quote-sheet";
import { db } from "../src/lib/db";
import { documents, quoteSheets, risks } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { persistDealFile } from "../src/lib/documents/store";

async function main() {
  const dealId = process.argv[2];
  const pdfPath = process.argv[3];
  const docType = process.argv[4] || "dec";
  if (!dealId || !pdfPath) {
    console.error("Usage: fill-deal-once.ts <dealId> <pdfPath> [docType]");
    process.exit(2);
  }

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!risk) throw new Error("No risk for deal");

  const existing = await db
    .select()
    .from(documents)
    .where(and(eq(documents.dealId, dealId), eq(documents.tenantId, DEFAULT_TENANT_ID)));
  console.log("docs_before", existing.map((d) => ({ id: d.id, filename: d.filename, docType: d.docType })));

  const filename = path.basename(pdfPath).replace(/%23/g, "#");
  const buffer = await readFile(pdfPath);
  const doc = await persistDealFile({
    dealId,
    riskId: risk.id,
    filename,
    mimeType: "application/pdf",
    buffer,
    docType,
  });
  console.log("uploaded", { id: doc.id, filename: doc.filename, docType: doc.docType });

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
  const nonempty = Object.entries(values)
    .filter(([, cell]) => {
      if (!cell || typeof cell !== "object") return false;
      const c = cell as { value?: string; status?: string };
      return Boolean(String(c.value ?? "").trim()) && c.status !== "missing";
    })
    .map(([k]) => k);

  console.log("FILLED_EXTRACTED_KEY_NAMES", extractedKeys);
  console.log("extracted_count", extractedKeys.length);
  console.log("nonempty_count", nonempty.length);
  if (extractedKeys.length < 10) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
