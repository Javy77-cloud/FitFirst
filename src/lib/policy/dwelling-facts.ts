/** Year built / roof year from master sheet or risk — policy detail fallback when risk is null. */

export type DwellingFacts = {
  yearBuilt: number | null;
  roofYear: number | null;
  construction: string | null;
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
    construction: cell(sheet, "construction", "construction_type") || null,
  };
}

export function resolveDwellingFacts(input: {
  risk?: {
    yearBuilt?: number | null;
    roofYear?: number | null;
    construction?: string | null;
  } | null;
  sheet?: Record<string, { value?: string | null } | undefined> | null;
}): DwellingFacts {
  const fromSheet = dwellingFactsFromSheet(input.sheet);
  return {
    yearBuilt: input.risk?.yearBuilt ?? fromSheet.yearBuilt,
    roofYear: input.risk?.roofYear ?? fromSheet.roofYear,
    construction: input.risk?.construction?.trim() || fromSheet.construction,
  };
}
