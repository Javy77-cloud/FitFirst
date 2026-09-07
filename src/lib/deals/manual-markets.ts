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

/** True only after a lookup returned carriers or the agent added one. */
export function hasMarketLookupData(
  matches: { carrierId: string }[],
  manualIds: string[] = [],
): boolean {
  return matches.length > 0 || manualIds.length > 0;
}
