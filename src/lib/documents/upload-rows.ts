/** Repeatable document-upload row used by deal Documents / attach forms. */

export type UploadDocRow = {
  id: number;
  docType: string;
  fileName: string;
  pick: number;
  file?: File | null;
};

export function emptyUploadRow(id: number, docType = "dec"): UploadDocRow {
  return { id, docType, fileName: "", pick: 0, file: null };
}

/**
 * Apply one or more picked files to a row.
 * Empty / cancel → no-op.
 * The first file fills the target row; each extra file becomes its own row
 * (same shape as “+ Add another document”). Does not collapse files into one slot.
 */
export function applyPickedFilesToRows(
  rows: UploadDocRow[],
  rowId: number,
  files: readonly File[],
): UploadDocRow[] {
  if (files.length === 0) return rows;
  const target = rows.find((row) => row.id === rowId);
  if (!target) return rows;

  const first = files[0]!;
  let nextId = Math.max(...rows.map((row) => row.id)) + 1;
  const extras = files.slice(1).map((file) => {
    const row: UploadDocRow = {
      id: nextId,
      docType: target.docType,
      fileName: file.name,
      pick: 0,
      file,
    };
    nextId += 1;
    return row;
  });

  return [
    ...rows.map((row) =>
      row.id === rowId ? { ...row, fileName: first.name, file: first } : row,
    ),
    ...extras,
  ];
}

/** Stamp React-held files onto FormData so Create does not depend on DataTransfer input.files. */
export function appendUploadRowFiles(
  form: FormData,
  rows: readonly Pick<UploadDocRow, "file">[],
): FormData {
  rows.forEach((row, index) => {
    form.delete(`files_${index}`);
    form.delete(`file_${index}`);
    if (row.file) form.set(`files_${index}`, row.file);
  });
  form.set("rowCount", String(rows.length));
  return form;
}

export function filesToSave(
  rows: readonly Pick<UploadDocRow, "docType" | "file">[],
): { docType: string; file: File }[] {
  return rows.flatMap((row) => (row.file ? [{ docType: row.docType, file: row.file }] : []));
}

/**
 * One file per server action. Multi-pick must not pack files_0..N into a single
 * FormData(form) payload — Next drops extra File parts / empty DataTransfer stamps
 * and saveDealDocuments then returns documents-save-failed.
 */
export function buildDealDocumentRowForm(input: {
  dealId: string;
  riskId?: string | null;
  line?: string | null;
  quotingForm?: string | null;
  productInstance?: string | null;
  docType: string;
  file: File;
}): FormData {
  const form = new FormData();
  form.set("dealId", input.dealId);
  if (input.riskId) form.set("riskId", input.riskId);
  if (input.line) form.set("line", input.line);
  if (input.quotingForm) form.set("quotingForm", input.quotingForm);
  if (input.productInstance) form.set("productInstance", input.productInstance);
  form.set("rowCount", "1");
  form.set("docType_0", input.docType);
  form.set("files_0", input.file);
  return form;
}

export function uploadRowsHaveFiles(rows: readonly Pick<UploadDocRow, "file">[]): boolean {
  return rows.some((row) => Boolean(row.file));
}

export function uploadRowsTotalBytes(rows: readonly Pick<UploadDocRow, "file">[]): number {
  return rows.reduce((sum, row) => sum + (row.file?.size ?? 0), 0);
}
