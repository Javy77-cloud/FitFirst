import type { QuoteSheetFieldValue } from "@/lib/db/schema";

export type UploadedFileDeleteMode = "hard" | "hide";

/** Issued policy files stay on disk for retention. Shopping / library files hard-delete. */
export function uploadedFileDeleteMode(doc: { slot: string; docType: string }): UploadedFileDeleteMode {
  if (doc.slot === "policy_file") return "hide";
  if (doc.docType === "policy_dec" || doc.docType === "policy_complete" || doc.docType === "policy_id") {
    return "hide";
  }
  return "hard";
}

export function deleteUploadedFileSubject(filename: string, mode: UploadedFileDeleteMode): string {
  if (mode === "hide") {
    return `the issued policy file “${filename}” (it will be hidden for retention, not wiped from storage)`;
  }
  return `the file “${filename}”`;
}

export function isHiddenUploadedFile(status: string): boolean {
  return status === "hidden";
}

export function visibleUploadedFiles<T extends { status: string }>(docs: T[]): T[] {
  return docs.filter((doc) => !isHiddenUploadedFile(doc.status));
}

/** Drop sheet cells that only came from extracted / photo-OCR so a deleted doc cannot leave orphans. */
export function clearExtractedSheetCells(
  values: Record<string, QuoteSheetFieldValue>,
): Record<string, QuoteSheetFieldValue> {
  const next: Record<string, QuoteSheetFieldValue> = { ...values };
  for (const [key, cell] of Object.entries(next)) {
    if (cell.source === "extracted" || cell.source === "photo-ocr") {
      next[key] = { value: "", status: "missing", source: "blank" };
    }
  }
  return next;
}
