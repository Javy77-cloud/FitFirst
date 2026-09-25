import { and, asc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { notHiddenDocument } from "@/lib/documents/visible-docs";
import { isUuid } from "@/lib/ids";
import type { HomeInspectionDocument } from "@/lib/policy/home-overview-inspections";

/** Deal-library metadata for Overview eyes. Does not read or copy file bytes. */
export async function listDealInspectionDocuments(dealId: string): Promise<HomeInspectionDocument[]> {
  if (!isUuid(dealId)) return [];
  return db
    .select({
      id: documents.id,
      filename: documents.filename,
      mimeType: documents.mimeType,
      docType: documents.docType,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId), notHiddenDocument()))
    .orderBy(asc(documents.createdAt));
}
