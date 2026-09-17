import { appointmentLine } from "@/lib/domain";
import { matchLifeMatrixCarrier } from "@/lib/life/carriers";
import { normalizeRiskOutcome } from "@/lib/quotes/outcomes";

export const LIFE_HEALTH_QUOTE_OUTCOMES = [
  "bindable",
  "conditional",
  "declined",
  "no_market",
] as const;

export type LifeHealthQuoteOutcome = (typeof LIFE_HEALTH_QUOTE_OUTCOMES)[number];

export type LifeHealthQuoteCarrier = {
  id: string;
  name: string;
  writtenLines?: string[] | null;
};

/** Explicit LIFE/HEALTH writers, then MATRIX-matched names. Empty writtenLines do not count. */
export function lifeHealthQuoteCarriers(
  carriers: readonly LifeHealthQuoteCarrier[],
  dealLine: string,
): LifeHealthQuoteCarrier[] {
  const want = appointmentLine(dealLine);
  const explicit = carriers.filter((carrier) =>
    (carrier.writtenLines ?? []).some((line) => appointmentLine(line) === want),
  );
  if (explicit.length) return explicit;
  if (want === "LIFE") {
    return carriers.filter((carrier) => Boolean(matchLifeMatrixCarrier(carrier.name)));
  }
  return [];
}

export function parseLifeHealthQuoteOutcome(raw: string | null | undefined): LifeHealthQuoteOutcome {
  const normalized = normalizeRiskOutcome(raw);
  if (normalized) return normalized;
  return "conditional";
}

export function parseLifeHealthPremium(raw: string | null | undefined): string | null {
  const cleaned = String(raw ?? "").replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export function parseLifeHealthFaceAmount(raw: string | null | undefined): number | null {
  const cleaned = String(raw ?? "").replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}
