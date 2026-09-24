import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { carriers, deals, documents, quotes, risks } from "@/lib/db/schema";
import { documentFileAuditInput } from "@/lib/documents/file-audit";
import { notHiddenDocument } from "@/lib/documents/visible-docs";
import { writeEoAuditSafe } from "@/lib/eo-audit/write";
import { QUOTE_PDF_DOC_TYPE, buildStubQuotePdf, quotePdfFilename } from "./quote-pdf";

export { QUOTE_PDF_DOC_TYPE, buildStubQuotePdf, quotePdfFilename } from "./quote-pdf";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

/**
 * Shared funnel hook: after stub quotes exist on a deal, attach one PDF per quote.
 * Idempotent. Does not insert policies. Safe for CRM UI and lifecycle-wiring to call.
 */
export async function attachFinalizedQuotePdfs(dealId: string): Promise<number> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!deal || !risk) return 0;

  const rows = await db
    .select({ quote: quotes, carrier: carriers })
    .from(quotes)
    .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
    .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, dealId)));

  const existing = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.dealId, dealId), eq(documents.docType, QUOTE_PDF_DOC_TYPE), notHiddenDocument()),
    );
  let actorId: string | null = null;
  let actorName: string | null = null;
  if (existing.length > 0) {
    try {
      const session = await currentDeskSession();
      actorId = session.userId || null;
      actorName = session.name || null;
    } catch {
      // Regeneration can run outside a desk request. The hide still audits.
    }
  }
  for (const doc of existing) {
    await writeEoAuditSafe(
      documentFileAuditInput({
        action: "doc_delete",
        doc,
        mode: "hidden",
        actorId,
        actorName,
        extra: { reason: "quote_pdf_regenerate" },
      }),
    );
    await db.update(documents).set({ status: "hidden" }).where(eq(documents.id, doc.id));
  }

  for (const { quote, carrier } of rows) {
    const filename = quotePdfFilename(carrier.name, quote.quoteNumber);
    const buffer = await buildStubQuotePdf({
      dealTitle: deal.title,
      carrierName: carrier.name,
      quoteNumber: quote.quoteNumber,
      premium: quote.premium,
      coverageA: quote.coverageA,
      hurricaneDeductible: quote.hurricaneDeductible,
      aopDeductible: quote.aopDeductible,
      bindable: quote.bindable,
    });
    const id = randomUUID();
    const storagePath = path.join(DEFAULT_TENANT_ID, dealId, `${id}-${filename}`);
    const abs = path.join(uploadRoot, storagePath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buffer);
    await db.insert(documents).values({
      id,
      tenantId: DEFAULT_TENANT_ID,
      riskId: risk.id,
      dealId,
      contactId: risk.contactId ?? null,
      filename,
      mimeType: "application/pdf",
      storagePath,
      docType: QUOTE_PDF_DOC_TYPE,
      slot: "quote_pdf",
      status: "attached",
    });
  }

  return rows.length;
}
