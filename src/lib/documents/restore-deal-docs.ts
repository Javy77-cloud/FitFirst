import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documentFolders, documents, risks } from "@/lib/db/schema";
import { slotForDocType } from "@/lib/deals/lookup";
import { isDocumentsSourceDoc, isQuoteFileDoc } from "@/lib/deals/quote-docs";

export function dealSourceSlotForUpload(input: {
  dealId?: string | null;
  requestedSlot?: string | null;
  docType: string;
  hasFolder?: boolean;
}): string {
  const requested = (input.requestedSlot ?? "").trim();
  if (input.dealId) {
    // A deal folder must not flip worksheet uploads to library_file — that hid
    // Home/Auto files after Save (they left the source-doc list / fill path).
    if (requested && requested !== "library_file") return requested;
    return slotForDocType(input.docType);
  }
  if (requested) return requested;
  return input.hasFolder ? "library_file" : slotForDocType(input.docType);
}

function shouldRestoreDealSourceDoc(doc: {
  slot: string;
  docType: string;
  tags?: string[] | null;
  status: string;
}): boolean {
  if (isQuoteFileDoc(doc)) return false;
  if (doc.slot === "quote_pdf" || doc.slot === "quote_file" || doc.slot === "policy_file") {
    return false;
  }
  // User deletes set status === "hidden". Only Recently deleted → Restore unhides them.
  if (doc.status === "hidden") return false;
  return isDocumentsSourceDoc(doc) || doc.slot === "library_file";
}

/** Re-link / unhide deal source docs. Never used as a wipe. Issued policy files stay hidden. */
export async function restoreDealSourceDocuments(dealId: string): Promise<number> {
  if (!dealId) return 0;
  const [risk] = await db
    .select({ id: risks.id })
    .from(risks)
    .where(and(eq(risks.tenantId, DEFAULT_TENANT_ID), eq(risks.dealId, dealId)));
  const folders = await db
    .select({ id: documentFolders.id })
    .from(documentFolders)
    .where(and(eq(documentFolders.tenantId, DEFAULT_TENANT_ID), eq(documentFolders.dealId, dealId)));
  const folderIds = folders.map((row) => row.id);

  const clauses = [
    and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId)),
    risk
      ? and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.riskId, risk.id), isNull(documents.dealId))
      : undefined,
    folderIds.length > 0
      ? and(
          eq(documents.tenantId, DEFAULT_TENANT_ID),
          inArray(documents.folderId, folderIds),
          isNull(documents.dealId),
        )
      : undefined,
  ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause));
  if (clauses.length === 0) return 0;

  const rows = await db.select().from(documents).where(or(...clauses));
  let restored = 0;
  for (const doc of rows) {
    if (!shouldRestoreDealSourceDoc(doc)) continue;
    const nextSlot =
      doc.slot === "library_file" && slotForDocType(doc.docType) === "source_doc"
        ? "source_doc"
        : doc.slot;
    const nextStatus = doc.status;
    const nextDealId = doc.dealId ?? dealId;
    const nextRiskId = doc.riskId ?? risk?.id ?? null;
    if (
      nextSlot === doc.slot &&
      nextStatus === doc.status &&
      nextDealId === doc.dealId &&
      nextRiskId === doc.riskId
    ) {
      continue;
    }
    await db
      .update(documents)
      .set({
        dealId: nextDealId,
        riskId: nextRiskId,
        slot: nextSlot,
        status: nextStatus,
      })
      .where(eq(documents.id, doc.id));
    restored += 1;
  }
  return restored;
}
