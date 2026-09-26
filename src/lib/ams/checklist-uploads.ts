import { isPolicyAttachDocType } from "@/lib/documents/document-labels";

/**
 * Servicing checklist row → Policy Documents Type (`?tab=documents&docType=`).
 * Null means the row is not file-backed (no Mark complete removal, no Documents button).
 *
 * mortgagee and AI endorsements share `endorsement` — the closest existing
 * category (lender / additional-insured endorsements). renewal_docs is its own
 * category so a renewal packet is not typed as an issued DEC.
 */
export const CHECKLIST_ROW_ATTACH_DOC_TYPE = {
  dec: "policy_dec",
  id_card: "policy_id",
  id_cards: "policy_id",
  aor: "aor",
  inspection: "inspection",
  mortgagee: "endorsement",
  renewal_docs: "renewal_docs",
  coi: "coi",
  ai_endorsements: "endorsement",
} as const;

export type ChecklistUploadRowKey = keyof typeof CHECKLIST_ROW_ATTACH_DOC_TYPE;

const ROW_FILE_TYPES: Record<ChecklistUploadRowKey, readonly string[]> = {
  dec: ["policy_dec", "policy_complete", "current_policy", "dec", "declaration", "policy"],
  id_card: ["policy_id", "id_card", "auto_id_card"],
  id_cards: ["policy_id", "id_card", "auto_id_card"],
  aor: ["aor"],
  inspection: ["inspection", "inspection_report"],
  mortgagee: ["endorsement"],
  renewal_docs: ["renewal_docs"],
  coi: ["coi", "certificate"],
  ai_endorsements: ["endorsement"],
};

export function checklistRowAttachDocType(key: string): string | null {
  const mapped = CHECKLIST_ROW_ATTACH_DOC_TYPE[key as ChecklistUploadRowKey];
  if (!mapped || !isPolicyAttachDocType(mapped)) return null;
  return mapped;
}

export function isChecklistUploadRow(key: string): boolean {
  return checklistRowAttachDocType(key) != null;
}

export function checklistRowHasFile(
  files: readonly { docType?: string | null }[],
  key: string,
): boolean {
  const types = ROW_FILE_TYPES[key as ChecklistUploadRowKey];
  if (!types) return false;
  const allowed = new Set(types);
  return files.some((file) => allowed.has(String(file.docType ?? "").toLowerCase()));
}
