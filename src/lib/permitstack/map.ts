import type { PropertyRecordsFact } from "@/lib/getparceldata/map";

export const PERMITSTACK_LABEL = "PermitStack";

export type PermitStackPermit = {
  category?: string | null;
  tags?: string[] | null;
  description_raw?: string | null;
  description?: string | null;
  date_filed?: unknown;
  date_issued?: unknown;
  date_completed?: unknown;
  status?: string | null;
};

export type PermitStackSignals = {
  has_roofing?: boolean | null;
  last_roofing_date?: string | null;
  has_hvac?: boolean | null;
  last_hvac_date?: string | null;
  has_plumbing?: boolean | null;
};

export type PermitStackHistoryPayload = {
  found?: boolean;
  total_matches?: number;
  summary?: {
    signals?: PermitStackSignals;
    categories?: Record<string, number>;
  };
  permits?: PermitStackPermit[];
};

const HVAC_DESC = /\b(hvac|air[\s-]?condit|heat[\s-]?pump|furnace|mini[\s-]?split|condenser)\b/i;
const WATER_HEATER_DESC =
  /\b(water[\s-]?heater|hot[\s-]?water[\s-]?(heater|tank)|hybrid[\s-]?water[\s-]?heater)\b/i;
const SKIP_STATUS = /\b(cancel(?:led)?|void(?:ed)?|denied|withdrawn|rejected)\b/i;

function currentMaxYear(): number {
  return new Date().getUTCFullYear() + 1;
}

export function yearFromPermitDate(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw > 1e11) {
      const d = new Date(raw);
      return validYear(d.getUTCFullYear());
    }
    if (raw >= 1900 && raw <= 2100) return validYear(Math.trunc(raw));
  }
  const s = String(raw).trim();
  if (!s) return "";
  const match = s.match(/^(\d{4})/);
  return match ? validYear(Number(match[1])) : "";
}

function validYear(year: number): string {
  if (!Number.isInteger(year) || year < 1900 || year > currentMaxYear()) return "";
  return String(year);
}

function normalizeCategory(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function permitText(permit: PermitStackPermit): string {
  const tags = Array.isArray(permit.tags) ? permit.tags.join(" ") : "";
  return [permit.description_raw, permit.description, tags].filter(Boolean).join(" ");
}

function permitUsable(permit: PermitStackPermit): boolean {
  return !SKIP_STATUS.test(permit.status ?? "");
}

function yearFromPermit(permit: PermitStackPermit): string {
  return (
    yearFromPermitDate(permit.date_completed) ||
    yearFromPermitDate(permit.date_issued) ||
    yearFromPermitDate(permit.date_filed)
  );
}

function latestYear(years: string[]): string {
  const nums = years.map((y) => Number(y)).filter((n) => Number.isFinite(n));
  if (!nums.length) return "";
  return String(Math.max(...nums));
}

function pushFact(facts: PropertyRecordsFact[], sheetKey: string, value: string) {
  if (!value) return;
  facts.push({
    fieldKey: sheetKey,
    sheetKey,
    value,
    sourceLabel: PERMITSTACK_LABEL,
    kind: "permit",
  });
}

function roofYearFromPermits(permits: PermitStackPermit[]): string {
  const years = permits
    .filter((p) => permitUsable(p) && normalizeCategory(p.category) === "ROOFING")
    .map(yearFromPermit)
    .filter(Boolean);
  return latestYear(years);
}

function hvacYearFromPermits(permits: PermitStackPermit[]): string {
  const years: string[] = [];
  for (const permit of permits) {
    if (!permitUsable(permit)) continue;
    const category = normalizeCategory(permit.category);
    const text = permitText(permit);
    const hvacCategory = category === "HVAC";
    const mechanicalHvac = category === "MECHANICAL" && HVAC_DESC.test(text);
    if (!hvacCategory && !mechanicalHvac) continue;
    const year = yearFromPermit(permit);
    if (year) years.push(year);
  }
  return latestYear(years);
}

function waterHeaterYearFromPermits(permits: PermitStackPermit[]): string {
  const years: string[] = [];
  for (const permit of permits) {
    if (!permitUsable(permit)) continue;
    const category = normalizeCategory(permit.category);
    const text = permitText(permit);
    const dedicated = category === "WATER_HEATER" || category === "WATERHEATER";
    const plumbingWh = (category === "PLUMBING" || category === "MECHANICAL") && WATER_HEATER_DESC.test(text);
    if (!dedicated && !plumbingWh) continue;
    const year = yearFromPermit(permit);
    if (year) years.push(year);
  }
  return latestYear(years);
}

/**
 * Map PermitStack property history onto roof / HVAC / water-heater years.
 * Ambiguous plumbing or mechanical rows are skipped for Gemini/docs.
 */
export function factsFromPermitHistory(
  payload: PermitStackHistoryPayload | null | undefined,
): PropertyRecordsFact[] {
  if (!payload || payload.found === false) return [];
  const permits = Array.isArray(payload.permits) ? payload.permits : [];
  const signals = payload.summary?.signals ?? {};
  const facts: PropertyRecordsFact[] = [];

  const roofYear =
    (signals.has_roofing !== false ? yearFromPermitDate(signals.last_roofing_date) : "") ||
    roofYearFromPermits(permits);
  pushFact(facts, "roof_year", roofYear);

  const hvacYear =
    (signals.has_hvac !== false ? yearFromPermitDate(signals.last_hvac_date) : "") ||
    hvacYearFromPermits(permits);
  pushFact(facts, "hvac_year", hvacYear);

  pushFact(facts, "water_heater_year", waterHeaterYearFromPermits(permits));
  return facts;
}

export function summarizePermitStackFill(factCount: number): string {
  if (!factCount) return "PermitStack returned no confident system years.";
  return `PermitStack returned ${factCount} field(s) for empty-only fill.`;
}
