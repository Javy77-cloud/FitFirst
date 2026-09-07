/** Manual carrier add is stored on quote_attempt_logs.why — no schema change. */

export const MANUAL_MARKET_MARKER = "[manual]";

export type MarketBucket = "appetite" | "stretch" | "skip";

export function isManualMarketWhy(why: string | null | undefined): boolean {
  return (why ?? "").includes(MANUAL_MARKET_MARKER);
}

export function manualCarrierIdsFromLogs(
  logs: { carrierId: string; why?: string | null }[],
): string[] {
  const ids = new Set<string>();
  for (const log of logs) {
    if (isManualMarketWhy(log.why)) ids.add(log.carrierId);
  }
  return [...ids];
}

export function bucketForMatch(band: "green" | "yellow" | "red", manual: boolean): MarketBucket {
  if (manual || band === "green") return "appetite";
  if (band === "yellow") return "stretch";
  return "skip";
}

export function marketBucketLabel(bucket: MarketBucket): string {
  if (bucket === "appetite") return "In appetite";
  if (bucket === "stretch") return "Stretch";
  return "Skip";
}

/**
 * True only after the agent added a carrier or ran a lookup/shop.
 * Auto-evaluated evaluateDeal matches are not lookup data.
 */
export function hasMarketLookupData(
  matches: { carrierId: string }[],
  manualIds: string[] = [],
  explicitLookup = false,
): boolean {
  void matches;
  return manualIds.length > 0 || explicitLookup;
}

const SHEET_LOOKUP_IGNORE = new Set(["sheet_product"]);

/** Risk facts that mean the agent entered data — not schema defaults like state=FL. */
export function riskHasMarketFacts(risk: {
  coverageA?: number | null;
  yearBuilt?: number | null;
  roofYear?: number | null;
  milesToCoast?: number | null;
  stories?: number | null;
  replacementCostEstimate?: number | null;
  squareFeet?: number | null;
  address1?: string | null;
  city?: string | null;
  county?: string | null;
  zip?: string | null;
  construction?: string | null;
  occupancy?: string | null;
  roofCovering?: string | null;
  openingProtection?: string | null;
  protectionClass?: string | null;
} | null | undefined): boolean {
  if (!risk) return false;
  const nums = [
    risk.coverageA,
    risk.yearBuilt,
    risk.roofYear,
    risk.milesToCoast,
    risk.stories,
    risk.replacementCostEstimate,
    risk.squareFeet,
  ];
  if (nums.some((n) => n != null && Number.isFinite(n) && n !== 0)) return true;
  const texts = [
    risk.address1,
    risk.city,
    risk.county,
    risk.zip,
    risk.construction,
    risk.occupancy,
    risk.roofCovering,
    risk.openingProtection,
    risk.protectionClass,
  ];
  return texts.some((value) => Boolean(value?.trim()));
}

export function sheetHasMarketFacts(
  values?: Record<string, { value?: string | null } | null> | null,
): boolean {
  if (!values) return false;
  return Object.entries(values).some(([key, cell]) => {
    if (SHEET_LOOKUP_IGNORE.has(key)) return false;
    return Boolean(cell?.value?.trim());
  });
}

/** True only when the deal has entered risk/sheet facts worth evaluating. */
export function hasMarketLookupInput(
  risk: Parameters<typeof riskHasMarketFacts>[0],
  sheetValues?: Record<string, { value?: string | null } | null> | null,
): boolean {
  return riskHasMarketFacts(risk) || sheetHasMarketFacts(sheetValues);
}
