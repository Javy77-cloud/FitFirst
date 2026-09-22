/**
 * Rosa Castellanos gathering deal — wind mit + ADT alarm certificate were saved as other,
 * so Fill Risk Profile never sent them to Gemini. The closed-won Florida Peninsula deal
 * (5d4a4c04…) is a different shop and must not be retagged here.
 */
export const ROSA_GATHERING_DEAL_ID = "260de6f1-d91b-4e9f-ae0e-61e38de04b52";
export const ROSA_WIND_MIT_DOCUMENT_ID = "1f82de0d-fa2d-4d8c-a98a-a73365422bcb";
export const ROSA_ALARM_DOCUMENT_ID = "bd221a27-746d-41d7-aad0-09d49522b4b1";

export type RosaGatheringDocType = "wind_mit" | "alarm_certificate";

export type RosaGatheringRetagDecision =
  | { action: "retag"; docType: RosaGatheringDocType }
  | { action: "keep"; docType: string }
  | { action: "skip"; reason: "unknown-id" | "wrong-deal" | "filename" | "already-typed" };

function filenameMatches(id: string, filename: string): boolean {
  const name = filename.toLowerCase();
  if (id === ROSA_WIND_MIT_DOCUMENT_ID) return /wind/.test(name);
  if (id === ROSA_ALARM_DOCUMENT_ID) return /alarm|\badt\b|\bcertificates?\b/.test(name);
  return false;
}

/** Idempotent retag plan. Only `other` (or blank) rows with a matching filename move. */
export function rosaGatheringRetagDecision(doc: {
  id: string;
  dealId?: string | null;
  filename?: string | null;
  docType?: string | null;
}): RosaGatheringRetagDecision {
  const target: RosaGatheringDocType | null =
    doc.id === ROSA_WIND_MIT_DOCUMENT_ID
      ? "wind_mit"
      : doc.id === ROSA_ALARM_DOCUMENT_ID
        ? "alarm_certificate"
        : null;
  if (!target) return { action: "skip", reason: "unknown-id" };
  if (doc.dealId && doc.dealId !== ROSA_GATHERING_DEAL_ID) return { action: "skip", reason: "wrong-deal" };
  const filename = doc.filename?.trim() ?? "";
  if (filename && !filenameMatches(doc.id, filename)) return { action: "skip", reason: "filename" };
  const current = (doc.docType ?? "").trim().toLowerCase();
  if (current === target) return { action: "keep", docType: target };
  if (current && current !== "other") return { action: "skip", reason: "already-typed" };
  return { action: "retag", docType: target };
}
