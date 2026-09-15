import { formatMoney } from "@/lib/domain";
import { appointmentLine } from "@/lib/domain-ams";
import {
  inferQuoteOutcomes,
  normalizeRiskOutcome,
  riskOutcomeLabel,
  type RiskOutcome,
} from "@/lib/quotes/outcomes";
import type { Carrier, Deal, Quote, QuoteAttemptLog, Risk } from "@/lib/db/schema";

export type AppetiteTrainingRow = {
  log: QuoteAttemptLog;
  carrier: Carrier;
  deal: Deal;
  risk: Risk | null;
  quote: Quote | null;
};

/** Canonical training sheets — partitioned by quote_attempt_logs.line_of_business. */
export const APPETITE_LINE_TABS = [
  { key: "HO", label: "Home" },
  { key: "AUTO", label: "Auto" },
  { key: "RV", label: "RV" },
  { key: "BOAT", label: "Boat" },
  { key: "FLOOD", label: "Flood" },
  { key: "UMBRELLA", label: "Umbrella" },
  { key: "GL", label: "GL" },
  { key: "BOP", label: "BOP" },
  { key: "WC", label: "WC" },
  { key: "LIFE", label: "Life" },
  { key: "HEALTH", label: "Health" },
] as const;

export type AppetiteLineKey = (typeof APPETITE_LINE_TABS)[number]["key"];

export const DEFAULT_APPETITE_LINE: AppetiteLineKey = "HO";

const LINE_ALIASES: Record<AppetiteLineKey, string[]> = {
  HO: ["HO", "HO3", "HO5", "HO6", "HO8", "MH", "HOME", "HOMEOWNERS", "DP3"],
  AUTO: ["AUTO", "PA", "PERSONAL_AUTO", "MOTORCYCLE"],
  RV: ["RV", "TRAVEL_TRAILER", "CAMPER"],
  BOAT: ["BOAT", "WATERCRAFT", "YACHT", "YATCH"],
  FLOOD: ["FLOOD", "NFIP"],
  UMBRELLA: ["UMBRELLA", "PU", "PUP"],
  GL: ["GL", "CGL"],
  BOP: ["BOP"],
  WC: ["WC"],
  LIFE: ["LIFE"],
  HEALTH: ["HEALTH", "ACCIDENT"],
};

export function normalizeAppetiteLine(raw: string | null | undefined): AppetiteLineKey {
  if (!raw?.trim()) return DEFAULT_APPETITE_LINE;
  const canon = appointmentLine(raw.trim());
  const upper = canon.toUpperCase();
  for (const tab of APPETITE_LINE_TABS) {
    if (tab.key === upper) return tab.key;
    if (LINE_ALIASES[tab.key].includes(upper)) return tab.key;
  }
  // Unknown codes still partition — fall back to Home so the sheet is always line-scoped.
  return DEFAULT_APPETITE_LINE;
}

/** Values stored on quote_attempt_logs.line_of_business that belong to this sheet. */
export function lineOfBusinessValuesForSheet(line: AppetiteLineKey): string[] {
  return LINE_ALIASES[line] ?? [line];
}

export function appetiteLineLabel(line: AppetiteLineKey): string {
  return APPETITE_LINE_TABS.find((t) => t.key === line)?.label ?? line;
}

export const APPETITE_DATASHEET_HEADERS = [
  "Date",
  "Carrier",
  "Line",
  "Outcome",
  "Result",
  "Bindable",
  "Premium",
  "Cov A tried",
  "Cov A forced",
  "Address/city/county",
  "Year built",
  "Roof year",
  "Roof covering",
  "Construction",
  "Occupancy",
  "Stories",
  "Pool",
  "Protection class",
  "Miles to coast",
  "Coverage A snap",
  "Portal Why",
  "Deal link",
  "Deal title",
] as const;

export type AppetiteDatasheetFilters = {
  /** Required partition key — defaults to Home (HO). */
  line: AppetiteLineKey;
  carrierId?: string;
  county?: string;
  result?: string;
  yearBuiltMin?: number;
  yearBuiltMax?: number;
};

export function parseAppetiteDatasheetFilters(
  query: Record<string, string | string[] | undefined>,
): AppetiteDatasheetFilters {
  const one = (key: string) => {
    const v = query[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const num = (key: string) => {
    const raw = one(key);
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    line: normalizeAppetiteLine(one("line")),
    carrierId: one("carrier"),
    county: one("county"),
    result: one("result"),
    yearBuiltMin: num("yearMin"),
    yearBuiltMax: num("yearMax"),
  };
}

export function outcomeForTrainingRow(row: AppetiteTrainingRow): {
  outcome: RiskOutcome | null;
  label: string;
} {
  const linked = normalizeRiskOutcome(row.quote?.riskOutcome);
  if (linked) return { outcome: linked, label: riskOutcomeLabel(linked) };
  const inferred = inferQuoteOutcomes({
    notes: row.log.why,
    result: row.log.result,
    bindable: row.log.bindable,
    premium: row.log.premium,
  });
  return { outcome: inferred.riskOutcome, label: riskOutcomeLabel(inferred.riskOutcome) };
}

export function addressCityCounty(row: AppetiteTrainingRow): string {
  const parts = [
    row.risk?.address1?.trim() || null,
    row.log.snapCity?.trim() || row.risk?.city?.trim() || null,
    row.log.snapCounty?.trim() || row.risk?.county?.trim() || null,
  ].filter(Boolean);
  return parts.join(", ");
}

export function blankNum(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

export function blankText(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "";
}

export function poolLabel(value: boolean | null | undefined): string {
  if (value == null) return "";
  return value ? "Y" : "N";
}

export function milesLabel(value: number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

export function dealPath(dealId: string): string {
  return `/deals/${dealId}`;
}

/** Display cells for the wide datasheet (no inventing — blanks when sparse). Home-rich columns first. */
export function datasheetDisplay(row: AppetiteTrainingRow) {
  const { label: outcomeLabel } = outcomeForTrainingRow(row);
  return {
    date: row.log.attemptedAt.toISOString().slice(0, 10),
    carrier: row.carrier.name,
    line: blankText(row.log.lineOfBusiness) || "HO",
    outcome: outcomeLabel,
    result: row.log.result.replaceAll("_", " "),
    bindable: row.log.bindable ? "Y" : "N",
    premium: formatMoney(row.log.premium),
    covATried: row.log.covATried != null ? formatMoney(row.log.covATried) : "",
    covAForced: row.log.covAForced != null ? formatMoney(row.log.covAForced) : "",
    address: addressCityCounty(row),
    yearBuilt: blankNum(row.log.snapYearBuilt),
    roofYear: blankNum(row.log.snapRoofYear),
    roofCovering: blankText(row.log.snapRoofCovering),
    construction: blankText(row.log.snapConstruction),
    occupancy: blankText(row.log.snapOccupancy),
    stories: blankNum(row.log.snapStories),
    pool: poolLabel(row.log.snapPool),
    protectionClass: blankText(row.log.snapProtectionClass),
    milesToCoast: milesLabel(row.log.snapMilesToCoast),
    coverageASnap: blankNum(row.log.snapCoverageA),
    portalWhy: blankText(row.log.why),
    dealHref: dealPath(row.deal.id),
    dealTitle: row.deal.title,
  };
}

/** Raw CSV cell values (money as numbers when present). */
export function datasheetCsvCells(row: AppetiteTrainingRow): Array<string | number | boolean | null> {
  const d = datasheetDisplay(row);
  return [
    d.date,
    d.carrier,
    d.line,
    d.outcome,
    d.result,
    d.bindable,
    row.log.premium ?? "",
    row.log.covATried ?? "",
    row.log.covAForced ?? "",
    d.address,
    row.log.snapYearBuilt ?? "",
    row.log.snapRoofYear ?? "",
    d.roofCovering,
    d.construction,
    d.occupancy,
    row.log.snapStories ?? "",
    d.pool,
    d.protectionClass,
    row.log.snapMilesToCoast ?? "",
    row.log.snapCoverageA ?? "",
    d.portalWhy,
    d.dealHref,
    d.dealTitle,
  ];
}

export function summarizeTrainingRows(rows: AppetiteTrainingRow[]) {
  const byResult = new Map<string, number>();
  const carriers = new Set<string>();
  const deals = new Set<string>();
  for (const row of rows) {
    const key = row.log.result;
    byResult.set(key, (byResult.get(key) ?? 0) + 1);
    carriers.add(row.carrier.id);
    deals.add(row.deal.id);
  }
  return {
    total: rows.length,
    byResult: [...byResult.entries()].sort((a, b) => b[1] - a[1]),
    distinctCarriers: carriers.size,
    distinctDeals: deals.size,
  };
}

export function filtersToSearchParams(filters: AppetiteDatasheetFilters): string {
  const params = new URLSearchParams();
  params.set("line", filters.line);
  if (filters.carrierId) params.set("carrier", filters.carrierId);
  if (filters.county) params.set("county", filters.county);
  if (filters.result) params.set("result", filters.result);
  if (filters.yearBuiltMin != null) params.set("yearMin", String(filters.yearBuiltMin));
  if (filters.yearBuiltMax != null) params.set("yearMax", String(filters.yearBuiltMax));
  return `?${params.toString()}`;
}

/** Preserve secondary filters when switching line tabs. */
export function lineTabHref(line: AppetiteLineKey, filters: AppetiteDatasheetFilters): string {
  return `/settings/developer/appetite-log${filtersToSearchParams({ ...filters, line })}`;
}
