import type { EoAuditWriteInput } from "@/lib/eo-audit/write";
import { ET_TIME_ZONE } from "@/lib/time/et";

export type DocumentAuditSubject = {
  id: string;
  filename: string;
  docType: string;
  slot: string;
  status?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
};

/** Eastern wall-clock stamp for audit meta. Never a UTC day bucket. */
export function formatDocumentAuditStamp(at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(at);
}

export function documentFileAuditInput(input: {
  action: "doc_delete" | "doc_restore";
  doc: DocumentAuditSubject;
  mode: "hidden" | "hard" | "restored";
  actorId?: string | null;
  actorName?: string | null;
  occurredAt?: Date;
  entityType?: string;
  /** False for attachment rows that are not `documents.id`. */
  recordAsDocument?: boolean;
  extra?: Record<string, unknown>;
}): EoAuditWriteInput {
  const at = input.occurredAt ?? new Date();
  const filename = input.doc.filename.trim() || "file";
  const recordAsDocument = input.recordAsDocument !== false;
  const summary =
    input.action === "doc_restore"
      ? `Restored ${filename}`
      : input.mode === "hard"
        ? `Purged ${filename}`
        : `Hidden ${filename}`;
  return {
    action: input.action,
    summary,
    occurredAt: at,
    actorId: input.actorId,
    actorName: input.actorName,
    entityType: input.entityType ?? (recordAsDocument ? "document" : "file"),
    entityId: input.doc.id,
    documentId: recordAsDocument ? input.doc.id : null,
    contactId: input.doc.contactId ?? null,
    accountId: input.doc.accountId ?? null,
    policyId: input.doc.policyId ?? null,
    dealId: input.doc.dealId ?? null,
    leadId: input.doc.leadId ?? null,
    meta: {
      filename,
      documentId: recordAsDocument ? input.doc.id : null,
      docType: input.doc.docType,
      slot: input.doc.slot,
      mode: input.mode,
      occurredAtEt: formatDocumentAuditStamp(at),
      ...(input.doc.status ? { previousStatus: input.doc.status } : {}),
      ...input.extra,
    },
  };
}

/** Status to put back when an admin restores a hidden file. */
export function restoredStatusFromDeleteMeta(meta: Record<string, unknown> | null | undefined): string {
  const previous = typeof meta?.previousStatus === "string" ? meta.previousStatus.trim() : "";
  if (!previous || previous === "hidden") return "uploaded";
  return previous;
}
