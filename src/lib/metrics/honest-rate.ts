/** Honest 0–1 rate, or null when a percent would be invented. */
export function honestRate(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0 || numerator < 0) return null;
  if (numerator > denominator) return null;
  return numerator / denominator;
}

/** Whole-number percent, or an em dash when the ratio is not instrumented. */
export function formatHonestPct(numerator: number, denominator: number): string {
  const rate = honestRate(numerator, denominator);
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

/** One-decimal percent used by carrier / hit-lost tiles. */
export function formatHonestPctTenth(numerator: number, denominator: number): number | null {
  const rate = honestRate(numerator, denominator);
  if (rate == null) return null;
  return Math.round(rate * 1000) / 10;
}
