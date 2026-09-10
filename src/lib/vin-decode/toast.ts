import { NHTSA_VPIC_LABEL } from "./types";

/** Keep under flash resolveFlashMessage 80-char cap. */
export function toastForVinDecode(args: {
  filledCount: number;
  skippedCount: number;
  vinCount?: number;
}): string {
  const filled = Math.max(0, args.filledCount);
  const skipped = Math.max(0, args.skippedCount);
  if (filled === 0 && skipped === 0) {
    return `No VIN fields to fill from ${NHTSA_VPIC_LABEL}.`;
  }
  if (filled === 0) {
    return `${NHTSA_VPIC_LABEL}: nothing blank to fill (${skipped} kept).`;
  }
  const base = `Filled ${filled} from ${NHTSA_VPIC_LABEL}`;
  return base.length <= 80 ? base : base.slice(0, 80);
}
