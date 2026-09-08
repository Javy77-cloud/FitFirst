/**
 * Honest Fill toast — successful skip-heavy runs still say what happened.
 * Keep under flash resolveFlashMessage 80-char cap.
 */
export function toastForFillCounts(args: {
  filledCount: number;
  skippedCount: number;
}): string {
  const filled = Math.max(0, args.filledCount);
  const skipped = Math.max(0, args.skippedCount);
  if (filled === 0 && skipped === 0) {
    return "Parsed source. No fields to fill.";
  }
  return `Filled ${filled}, skipped ${skipped} already on sheet`;
}
