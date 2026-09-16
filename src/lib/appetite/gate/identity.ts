import { TRIDENT_HO_APPETITE } from "@/lib/appetite/published-appetite";
import { UICNA_SLUG, UNIVERSAL_PC_SLUG } from "./fl-ho-order";

/**
 * Slug identity helpers. universal_pc (Universal Property & Casualty of Florida)
 * is NEVER the same record as uicna (Universal Insurance Company of North America).
 *
 * Optional UUID links to the existing `carriers` desk rows — matching is conservative
 * so a bare "Universal" name does not collapse the two legal entities.
 */
export const SLUG_NAME_ALIASES: Record<string, string[]> = {
  citizens: ["citizens property", "citizens"],
  slide: ["slide insurance", "slide"],
  american_integrity: ["american integrity"],
  foremost: ["foremost"],
  universal_pc: ["universal property & casualty", "universal property and casualty", "universal p&c", "universal property"],
  kin: ["kin interinsurance", "kin "],
  hagerty: ["hagerty"],
  dairyland: ["dairyland"],
  tower_hill: ["tower hill"],
  frontline: ["frontline insurance", "frontline"],
  florida_peninsula: ["florida peninsula"],
  edison: ["edison insurance"],
  southern_oak: ["southern oak"],
  heritage: ["heritage property", "heritage"],
  security_first: ["security first"],
  peoples_trust: ["people's trust", "peoples trust"],
  trident_reciprocal: TRIDENT_HO_APPETITE.aliases,
  typtap: ["typtap"],
  olympus: ["olympus insurance", "olympus"],
  monarch: ["monarch national", "monarch"],
  loggerhead: ["loggerhead"],
  florida_family: ["florida family"],
  cabrillo: ["cabrillo"],
  mendota: ["mendota"],
  infinity: ["infinity insurance", "infinity"],
  the_general: ["the general", "permanent general"],
  tapco: ["tapco"],
  nbic: ["narragansett bay", "nbic"],
  uicna: [
    "universal insurance company of north america",
    "uicna",
    "universal of north america",
  ],
  pacific_specialty: ["pacific specialty"],
  progressive: ["progressive"],
  geico: ["geico"],
  state_farm: ["state farm"],
  allstate: ["allstate"],
  farmers: ["farmers insurance", "farmers"],
  nationwide: ["nationwide"],
  liberty_mutual: ["liberty mutual"],
  safeco: ["safeco"],
  travelers: ["travelers"],
  usaa: ["usaa"],
  chubb: ["chubb"],
  hartford: ["the hartford", "hartford"],
  american_family: ["american family"],
  citizens: ["citizens property", "citizens"],
};

export function assertDistinctUniversalSlugs(a: string, b: string): boolean {
  const pair = new Set([a, b]);
  return pair.has(UNIVERSAL_PC_SLUG) && pair.has(UICNA_SLUG) && a !== b;
}

export function slugFromCarrierName(name: string): string | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;

  // UICNA first so "Universal Insurance Company of North America" never maps to universal_pc.
  for (const label of SLUG_NAME_ALIASES[UICNA_SLUG] ?? []) {
    if (n.includes(label)) return UICNA_SLUG;
  }
  for (const label of SLUG_NAME_ALIASES[UNIVERSAL_PC_SLUG] ?? []) {
    if (n.includes(label)) return UNIVERSAL_PC_SLUG;
  }

  for (const [slug, labels] of Object.entries(SLUG_NAME_ALIASES)) {
    if (slug === UNIVERSAL_PC_SLUG || slug === UICNA_SLUG) continue;
    if (labels.some((label) => n.includes(label))) return slug;
  }
  return null;
}
