import type { AppetiteRuleInput, FitBand, PriorAttempt, RiskSnapshot } from "@/lib/domain";
import { writesDealLine } from "@/lib/domain";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { riskFromQuoteSheet } from "@/lib/quote-sheet/risk-from-sheet";
import { firstWaveRank } from "./first-wave";
import { matchCarrier, type CarrierMatch } from "./match";

export type ShopFit = CarrierMatch & {
  firstWaveRank: number | null;
  writesLine: boolean;
};

export type ShopFitsResult = {
  matches: ShopFit[];
  shopThese: ShopFit[];
  skip: ShopFit[];
  risk: RiskSnapshot;
};

function bandOrder(band: FitBand): number {
  if (band === "green") return 0;
  if (band === "yellow") return 1;
  return 2;
}

/** First-wave order among fits (green/yellow). Skips stay after, reasons intact. */
export function rankFitsByFirstWave(matches: ShopFit[]): ShopFit[] {
  return [...matches].sort((a, b) => {
    const aFit = a.band === "red" ? 1 : 0;
    const bFit = b.band === "red" ? 1 : 0;
    if (aFit !== bFit) return aFit - bFit;
    if (aFit === 0) {
      const aWave = a.firstWaveRank ?? Number.POSITIVE_INFINITY;
      const bWave = b.firstWaveRank ?? Number.POSITIVE_INFINITY;
      if (aWave !== bWave) return aWave - bWave;
      if (bandOrder(a.band) !== bandOrder(b.band)) return bandOrder(a.band) - bandOrder(b.band);
      return b.fitScore - a.fitScore;
    }
    if (bandOrder(a.band) !== bandOrder(b.band)) return bandOrder(a.band) - bandOrder(b.band);
    return b.fitScore - a.fitScore;
  });
}

export function evaluateShopFits(input: {
  risk: RiskSnapshot;
  dealLine: string;
  rules: AppetiteRuleInput[];
  prior: PriorAttempt[];
  sheetValues?: Record<string, QuoteSheetFieldValue> | null;
  asOfYear?: number;
}): ShopFitsResult {
  const risk = riskFromQuoteSheet(input.risk, input.sheetValues);
  const writers = input.rules.filter((rule) => writesDealLine(rule.writtenLines, input.dealLine));

  const matches = rankFitsByFirstWave(
    writers.map((rule) => {
      const match = matchCarrier(risk, rule, input.prior, input.asOfYear);
      return {
        ...match,
        firstWaveRank: firstWaveRank(input.dealLine, rule.carrierId, rule.carrierName),
        writesLine: true,
      };
    }),
  );

  return {
    matches,
    shopThese: matches.filter((m) => m.band !== "red"),
    skip: matches.filter((m) => m.band === "red"),
    risk,
  };
}

export function shopCounts(matches: ShopFit[]): { green: number; yellow: number; skip: number } {
  return {
    green: matches.filter((m) => m.band === "green").length,
    yellow: matches.filter((m) => m.band === "yellow").length,
    skip: matches.filter((m) => m.band === "red").length,
  };
}
