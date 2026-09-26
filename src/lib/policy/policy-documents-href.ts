import { isPolicyAttachDocType } from "@/lib/documents/document-labels";

/** Default Type/Category on Policy Documents attach when the URL has no preset. */
export const DEFAULT_POLICY_ATTACH_DOC_TYPE = "policy_dec";

/**
 * Attach type from `?tab=documents&docType=`.
 * Only DOCUMENT_CATEGORIES values apply. Anything else stays Issued declaration page.
 */
export function presetPolicyAttachDocType(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  return isPolicyAttachDocType(raw) ? raw : DEFAULT_POLICY_ATTACH_DOC_TYPE;
}

export function policyDocumentsTabHref(policyId: string, docType?: string | null): string {
  const href = `/policies/${policyId.trim()}?tab=documents`;
  const raw = (docType ?? "").trim().toLowerCase();
  if (!isPolicyAttachDocType(raw)) return href;
  return `${href}&docType=${encodeURIComponent(raw)}`;
}

/**
 * Optional servicing packet → Documents.
 * AOR collect paths preset Type/Category to the AOR packet so the upload is not an issued DEC.
 */
export function optionalServicingPacketDocumentsHref(policyId: string, packetKey: string): string {
  if (packetKey === "aor") return policyDocumentsTabHref(policyId, "aor");
  return policyDocumentsTabHref(policyId);
}
