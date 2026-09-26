import { policyAttachDocTypeLabel } from "@/lib/documents/document-labels";

/** Document type as shown in the attach confirmation — ALL CAPS, not the sentence around it. */
export function attachDocTypeConfirmLabel(docType: string): string {
  return policyAttachDocTypeLabel(docType).toUpperCase();
}
