/** Year built / roof year from master sheet or risk — policy detail fallback when risk is null. */

import { displayConstructionType } from "@/lib/quote-sheet/sheet-defaults";

export type DwellingFacts = {
  yearBuilt: number | null;
  roofYear: number | null;
  construction: string | null;
  occupancy: string | null;
};

function cell(
  sheet: Record<string, { value?: string | null } | undefined> | null | undefined,
  ...keys: string[]
): string {
  if (!sheet) return "";
  for (const key of keys) {
    const hit = String(sheet[key]?.value ?? "").trim();
    if (hit) return hit;
  }
  return "";
}

export function parsePropertyYear(
  raw: string | number | null | undefined,
  nowYear = new Date().getUTCFullYear(),
): number | null {
  if (raw == null || raw === "") return null;
  const text = String(raw).trim();
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.length >= 4) {
    const asYear = Number(digits.slice(0, 4));
    if (Number.isFinite(asYear) && asYear >= 1800 && asYear <= 2100) return asYear;
  }
  const age = Number(digits);
  if (Number.isFinite(age) && age >= 0 && age <= 200 && /\bage\b|\byrs?\b|\byears?\b/i.test(text)) {
    return nowYear - age;
  }
  // Printed Year of Construction "24" / "'24" is 2024. A future two-digit year is the 1900s.
  if (digits.length === 2) {
    const yy = Number(digits);
    const contemporary = 2000 + yy;
    const year = contemporary > nowYear + 1 ? 1900 + yy : contemporary;
    if (year >= 1800 && year <= 2100) return year;
  }
  return null;
}

export function dwellingFactsFromSheet(
  sheet: Record<string, { value?: string | null } | undefined> | null | undefined,
): DwellingFacts {
  return {
    yearBuilt: parsePropertyYear(
      cell(sheet, "year_built", "yearBuilt", "yr_built", "year_of_construction", "year_constructed"),
    ),
    roofYear: parsePropertyYear(cell(sheet, "roof_year", "roofYear", "roof_age", "year_roof")),
    construction:
      cell(
        sheet,
        "construction",
        "construction_type",
        "type_of_construction",
        "const_type",
      ) || null,
    occupancy: cell(sheet, "occupancy") || null,
  };
}

export function resolveDwellingFacts(input: {
  risk?: {
    yearBuilt?: number | null;
    roofYear?: number | null;
    construction?: string | null;
    occupancy?: string | null;
  } | null;
  sheet?: Record<string, { value?: string | null } | undefined> | null;
}): DwellingFacts {
  const fromSheet = dwellingFactsFromSheet(input.sheet);
  const construction = input.risk?.construction?.trim() || fromSheet.construction;
  return {
    yearBuilt: input.risk?.yearBuilt ?? fromSheet.yearBuilt,
    roofYear: input.risk?.roofYear ?? fromSheet.roofYear,
    construction: displayConstructionType(construction) || null,
    occupancy: input.risk?.occupancy?.trim() || fromSheet.occupancy,
  };
}

export type DwellingCellSheet = Record<string, { value?: string | null } | undefined>;

/** DEC / quote-sheet keys Overview may use for Year built, Construction type, and Occupancy. */
export const DWELLING_EXTRACT_FIELD_KEYS = [
  "year_built",
  "year_of_construction",
  "year_constructed",
  "yr_built",
  "construction_year",
  "construction",
  "construction_type",
  "type_of_construction",
  "const_type",
  "occupancy",
] as const;

export type PolicyDwellingSnapshot = {
  year_built?: string;
  construction?: string;
  occupancy?: string;
};

function trimmedCell(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

/** Dwelling facts stored beside wind-mit values on policies.property_protection. */
export function dwellingSnapshotFromProtection(raw: unknown): PolicyDwellingSnapshot {
  if (!raw || typeof raw !== "object") return {};
  const dwelling = (raw as { dwelling?: unknown }).dwelling;
  if (!dwelling || typeof dwelling !== "object" || Array.isArray(dwelling)) return {};
  const blob = dwelling as Record<string, unknown>;
  const out: PolicyDwellingSnapshot = {};
  const year = trimmedCell(blob.year_built);
  const construction = trimmedCell(blob.construction);
  const occupancy = trimmedCell(blob.occupancy);
  if (year) out.year_built = year;
  if (construction) out.construction = construction;
  if (occupancy) out.occupancy = occupancy;
  return out;
}

export function sheetFromDwellingSnapshot(snapshot: PolicyDwellingSnapshot): DwellingCellSheet {
  const out: DwellingCellSheet = {};
  if (snapshot.year_built) out.year_built = { value: snapshot.year_built };
  if (snapshot.construction) out.construction = { value: snapshot.construction };
  if (snapshot.occupancy) out.occupancy = { value: snapshot.occupancy };
  return out;
}

export function sheetFromExtractedDwellingFields(
  rows: readonly {
    fieldKey?: string | null;
    normalizedValue?: string | null;
    rawValue?: string | null;
    createdAt?: Date | string | null;
  }[],
): DwellingCellSheet {
  const allowed = new Set<string>(DWELLING_EXTRACT_FIELD_KEYS);
  const ranked = [...rows].sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });
  const out: DwellingCellSheet = {};
  for (const row of ranked) {
    const key = String(row.fieldKey ?? "").trim();
    if (!allowed.has(key)) continue;
    if (trimmedCell(out[key]?.value)) continue;
    const value = trimmedCell(row.normalizedValue) || trimmedCell(row.rawValue);
    if (!value) continue;
    out[key] = { value };
  }
  return out;
}

/** First non-empty cell wins. Pass the quote sheet, then the policy snapshot, then the DEC extract. */
export function mergeDwellingSheets(
  ...sheets: Array<DwellingCellSheet | null | undefined>
): DwellingCellSheet {
  const out: DwellingCellSheet = {};
  for (const sheet of sheets) {
    if (!sheet) continue;
    for (const [key, cell] of Object.entries(sheet)) {
      const value = trimmedCell(cell?.value);
      if (!value) continue;
      if (trimmedCell(out[key]?.value)) continue;
      out[key] = { value };
    }
  }
  return out;
}

export function overviewDwellingSheet(input: {
  sheet?: DwellingCellSheet | null;
  protection?: unknown;
  extracted?: readonly {
    fieldKey?: string | null;
    normalizedValue?: string | null;
    rawValue?: string | null;
    createdAt?: Date | string | null;
  }[];
}): DwellingCellSheet | null {
  const merged = mergeDwellingSheets(
    input.sheet,
    sheetFromDwellingSnapshot(dwellingSnapshotFromProtection(input.protection)),
    sheetFromExtractedDwellingFields(input.extracted ?? []),
  );
  return Object.keys(merged).length ? merged : null;
}

type ProtectionWithDwelling = {
  values?: Record<string, string>;
  dwelling?: PolicyDwellingSnapshot;
  updatedAt?: string | null;
  source?: "mint" | "dec_transfer" | "sheet" | "gemini" | "merge" | null;
};

/**
 * Keep wind-mit values and add Year built / Construction / Occupancy.
 * A book policy with no deal and no risk still has a place Overview can read.
 */
export function propertyProtectionWithDwelling(
  existing: unknown,
  input: {
    protection?: Record<string, string>;
    yearBuilt?: number | null;
    construction?: string | null;
    occupancy?: string | null;
    updatedAt?: string;
    source?: ProtectionWithDwelling["source"];
  },
): ProtectionWithDwelling | null {
  const incoming: PolicyDwellingSnapshot = {};
  if (input.yearBuilt != null && Number.isFinite(input.yearBuilt)) {
    incoming.year_built = String(input.yearBuilt);
  }
  const construction = trimmedCell(input.construction);
  const occupancy = trimmedCell(input.occupancy);
  if (construction) incoming.construction = construction;
  if (occupancy) incoming.occupancy = occupancy;
  const protection = input.protection ?? {};
  const protectionKeys = Object.keys(protection).filter((key) => trimmedCell(protection[key]));
  if (!Object.keys(incoming).length && protectionKeys.length === 0) return null;

  const previous =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as ProtectionWithDwelling)
      : {};
  const prevValues =
    previous.values && typeof previous.values === "object" && !Array.isArray(previous.values)
      ? previous.values
      : {};
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(prevValues)) {
    const trimmed = trimmedCell(value);
    if (trimmed) values[key] = trimmed;
  }
  for (const key of protectionKeys) values[key] = trimmedCell(protection[key]);
  return {
    values,
    dwelling: { ...dwellingSnapshotFromProtection(existing), ...incoming },
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    source: input.source ?? previous.source ?? "gemini",
  };
}
