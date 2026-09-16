/**
 * Published carrier appetite used by Markets (appetite_rules) and the quote-gate catalog.
 * Add new carriers here — do not hardcode Trident-only checks in the matcher.
 */
export type PublishedHoAppetite = {
  slug: string;
  legalName: string;
  aliases: string[];
  /** Homeowners form (HO3, HO6, …). */
  line: string;
  state: string;
  minCovA: number | null;
  maxCovA: number | null;
  /** Rolling dwelling-age cap from the QRG ("40 yrs & newer"). */
  maxDwellingAgeYears: number | null;
  /** Fixed year for Markets `min_year_built` (QRG as-of year minus max dwelling age). */
  minYearBuilt: number | null;
  minMilesToCoast: number | null;
  maxRoofAge: number | null;
  allowedRoofCoverings: string[] | null;
  mobileAllowed: boolean;
  placement: string;
  csPhone: string | null;
  supportEmail: string | null;
  website: string;
  hardDeclines: string[];
  softCautions: string[];
  preferredSignals: string[];
  notesForAgent: string;
};

/** Trident Reciprocal Exchange HO-3 Quick Reference Guide. */
export const TRIDENT_QRG_VERSION = "06122026";
export const TRIDENT_QRG_AS_OF_YEAR = 2026;

export const TRIDENT_HO_NOTES =
  "NOW COVERING WIND DRIVEN RAIN. FL HO-3 via QuoteRUSH (www.tridentreciprocal.com). Contact (877)368-9144 / support@tridentreciprocal.com. Coverage A $300,000-$5,000,000 (was $400k; effective immediately). Broader Florida HO placement — re-shop risks previously below $400k. Cov B 2/5/10/15% (excl avail); Cov C 25/50/75% (excl avail); Cov D 10% of A; Liability 100/300/400/500k; Med Pay 2/3/4/5k. Deductibles: AOP 1k/2.5k/5k/10k; Hurricane 2/5/10% of A. Eligibility: dwelling 40 yrs & newer; roof Shingle 15 / Tile 20 / Metal 30; flat over living ineligible; flat reinforced concrete requires Cov A $900k+. PC10 ineligible; PC9 UW review. Distance to coast 1/2 mile or greater. Lapse +14 days requires UW review. HWH 15 yrs & newer if inside living (no age if garage/outside). Polybutylene ineligible; PEX no age. Electrical: no Challenger, Sylvania, Zinsco, or single-strand aluminum; multi-strand aluminum UW review. Loss history: <=2 non-hurricane claims in last 5 years, each <=$5k (exceptions available). Discounts: monitored burglar & fire alarm; wind loss mitigation; gated/limited access; HVAC maintenance contract. Enhancements: Ord/Law 10/25/50%; water backup & sump; screen enclosure; animal liability. QRG Version 06122026.";

export const TRIDENT_HO_APPETITE: PublishedHoAppetite = {
  slug: "trident_reciprocal",
  legalName: "Trident Reciprocal Exchange",
  aliases: ["trident reciprocal exchange", "trident reciprocal", "trident"],
  line: "HO3",
  state: "FL",
  minCovA: 300_000,
  maxCovA: 5_000_000,
  maxDwellingAgeYears: 40,
  minYearBuilt: TRIDENT_QRG_AS_OF_YEAR - 40,
  minMilesToCoast: 0.5,
  maxRoofAge: 15,
  allowedRoofCoverings: ["shingle", "tile", "metal"],
  mobileAllowed: false,
  placement: "QuoteRUSH",
  csPhone: "(877)368-9144",
  supportEmail: "support@tridentreciprocal.com",
  website: "https://www.tridentreciprocal.com",
  hardDeclines: [
    "state!=FL",
    "mobile_home",
    "min_cov_a:300000",
    "max_cov_a:5000000",
    "max_dwelling_age:40",
    "min_miles_to_coast:0.5",
    "pc:10",
  ],
  softCautions: ["older_roof", "pc:9"],
  preferredSignals: ["fl_single_family", "quoterush", "wind_mitigation", "newer_construction"],
  notesForAgent: TRIDENT_HO_NOTES,
};

export const PUBLISHED_HO_APPETITE: PublishedHoAppetite[] = [TRIDENT_HO_APPETITE];

export function publishedHoBySlug(slug: string): PublishedHoAppetite | undefined {
  return PUBLISHED_HO_APPETITE.find((row) => row.slug === slug);
}

export function minCovAToken(minCovA: number): string {
  return `min_cov_a:${minCovA}`;
}

export function maxCovAToken(maxCovA: number): string {
  return `max_cov_a:${maxCovA}`;
}

export function maxDwellingAgeToken(years: number): string {
  return `max_dwelling_age:${years}`;
}

export function minMilesToCoastToken(miles: number): string {
  return `min_miles_to_coast:${miles}`;
}

export function protectionClassToken(pc: number): string {
  return `pc:${pc}`;
}

function parsePrefixedNumber(token: string, prefix: string): number | null {
  const match = new RegExp(`^${prefix}:(\\d+(?:\\.\\d+)?)$`, "i").exec(token.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function parseMinCovAToken(token: string): number | null {
  return parsePrefixedNumber(token, "min_cov_a");
}

export function parseMaxCovAToken(token: string): number | null {
  return parsePrefixedNumber(token, "max_cov_a");
}

export function parseMaxDwellingAgeToken(token: string): number | null {
  return parsePrefixedNumber(token, "max_dwelling_age");
}

export function parseMinMilesToCoastToken(token: string): number | null {
  return parsePrefixedNumber(token, "min_miles_to_coast");
}

export function parseProtectionClassToken(token: string): number | null {
  return parsePrefixedNumber(token, "pc");
}

/** "10", "PC10", "PC 9" → 10 / 9. */
export function parseProtectionClassValue(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const match = String(value).match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}
