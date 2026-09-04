/** Stable row index for list sheets. Same value on the server and the first client paint. */
export function sheetIndexValue(
  existing: string | number | null | undefined,
  index: number,
): string {
  if (existing === 0 || existing === "0") return "0";
  if (existing == null || existing === "") return String(index);
  return String(existing);
}
