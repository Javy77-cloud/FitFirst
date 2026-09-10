/**
 * Honest Fill toast — successful skip-heavy runs still say what happened.
 * Keep under flash resolveFlashMessage 80-char cap.
 */
export function toastForFillCounts(args: {
  filledCount: number;
  skippedCount: number;
  /** Optional enrichment sources (e.g. NHTSA vPIC) appended when present. */
  sources?: string[];
}): string {
  const filled = Math.max(0, args.filledCount);
  const skipped = Math.max(0, args.skippedCount);
  const src = [...new Set((args.sources ?? []).map((s) => s.trim()).filter(Boolean))];
  const srcBit = src.length ? ` · ${src.join(" + ")}` : "";
  if (filled === 0 && skipped === 0) {
    const empty = `Parsed source. No fields to fill.${srcBit}`;
    return empty.length <= 80 ? empty : empty.slice(0, 80);
  }
  const base = `Filled ${filled}, skipped ${skipped} already on sheet${srcBit}`;
  return base.length <= 80 ? base : base.slice(0, 80);
}
