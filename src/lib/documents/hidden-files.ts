import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents, eoAuditLogs } from "@/lib/db/schema";

export type HiddenDocumentScope = {
  dealId?: string | null;
  contactId?: string | null;
  policyId?: string | null;
  leadId?: string | null;
  accountId?: string | null;
  /** Library root files only — not deal/contact/policy copies that share a library name. */
  library?: string | null;
};

export type HiddenDocumentRow = {
  id: string;
  filename: string;
  docType: string;
  slot: string;
  createdAt: Date;
  hiddenAt: Date | null;
  actorName: string | null;
};

export function orderHiddenDocuments<T extends { id: string; createdAt: Date }>(
  rows: T[],
  hiddenAtById: ReadonlyMap<string, Date>,
): T[] {
  return [...rows].sort((a, b) => {
    const aAt = hiddenAtById.get(a.id)?.getTime() ?? a.createdAt.getTime();
    const bAt = hiddenAtById.get(b.id)?.getTime() ?? b.createdAt.getTime();
    return bAt - aAt;
  });
}

export async function listHiddenDocuments(scope: HiddenDocumentScope): Promise<HiddenDocumentRow[]> {
  const scopes = [
    scope.dealId ? eq(documents.dealId, scope.dealId) : undefined,
    scope.contactId ? eq(documents.contactId, scope.contactId) : undefined,
    scope.policyId ? eq(documents.policyId, scope.policyId) : undefined,
    scope.leadId ? eq(documents.leadId, scope.leadId) : undefined,
    scope.accountId ? eq(documents.accountId, scope.accountId) : undefined,
    scope.library
      ? and(
          eq(documents.library, scope.library),
          isNull(documents.dealId),
          isNull(documents.contactId),
          isNull(documents.policyId),
          isNull(documents.leadId),
          isNull(documents.accountId),
        )
      : undefined,
  ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause));
  if (scopes.length === 0) return [];

  const rows = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      docType: documents.docType,
      slot: documents.slot,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.status, "hidden"), or(...scopes)))
    .limit(50);

  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const audits = await db
    .select({
      documentId: eoAuditLogs.documentId,
      occurredAt: eoAuditLogs.occurredAt,
      actorName: eoAuditLogs.actorName,
    })
    .from(eoAuditLogs)
    .where(
      and(
        eq(eoAuditLogs.tenantId, DEFAULT_TENANT_ID),
        eq(eoAuditLogs.action, "doc_delete"),
        inArray(eoAuditLogs.documentId, ids),
      ),
    )
    .orderBy(desc(eoAuditLogs.occurredAt));

  const hiddenAtById = new Map<string, Date>();
  const actorById = new Map<string, string>();
  for (const audit of audits) {
    if (!audit.documentId || hiddenAtById.has(audit.documentId)) continue;
    hiddenAtById.set(audit.documentId, audit.occurredAt);
    actorById.set(audit.documentId, audit.actorName);
  }

  return orderHiddenDocuments(rows, hiddenAtById).map((row) => ({
    ...row,
    hiddenAt: hiddenAtById.get(row.id) ?? null,
    actorName: actorById.get(row.id) ?? null,
  }));
}
