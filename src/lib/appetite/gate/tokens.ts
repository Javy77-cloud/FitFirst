import type { MasterRiskSnapshot } from "./types";

export const OLDER_ROOF_YEARS = 15;
export const VERY_OLD_ROOF_YEARS = 25;
export const PRE_2001_YEAR = 2001;

export const NE_COAST_STATES = ["NY", "NJ", "MA", "RI", "CT", "NH", "ME"] as const;

/**
 * Decline / caution / preferred tokens → master-sheet field checks.
 * Tokens listed in the v1 spec are all implemented against MasterRiskSnapshot.
 */
export type TokenEval = {
  token: string;
  hit: boolean;
};

function normState(state: string | null | undefined): string | null {
  const s = state?.trim().toUpperCase() ?? "";
  return s || null;
}

function isOlderRoof(snap: MasterRiskSnapshot): boolean {
  return snap.roofAgeYears != null && snap.roofAgeYears >= OLDER_ROOF_YEARS;
}

function isVeryOldRoof(snap: MasterRiskSnapshot): boolean {
  return snap.roofAgeYears != null && snap.roofAgeYears >= VERY_OLD_ROOF_YEARS;
}

function isUnmitigated(snap: MasterRiskSnapshot): boolean {
  return snap.windMit === "none" || snap.windMit === "poor";
}

function preferredAuto(snap: MasterRiskSnapshot): boolean {
  if (snap.isPreferredAutoProfile != null) return snap.isPreferredAutoProfile;
  const f = snap.autoFlags;
  return !f.dui && !f.sr22 && !f.lapse && !f.tickets && !f.accidents;
}

function dirtyAuto(snap: MasterRiskSnapshot): boolean {
  if (snap.dirtyMvr) return true;
  const f = snap.autoFlags;
  return f.dui || f.sr22 || f.lapse || f.tickets;
}

function inland(snap: MasterRiskSnapshot): boolean {
  if (snap.isInland != null) return snap.isInland;
  if (snap.coastTier === "inland") return true;
  if (snap.milesToCoast != null && snap.milesToCoast > 20) return true;
  return false;
}

function isAutoLine(line: string): boolean {
  const u = line.trim().toUpperCase();
  return (
    u.includes("PAP") ||
    u.includes("AUTO") ||
    u === "MCY" ||
    u === "ORV" ||
    u === "TRUCKING"
  );
}

/**
 * Evaluate one token against the snapshot.
 * Unknown tokens do not hit (soft notes like ian_heavy_county stay informational).
 */
export function tokenHits(token: string, snap: MasterRiskSnapshot): boolean {
  switch (token) {
    case "mobile_home":
      return snap.isMobile;
    case "vacant":
      return snap.isVacant;
    case "manufactured":
      return snap.isManufactured;
    case "state!=FL":
      return normState(snap.state) != null && normState(snap.state) !== "FL";
    case "florida_risk":
      return normState(snap.state) === "FL";
    case "state_not_ne_coast": {
      const st = normState(snap.state);
      if (!st) return false;
      return !(NE_COAST_STATES as readonly string[]).includes(st);
    }
    case "older_roof":
      return isOlderRoof(snap);
    case "older_roof_no_cert":
      return isOlderRoof(snap) && snap.roofCertified === false;
    case "very_old_roof_no_update":
      return isVeryOldRoof(snap);
    case "pre_2001_construction":
      return snap.yearBuilt != null && snap.yearBuilt < PRE_2001_YEAR;
    case "older_unmitigated":
      return (isOlderRoof(snap) || (snap.yearBuilt != null && snap.yearBuilt < PRE_2001_YEAR)) && isUnmitigated(snap);
    case "no_wind_mit_and_tier1_coast":
      return (snap.windMit == null || snap.windMit === "none") && snap.coastTier === 1;
    case "poor_mitigation":
      return isUnmitigated(snap);
    case "poor_construction":
      return snap.constructionQuality === "poor";
    case "no_modeled_cat_pass":
      return snap.modeledCatPass === false;
    case "no_wind_flood_need_mismatch":
      return snap.windFloodNeedMismatch === true;
    case "daily_driver":
      if (snap.isCollectorAuto) return false;
      if (snap.isDailyDriver === true) return true;
      return isAutoLine(snap.line) && !snap.line.toUpperCase().includes("COLLECTOR");
    case "no_secure_storage":
      return snap.secureStorage === false;
    case "dirty_mvr":
      return dirtyAuto(snap);
    case "preferred_only_profile":
    case "preferred_only_driver":
    case "clean_preferred_better_priced_elsewhere":
      return preferredAuto(snap) && isAutoLine(snap.line);
    case "inland_preferred_standard":
      return inland(snap) && snap.isPreferredStandardHome === true;
    case "inland_only_outside_footprint":
      return inland(snap);
    case "admitted_market_already_open":
      return snap.admittedDeclinedCount === 0 && snap.admittedMarketOpen !== false;
    case "FL_primary_book_assumption":
      return normState(snap.state) === "FL";
    case "none_standard":
      return snap.isStandardPreferredNewConstruction === true;
    case "HO3_preferred_standard":
      return snap.line.toUpperCase() === "HO3" && snap.isPreferredStandardHome === true;
    case "PAP_daily_driver":
      return tokenHits("daily_driver", snap);
    case "PREFERRED_PAP":
      return preferredAuto(snap) && isAutoLine(snap.line);
    case "DP_vacant":
      return snap.isVacant && snap.line.toUpperCase().startsWith("DP");
    case "standard_inland_preferred":
      return tokenHits("inland_preferred_standard", snap);
    case "preferred_admitted_standard":
      return snap.admittedDeclinedCount === 0 && snap.isPreferredStandardHome === true;
    case "preferred_standard_new_construction_only":
      return snap.isStandardPreferredNewConstruction === true;
    case "no_new_dp3":
      return normalizeLineToken(snap.line) === "DP3";
    case "new_homeowners":
    case "ca_new_homeowners":
      return isHomeownersLine(snap.line) && (token === "new_homeowners" || normState(snap.state) === "CA");
    default:
      return false;
  }
}

function normalizeLineToken(line: string): string {
  return line.trim().toUpperCase().replace(/\s+/g, "_");
}

function isHomeownersLine(line: string): boolean {
  const u = normalizeLineToken(line);
  return (
    u === "HO" ||
    u === "HO3" ||
    u === "HO4" ||
    u === "HO5" ||
    u === "HO6" ||
    u === "HO8" ||
    u === "MH" ||
    u === "MHO" ||
    u === "MDP" ||
    u === "HO_MP"
  );
}

export function firstMatchingToken(tokens: string[], snap: MasterRiskSnapshot): string | null {
  for (const token of tokens) {
    if (tokenHits(token, snap)) return token;
  }
  return null;
}

export function anyTokenHits(tokens: string[], snap: MasterRiskSnapshot): boolean {
  return firstMatchingToken(tokens, snap) != null;
}

export const REQUIRED_HARD_DECLINE_TOKENS = [
  "mobile_home",
  "vacant",
  "manufactured",
  "state!=FL",
  "florida_risk",
  "state_not_ne_coast",
  "older_roof",
  "older_roof_no_cert",
  "very_old_roof_no_update",
  "pre_2001_construction",
  "older_unmitigated",
  "no_wind_mit_and_tier1_coast",
  "poor_mitigation",
  "poor_construction",
  "no_modeled_cat_pass",
  "no_wind_flood_need_mismatch",
  "daily_driver",
  "no_secure_storage",
  "dirty_mvr",
  "preferred_only_profile",
  "preferred_only_driver",
  "inland_preferred_standard",
  "inland_only_outside_footprint",
  "admitted_market_already_open",
  "FL_primary_book_assumption",
  "clean_preferred_better_priced_elsewhere",
  "none_standard",
  "no_new_dp3",
  "new_homeowners",
] as const;
