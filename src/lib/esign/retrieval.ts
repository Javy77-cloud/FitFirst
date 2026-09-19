import { DOCUMENT_PIPELINE_TYPE_LABELS, isDocumentPipelineJobType } from "@/lib/document-pipeline/types";
import { inDeskSignHref } from "@/lib/esign/in-desk";

export const SIGNED_FORM_TYPES = ["acord", "loss_run", "cancellation", "aor", "other"] as const;
export type SignedFormType = (typeof SIGNED_FORM_TYPES)[number];

export const SIGNED_STATUSES = ["sent", "viewed", "completed"] as const;
export type SignedStatus = (typeof SIGNED_STATUSES)[number];

export const SIGNED_FORM_TYPE_LABELS: Record<SignedFormType, string> = {
  acord: "ACORD",
  loss_run: "No Run Loss",
  cancellation: "Cancellation",
  aor: "AOR",
  other: "Applications / other",
};

export const SIGNED_STATUS_LABELS: Record<SignedStatus, string> = {
  sent: "Sent",
  viewed: "Viewed",
  completed: "Completed",
};

export type SignedRetrievalRow = {
  id: string;
  source: "pipeline" | "signature";
  jobId: string | null;
  envelopeRecordId: string | null;
  providerEnvelopeId: string | null;
  provider: string;
  formType: SignedFormType;
  formLabel: string;
  status: SignedStatus;
  statusLabel: string;
  signerName: string | null;
  signerEmail: string | null;
  clientName: string | null;
  dealId: string | null;
  dealTitle: string | null;
  policyId: string | null;
  policyNumber: string | null;
  documentId: string | null;
  filename: string | null;
  publicToken: string | null;
  sentAt: string | null;
  completedAt: string | null;
  canDownload: boolean;
  canResend: boolean;
  canCopyLink: boolean;
};

export type SignedRetrievalFilters = {
  q?: string;
  status?: string;
  form?: string;
};

export function isSignedFormType(value: string | null | undefined): value is SignedFormType {
  return SIGNED_FORM_TYPES.includes((value ?? "") as SignedFormType);
}

export function isSignedStatus(value: string | null | undefined): value is SignedStatus {
  return SIGNED_STATUSES.includes((value ?? "") as SignedStatus);
}

export function classifySignedFormType(input: {
  pipelineType?: string | null;
  docType?: string | null;
  tags?: string[] | null;
  filename?: string | null;
  subject?: string | null;
}): SignedFormType {
  if (isDocumentPipelineJobType(input.pipelineType)) return input.pipelineType;
  const hay = [input.pipelineType, input.docType, ...(input.tags ?? []), input.filename, input.subject]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\bacord\b|fl-ho3|ho3/.test(hay)) return "acord";
  if (/no[-_ ]?run[-_ ]?loss|loss[-_ ]?run/.test(hay)) return "loss_run";
  if (/cancellation/.test(hay)) return "cancellation";
  if (/(^|[^a-z])aor([^a-z]|$)|agent of record/.test(hay)) return "aor";
  return "other";
}

export function normalizeSignedStatus(value: string | null | undefined): SignedStatus {
  const status = (value ?? "").trim().toLowerCase();
  if (status === "completed" || status === "signed" || status === "done") return "completed";
  if (status === "viewed" || status === "delivered") return "viewed";
  return "sent";
}

export function providerEnvelopeIdFromResult(result: string | null | undefined): string | null {
  const text = (result ?? "").trim();
  if (!text) return null;
  const match = text.match(/^(?:sent|viewed|completed|signed|sandbox_error|needs_connect):(.+)$/i);
  const id = (match?.[1] ?? "").trim();
  return id || null;
}

export function signedRowId(source: "pipeline" | "signature", id: string): string {
  return source === "pipeline" ? `p:${id}` : `e:${id}`;
}

export function parseSignedRowId(id: string): { source: "pipeline" | "signature"; id: string } | null {
  const text = (id ?? "").trim();
  if (text.startsWith("p:") && text.length > 2) return { source: "pipeline", id: text.slice(2) };
  if (text.startsWith("e:") && text.length > 2) return { source: "signature", id: text.slice(2) };
  return null;
}

export function signedDownloadHref(id: string): string {
  return `/api/esign/signed/${encodeURIComponent(id)}?download=1`;
}

export function copyLinkForRow(row: Pick<SignedRetrievalRow, "publicToken">): string | null {
  return row.publicToken ? inDeskSignHref(row.publicToken) : null;
}

export function rowHaystack(row: Pick<
  SignedRetrievalRow,
  "signerName" | "signerEmail" | "clientName" | "dealTitle" | "filename" | "policyNumber" | "formLabel"
>): string {
  return [row.signerName, row.signerEmail, row.clientName, row.dealTitle, row.filename, row.policyNumber, row.formLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterSignedRows(
  rows: SignedRetrievalRow[],
  filters: SignedRetrievalFilters,
): SignedRetrievalRow[] {
  const q = (filters.q ?? "").trim().toLowerCase();
  const status = isSignedStatus(filters.status) ? filters.status : null;
  const form = isSignedFormType(filters.form) ? filters.form : null;
  return rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (form && row.formType !== form) return false;
    if (q && !rowHaystack(row).includes(q)) return false;
    return true;
  });
}

export function capabilitiesForRow(input: {
  status: SignedStatus;
  documentId?: string | null;
  providerEnvelopeId?: string | null;
  publicToken?: string | null;
  provider?: string | null;
}): Pick<SignedRetrievalRow, "canDownload" | "canResend" | "canCopyLink"> {
  const hasDoc = Boolean(input.documentId);
  const hasVendor = Boolean(input.providerEnvelopeId);
  const hasToken = Boolean(input.publicToken);
  const completed = input.status === "completed";
  return {
    canDownload: hasDoc || (completed && hasVendor),
    canResend: !completed && (hasVendor || hasToken),
    canCopyLink: hasToken || (hasVendor && !completed),
  };
}

export function toSignedRow(input: {
  source: "pipeline" | "signature";
  recordId: string;
  jobId?: string | null;
  envelopeRecordId?: string | null;
  providerEnvelopeId?: string | null;
  provider?: string | null;
  pipelineType?: string | null;
  docType?: string | null;
  tags?: string[] | null;
  filename?: string | null;
  subject?: string | null;
  status?: string | null;
  signerName?: string | null;
  signerEmail?: string | null;
  clientName?: string | null;
  dealId?: string | null;
  dealTitle?: string | null;
  policyId?: string | null;
  policyNumber?: string | null;
  documentId?: string | null;
  publicToken?: string | null;
  sentAt?: Date | string | null;
  completedAt?: Date | string | null;
}): SignedRetrievalRow {
  const formType = classifySignedFormType(input);
  const status = normalizeSignedStatus(input.status);
  const caps = capabilitiesForRow({
    status,
    documentId: input.documentId,
    providerEnvelopeId: input.providerEnvelopeId,
    publicToken: input.publicToken,
    provider: input.provider,
  });
  return {
    id: signedRowId(input.source, input.recordId),
    source: input.source,
    jobId: input.jobId ?? (input.source === "pipeline" ? input.recordId : null),
    envelopeRecordId: input.envelopeRecordId ?? (input.source === "signature" ? input.recordId : null),
    providerEnvelopeId: input.providerEnvelopeId ?? null,
    provider: input.provider || (input.source === "pipeline" ? "docusign" : "in_desk"),
    formType,
    formLabel: formType === "other" ? SIGNED_FORM_TYPE_LABELS.other : DOCUMENT_PIPELINE_TYPE_LABELS[formType] ?? SIGNED_FORM_TYPE_LABELS[formType],
    status,
    statusLabel: SIGNED_STATUS_LABELS[status],
    signerName: input.signerName ?? null,
    signerEmail: input.signerEmail ?? null,
    clientName: input.clientName ?? input.signerName ?? null,
    dealId: input.dealId ?? null,
    dealTitle: input.dealTitle ?? null,
    policyId: input.policyId ?? null,
    policyNumber: input.policyNumber ?? null,
    documentId: input.documentId ?? null,
    filename: input.filename ?? null,
    publicToken: input.publicToken ?? null,
    sentAt: toIso(input.sentAt),
    completedAt: toIso(input.completedAt),
    ...caps,
  };
}

export function mergeSignedRows(
  pipeline: SignedRetrievalRow[],
  envelopes: SignedRetrievalRow[],
): SignedRetrievalRow[] {
  const vendorIds = new Set(
    pipeline.map((row) => row.providerEnvelopeId).filter((id): id is string => Boolean(id)),
  );
  const pipelineDocs = new Set(
    pipeline
      .filter((row) => row.documentId && row.dealId)
      .map((row) => `${row.dealId}:${row.documentId}`),
  );
  const extras = envelopes.filter((row) => {
    if (row.providerEnvelopeId && vendorIds.has(row.providerEnvelopeId)) return false;
    const fromResult = row.providerEnvelopeId;
    if (fromResult && vendorIds.has(fromResult)) return false;
    if (row.dealId && row.documentId && pipelineDocs.has(`${row.dealId}:${row.documentId}`)) return false;
    return true;
  });
  return [...pipeline, ...extras].sort((a, b) => {
    const left = a.sentAt || a.completedAt || "";
    const right = b.sentAt || b.completedAt || "";
    return right.localeCompare(left);
  });
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
