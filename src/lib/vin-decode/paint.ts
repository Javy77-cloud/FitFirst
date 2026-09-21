/**
 * Push a server-filled vehicle fact into an empty Risk Profile input.
 * A value the agent already typed stays put.
 */
export function valueToPaint(domValue: string, serverValue: string): string | null {
  const server = serverValue.trim();
  if (!server) return null;
  if (domValue.trim()) return null;
  return server;
}

/** Write decoded facts into the open Risk Profile inputs (empty cells only). */
export function paintSheetInputs(filled: Array<{ sheetKey: string; value: string }>): void {
  if (typeof document === "undefined") return;
  for (const fact of filled) {
    const el = document.getElementById(`ff-sheet-input-${fact.sheetKey}`);
    if (
      !(el instanceof HTMLInputElement) &&
      !(el instanceof HTMLTextAreaElement) &&
      !(el instanceof HTMLSelectElement)
    ) {
      continue;
    }
    const next = valueToPaint(el.value, fact.value);
    if (next != null) el.value = next;
  }
}
