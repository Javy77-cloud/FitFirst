import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { SheetProduct } from "./products";
import { extractKeyToSheetKey, fieldsForLine } from "./catalog";
import {
  COVERAGE_A_RCE_LABEL,
  COVERAGE_B_OPTIONS,
  COVERAGE_C_OPTIONS,
  COVERAGE_D_OPTIONS,
  COVERAGE_E_OPTIONS,
  COVERAGE_F_OPTIONS,
  HOME_COVERAGE_DEFAULTS,
  ORDINANCE_OR_LAW_OPTIONS,
  SHEET_DEFAULT_SOURCE_LABEL,
  normalizeWaterBackup,
  normalizeWindHailDeductible,
} from "./sheet-defaults";

export { COVERAGE_A_RCE_LABEL, HOME_COVERAGE_DEFAULTS };

type SheetBag = Record<string, QuoteSheetFieldValue>;

const COVERAGE_E_BY_AMOUNT: Record<string, (typeof COVERAGE_E_OPTIONS)[number]> = {
  "0": "$0",
  "100000": "$100k",
  "200000": "$200k",
  "300000": "$300k",
  "400000": "$400k",
  "500000": "$500k",
  "1000000": "$1M",
};

const COVERAGE_F_BY_AMOUNT: Record<string, (typeof COVERAGE_F_OPTIONS)[number]> = {
  "0": "$0",
  "1000": "$1k",
  "2000": "$2k",
  "3000": "$3k",
  "4000": "$4k",
  "5000": "$5k",
  "10000": "$10k",
};

/** Facts a declaration can print. Used to tell a dec extract from a wind-mit photo. */
const HOME_COVERAGE_FACT_KEYS = new Set<string>([
  "coverage_a",
  "coverage_b",
  "coverage_c",
  "coverage_d",
  "coverage_e",
  "coverage_f",
  "ordinance_or_law",
  "water_backup",
  "hurricane_deductible",
  "aop_deductible",
  "wind_hail_deductible",
  "sinkhole_deductible",
]);

const PERCENT_FIELDS: Record<string, readonly string[]> = {
  coverage_b: COVERAGE_B_OPTIONS,
  coverage_c: COVERAGE_C_OPTIONS,
  coverage_d: COVERAGE_D_OPTIONS,
  ordinance_or_law: ORDINANCE_OR_LAW_OPTIONS,
};

function isBlank(field?: { value?: string; status?: string } | null): boolean {
  if (!field) return true;
  return (field.value ?? "").trim() === "" || field.status === "missing";
}

function formatPercent(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return `${raw}%`;
  return `${Number(n.toFixed(2))}%`.replace(/\.0+%$/, "%").replace(/(\.\d*?)0+%$/, "$1%");
}

function moneyAmount(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const compact = text.toLowerCase().replace(/[$,\s]/g, "");
  const millions = compact.match(/^(\d+(?:\.\d+)?)m$/);
  if (millions) return Math.round(Number(millions[1]) * 1_000_000);
  const thousands = compact.match(/^(\d+(?:\.\d+)?)k$/);
  if (thousands) return Math.round(Number(thousands[1]) * 1000);
  if (!/\d/.test(text)) return null;
  const n = Number(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function percentOfCoverageA(
  amount: number,
  coverageA: number,
  options: readonly string[],
): string | null {
  if (!coverageA || coverageA <= 0 || amount < 0) return null;
  const pct = (amount / coverageA) * 100;
  for (const option of options) {
    const band = Number(option.replace("%", ""));
    if (Number.isFinite(band) && Math.abs(pct - band) < 0.051) return option;
  }
  return null;
}

/** Snap a printed percent or an exact percent-of-A dollar limit onto the dropdown. Off-list values stay copied. */
export function normalizeCoveragePercent(
  raw: string | null | undefined,
  options: readonly string[],
  coverageA: number | null,
): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const direct = options.find((option) => option.toLowerCase() === text.toLowerCase());
  if (direct) return direct;
  const percent = text.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)$/i);
  if (percent) {
    const token = formatPercent(percent[1]);
    return options.find((option) => option === token) ?? token;
  }
  const amount = moneyAmount(text);
  if (amount == null) return text;
  if (amount <= 100 && !/[k$]/i.test(text) && amount < 1000) {
    const token = formatPercent(String(amount));
    if (options.includes(token)) return token;
  }
  if (coverageA) {
    const matched = percentOfCoverageA(amount, coverageA, options);
    if (matched) return matched;
  }
  return String(amount);
}

function normalizeLimitBand(
  raw: string | null | undefined,
  options: readonly string[],
  byAmount: Record<string, string>,
): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const direct = options.find((option) => option.toLowerCase() === text.toLowerCase());
  if (direct) return direct;
  const amount = moneyAmount(text);
  if (amount == null) return text;
  return byAmount[String(amount)] ?? String(amount);
}

/** Dwelling limit from the declaration. Empty when the page did not print one. */
export function normalizeCoverageAAmount(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text || /%|percent/i.test(text)) return "";
  const amount = moneyAmount(text);
  if (amount == null) return "";
  return String(amount);
}

export function normalizeCoverageE(raw: string | null | undefined): string {
  return normalizeLimitBand(raw, COVERAGE_E_OPTIONS, COVERAGE_E_BY_AMOUNT);
}

export function normalizeCoverageF(raw: string | null | undefined): string {
  return normalizeLimitBand(raw, COVERAGE_F_OPTIONS, COVERAGE_F_BY_AMOUNT);
}

/** Plain sinkhole value. Percents stay percents. "No" stays "No". */
export function normalizeSinkholeDeductible(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  if (lower === "no" || lower === "none" || lower === "n/a" || lower === "na") return text;
  const percent = text.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)$/i);
  if (percent) return formatPercent(percent[1]);
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const n = Number(text);
    if (n >= 0 && n <= 100) return formatPercent(text);
  }
  return text;
}

function coverageAAmount(values: SheetBag): number | null {
  const digits = normalizeCoverageAAmount(values.coverage_a?.value ?? "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sheetProduct(values: SheetBag, product?: string | null): SheetProduct | undefined {
  const raw = (product ?? values.sheet_product?.value ?? "").trim();
  if (raw === "homeowners" || raw === "landlord" || raw === "renters") return raw;
  return undefined;
}

/** HO3 / HO5 / MHO and DP have Coverage A. Renters and liability-only sheets that lack the cell do not. */
export function sheetHasDwellingCoverageA(values: SheetBag, product?: string | null): boolean {
  const resolved = sheetProduct(values, product);
  if (resolved === "renters") return false;
  if (resolved === "homeowners" || resolved === "landlord") return true;
  return Object.prototype.hasOwnProperty.call(values, "coverage_a");
}

function catalogKeys(values: SheetBag, product?: string | null): Set<string> {
  const resolved = sheetProduct(values, product);
  return new Set(fieldsForLine("home", resolved).map((field) => field.key));
}

/**
 * Defaults run for a declarations / policy extract.
 * A wind-mit or four-point upload does not invent coverages.
 * A photo does only when the extract actually carried a coverage fact.
 */
export function shouldApplyHomeCoverageDefaults(
  docType: string | null | undefined,
  extractedSheetKeys: Iterable<string>,
): boolean {
  const kind = (docType ?? "").trim().toLowerCase();
  if (kind && /wind/.test(kind) && !kind.includes("window")) return false;
  if (kind && /(?:four|4)[-\s_]?p(?:oin)?t|\b4pt\b/.test(kind)) return false;
  const sawCoverage = [...extractedSheetKeys].some((key) => HOME_COVERAGE_FACT_KEYS.has(key));
  if (!kind) return sawCoverage;
  if (/dec|polic|liabil|declar/.test(kind)) return true;
  if (kind.includes("photo")) return sawCoverage;
  return false;
}

export function extractedHomeCoverageKeys(
  extracted: readonly { fieldKey: string }[],
): string[] {
  const keys: string[] = [];
  for (const item of extracted) {
    const key = extractKeyToSheetKey("home", item.fieldKey) ?? item.fieldKey;
    if (HOME_COVERAGE_FACT_KEYS.has(key)) keys.push(key);
  }
  return keys;
}

/** A later declaration may replace a default we wrote. An agent-confirmed cell stays. */
export function isReplaceableHomeCoverageFill(
  key: string,
  field?: QuoteSheetFieldValue | null,
): boolean {
  if (!field || field.status === "confirmed" || field.source === "javy") return false;
  if (field.source === "agent" && field.sourceLabel !== SHEET_DEFAULT_SOURCE_LABEL) return false;
  if (field.sourceLabel === SHEET_DEFAULT_SOURCE_LABEL && key in HOME_COVERAGE_DEFAULTS) return true;
  if (key === "wind_hail_deductible" && (field.sourceLabel ?? "").includes("· AOP")) return true;
  return false;
}

function writeNormalized(values: SheetBag, key: string, next: string) {
  const current = values[key];
  if (!current || !next || next === current.value) return;
  values[key] = { ...current, value: next };
}

function copiedFromDocument(cell?: QuoteSheetFieldValue): boolean {
  if (!cell || isBlank(cell)) return false;
  return (
    cell.source === "extracted" ||
    cell.source === "photo-ocr" ||
    cell.source === "public" ||
    cell.source === "public-records" ||
    cell.source === "property-records"
  );
}

/** Map copied declaration amounts onto the dropdown tokens. Does not fill blanks or rewrite agent cells. */
export function normalizeHomeCoverageValues(values: SheetBag): void {
  if (copiedFromDocument(values.coverage_a)) {
    const next = normalizeCoverageAAmount(values.coverage_a.value);
    if (next) writeNormalized(values, "coverage_a", next);
  }
  const dwelling = coverageAAmount(values);
  for (const [key, options] of Object.entries(PERCENT_FIELDS)) {
    const cell = values[key];
    if (!copiedFromDocument(cell)) continue;
    const next = normalizeCoveragePercent(cell.value, options, dwelling);
    if (next) writeNormalized(values, key, next);
  }
  if (copiedFromDocument(values.coverage_e)) {
    const next = normalizeCoverageE(values.coverage_e.value);
    if (next) writeNormalized(values, "coverage_e", next);
  }
  if (copiedFromDocument(values.coverage_f)) {
    const next = normalizeCoverageF(values.coverage_f.value);
    if (next) writeNormalized(values, "coverage_f", next);
  }
  if (copiedFromDocument(values.water_backup)) {
    const next = normalizeWaterBackup(values.water_backup.value);
    if (next) writeNormalized(values, "water_backup", next);
  }
  if (copiedFromDocument(values.sinkhole_deductible)) {
    const next = normalizeSinkholeDeductible(values.sinkhole_deductible.value);
    if (next) writeNormalized(values, "sinkhole_deductible", next);
  }
}

function writeDefault(values: SheetBag, filledKeys: string[] | undefined, key: string, value: string) {
  values[key] = {
    value,
    status: "check",
    source: "agent",
    sourceLabel: SHEET_DEFAULT_SOURCE_LABEL,
  };
  if (filledKeys && !filledKeys.includes(key)) filledKeys.push(key);
}

/**
 * Fill B–F, ordinance, water backup, and sinkhole when the declaration left them blank.
 * Does not invent Coverage A, hurricane, or AOP.
 */
export function applyMissingHomeCoverageDefaults(
  values: SheetBag,
  filledKeys?: string[],
  product?: string | null,
): void {
  if (!sheetHasDwellingCoverageA(values, product)) return;
  const allowed = catalogKeys(values, product);
  for (const [key, value] of Object.entries(HOME_COVERAGE_DEFAULTS)) {
    if (!allowed.has(key)) continue;
    if (!(key in values) && !sheetHasDwellingCoverageA(values, product)) continue;
    if (!isBlank(values[key])) continue;
    writeDefault(values, filledKeys, key, value);
  }
}

/**
 * A dec with only an all-other-perils deductible has no separate wind/hail line.
 * Copy that AOP amount. A printed wind/hail value is left alone.
 */
export function applyWindHailAopFallback(values: SheetBag, filledKeys?: string[]): void {
  if (!isBlank(values.wind_hail_deductible)) return;
  if (!("wind_hail_deductible" in values) && !sheetHasDwellingCoverageA(values)) return;
  const aop = values.aop_deductible;
  const aopValue = aop?.value?.trim() ?? "";
  if (!aopValue || isBlank(aop)) return;
  const next = normalizeWindHailDeductible(aopValue);
  if (!next) return;
  const sourceLabel = (aop.sourceLabel ?? "").trim();
  const source = aop.source && aop.source !== "blank" ? aop.source : "extracted";
  values.wind_hail_deductible = {
    value: next,
    status: "check",
    source,
    sourceLabel: sourceLabel ? `${sourceLabel} · AOP` : "AOP deductible",
  };
  if (filledKeys && !filledKeys.includes("wind_hail_deductible")) filledKeys.push("wind_hail_deductible");
}

/**
 * After a home declaration extract: keep every printed coverage, default only the blanks,
 * then let wind/hail fall back to AOP. Coverage A stays empty when the page omitted it.
 */
export function finalizeHomeDeclarationCoverages(
  values: SheetBag,
  filledKeys: string[],
  docType: string | null | undefined,
  extracted: readonly { fieldKey: string }[],
): void {
  normalizeHomeCoverageValues(values);
  if (shouldApplyHomeCoverageDefaults(docType, extractedHomeCoverageKeys(extracted))) {
    applyMissingHomeCoverageDefaults(values, filledKeys);
  }
  applyWindHailAopFallback(values, filledKeys);
}

/**
 * Agent typed or changed Coverage A. Reset the standard coverages.
 * Hurricane and AOP stay as saved. Wind/hail keeps a printed value, otherwise follows AOP.
 */
export function reapplyDefaultsAfterManualCoverageA(
  before: SheetBag,
  after: SheetBag,
  product?: string | null,
): void {
  if (!sheetHasDwellingCoverageA(after, product)) return;
  const prior = normalizeCoverageAAmount(before.coverage_a?.value ?? "");
  const next = normalizeCoverageAAmount(after.coverage_a?.value ?? "");
  if (!next || next === prior) return;
  const allowed = catalogKeys(after, product);
  for (const [key, value] of Object.entries(HOME_COVERAGE_DEFAULTS)) {
    if (!allowed.has(key)) continue;
    writeDefault(after, undefined, key, value);
  }
  applyWindHailAopFallback(after);
}


/**
 * Risk Profile live string map after the agent edits Coverage A.
 * Always writes the new Coverage A. Reapplies B–F / ordinance / related
 * defaults only when the normalized Coverage A amount actually changes.
 */
export function liveValuesAfterManualCoverageA(
  prevLive: Record<string, string>,
  nextCoverageA: string,
  stored: SheetBag,
  product?: string | null,
  opts?: { reapply?: boolean },
): Record<string, string> {
  const reapply = opts?.reapply !== false;
  const nextLive: Record<string, string> = { ...prevLive, coverage_a: nextCoverageA };
  if (!reapply) return nextLive;

  const keys = new Set<string>([
    ...Object.keys(stored),
    ...Object.keys(prevLive),
    "coverage_a",
    ...Object.keys(HOME_COVERAGE_DEFAULTS),
    "wind_hail_deductible",
  ]);
  const before: SheetBag = {};
  const after: SheetBag = {};
  for (const key of keys) {
    const fromLive = Object.prototype.hasOwnProperty.call(prevLive, key)
      ? prevLive[key]
      : undefined;
    const cell = stored[key];
    const value = fromLive !== undefined ? fromLive : (cell?.value ?? "");
    const base: QuoteSheetFieldValue = cell
      ? { ...cell, value }
      : { value, status: "check", source: "agent" };
    before[key] = base;
    after[key] = { ...base };
  }
  after.coverage_a = {
    ...(after.coverage_a ?? { value: "", status: "check", source: "agent" }),
    value: nextCoverageA,
    source: after.coverage_a?.source === "javy" ? "javy" : "agent",
  };
  reapplyDefaultsAfterManualCoverageA(before, after, product);
  for (const key of Object.keys(HOME_COVERAGE_DEFAULTS)) {
    if (after[key]) nextLive[key] = after[key].value;
  }
  if (after.wind_hail_deductible) {
    nextLive.wind_hail_deductible = after.wind_hail_deductible.value;
  }
  return nextLive;
}
