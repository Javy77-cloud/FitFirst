export type DocumentVersionRow = {
  id: string;
  documentId: string;
  versionNumber: number;
  filename: string;
  mimeType: string;
  storagePath: string;
  docType: string;
  uploadedByName: string | null;
  note: string | null;
  createdAt: Date | string;
};

export function nextVersionNumber(existing: number[]): number {
  if (existing.length === 0) return 1;
  return Math.max(...existing) + 1;
}

export function groupVersionsByDocument(
  rows: DocumentVersionRow[],
): Map<string, DocumentVersionRow[]> {
  const grouped = new Map<string, DocumentVersionRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.documentId) ?? [];
    list.push(row);
    grouped.set(row.documentId, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => b.versionNumber - a.versionNumber);
  }
  return grouped;
}

export function currentVersionNumber(rows: DocumentVersionRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.versionNumber), 0);
}

export function priorVersions(rows: DocumentVersionRow[]): DocumentVersionRow[] {
  const current = currentVersionNumber(rows);
  return rows
    .filter((row) => row.versionNumber !== current)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

export { fileVersionHref } from "@/lib/files/urls";
