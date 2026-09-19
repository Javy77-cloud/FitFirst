import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { isLockedSheetField } from "@/lib/lifecycle/quote-sheet";

function fieldIsBlank(field?: QuoteSheetFieldValue | null): boolean {
  if (!field) return true;
  return field.value.trim() === "" || field.status === "missing";
}

export const SHEET_DEFAULT_SOURCE_LABEL = "default";

/** Yes/no picklist options shared by protection / hazard / dwelling flags. */
export const YES_NO_OPTIONS = ["yes", "no"] as const;

/** Allstate FL Auto accepts Male/Female only (M/F) — Javy 2026-09-10. */
export { GENDER_OPTIONS, OCCUPATION_OPTIONS, EDUCATION_LEVEL_OPTIONS, EMPLOYMENT_STATUS_OPTIONS } from "./applicant-core";

/** Normalize M/F / male/female into Male | Female picklist values. */
export function normalizeGender(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/[^a-z]/g, "");
  if (lower === "m" || lower === "male" || lower === "man" || lower === "boy") return "Male";
  if (lower === "f" || lower === "female" || lower === "woman" || lower === "girl") return "Female";
  if (text === "Male" || text === "Female") return text;
  return "";
}

/** Months occupied — QuoteRUSH 2026-09-15 (0-3; 4-8; 9+ months). */
export const MONTHS_OCCUPIED_OPTIONS = [
  "0-3 months",
  "4-8 months",
  "9+ months",
] as const;

/** Usage — QuoteRUSH 2026-09-15 (Primary; Rental; Seasonal; Secondary; Vacant). */
export const USAGE_OPTIONS = [
  "Primary",
  "Rental",
  "Seasonal",
  "Secondary",
  "Vacant",
] as const;

/** Personal Auto vehicle usage (Javy 2026-09-10). Farm is the usual 4th beside Personal/Commute/Business. */
export const AUTO_VEHICLE_USAGE_OPTIONS = [
  "Personal",
  "Commute",
  "Business",
  "Farm",
] as const;

/**
 * Continuous coverage / prior insurance (Auto current policy — Javy 2026-09-10).
 * Labels are the full option text agents pick.
 */
export const AUTO_CURRENTLY_INSURED_OPTIONS = [
  "Currently insured 6 months or more",
  "Lapse within last 30 days — 7 days or less",
  "Lapse within last 30 days — 8 to 14 days",
  "Lapse within last 30 days — 15 to 30 days",
  "More than 30 days lapse in the last 6 months / no prior insurance",
  "Other",
] as const;

/**
 * Annual miles driven — agent rater-style brackets (Javy 2026-09-10).
 * 1k steps through 11,999, then wider high-mileage buckets.
 */
export const AUTO_ANNUAL_MILES_OPTIONS = [
  "0 – 2,999",
  "3,000 – 3,999",
  "4,000 – 4,999",
  "5,000 – 5,999",
  "6,000 – 6,999",
  "7,000 – 7,999",
  "8,000 – 8,999",
  "9,000 – 9,999",
  "10,000 – 10,999",
  "11,000 – 11,999",
  "12,000 – 14,999",
  "15,000 – 19,999",
  "20,000 – 24,999",
  "25,000+",
] as const;

/** Accidents / violations count last 3 years (Auto driving record — Javy 2026-09-10). */
export const AUTO_INCIDENT_COUNT_OPTIONS = ["None", "1", "2", "3+"] as const;

/**
 * Driver license status — industry personal-auto set.
 * Overlaps household exclude reasons (Never licensed / Suspended / Revoked).
 * QuoteRUSH Auto harvest labels were not in-repo; do not treat these as QR-verbatim.
 */
export const LICENSE_STATUS_OPTIONS = [
  "Valid",
  "Permit",
  "Restricted",
  "Expired",
  "Suspended",
  "Revoked",
  "International",
  "Never licensed",
] as const;

/**
 * Rated-driver relationship to the named insured.
 * "Named insured" plus the existing household relationship list.
 */
export const AUTO_DRIVER_RELATIONSHIP_OPTIONS = [
  "Named insured",
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Other relative",
  "Roommate",
  "Excluded",
  "Listed non-driver",
] as const;

/**
 * FL Auto BI split limits seen in FitFirst quote notes (10/20, 50/100)
 * plus the usual personal-lines steps. QR Auto harvest strings were not in-repo.
 */
export const AUTO_BI_LIMIT_OPTIONS = [
  "10/20",
  "25/50",
  "50/100",
  "100/300",
  "250/500",
  "300/300",
  "500/500",
] as const;

/** FL Auto PD limits from FitFirst quote notes (10k / 25k) plus usual steps. */
export const AUTO_PD_LIMIT_OPTIONS = ["10000", "25000", "50000", "100000"] as const;

/** UM / UIM — same splits as BI, plus None / Rejected from FitFirst quote notes. */
export const AUTO_UM_UIM_OPTIONS = [
  "None",
  "Rejected",
  "10/20",
  "25/50",
  "50/100",
  "100/300",
  "250/500",
] as const;

/**
 * FL PIP amounts from FitFirst quote notes (PIP 1k, PIP $10k / $1k ded).
 * Stored as bare numbers to match flood/home deductible style.
 */
export const AUTO_PIP_OPTIONS = ["10000", "1000", "None"] as const;

/**
 * Comp / collision deductibles — AOP dollar set plus $250 (lienholder deds in notes).
 */
export const AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS = [
  "250",
  "500",
  "1000",
  "1500",
  "2000",
  "2500",
  "5000",
] as const;

/** FL Auto portal–style relationships for household / related persons (Gaya standing). */
export const AUTO_HOUSEHOLD_RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Other relative",
  "Roommate",
  "Excluded",
  "Listed non-driver",
] as const;

/** Household / driver listing status for related persons. */
export const AUTO_HOUSEHOLD_STATUS_OPTIONS = [
  "Resident",
  "Non-resident",
  "Occasional",
  "Excluded driver",
  "Listed driver",
] as const;

/** FL/LM Non-Rated/Excluded reason (Gaya standing — Liberty Mutual household exclusion). */
export const AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS = [
  "Out of household",
  "Never licensed",
  "License suspended",
  "License revoked",
  "Separately insured",
  "Military overseas",
  "Other (Non-Rated/Excluded reason)",
] as const;

/** Separate auto policy status when household member has own policy. */
export const AUTO_HOUSEHOLD_SEPARATE_POLICY_STATUS_OPTIONS = [
  "Active",
  "Lapsed",
  "Unknown",
  "N/A",
] as const;

/** Occupancy — owner vs tenant (Javy 2026-09-09). */
export const OCCUPANCY_OPTIONS = ["Owner", "Tenant"] as const;

/** Auto residence Own / Rent (Javy 2026-09-10). */
export const OWN_RENT_OPTIONS = ["Own", "Rent"] as const;

/**
 * Auto residence tenure (Gaya standing):
 * - years_at_address (number) — how long at current address
 * - address_same_6_months (yes/no) — same as current for 6+ months
 * - prior_address (text) — only when address_same_6_months is no
 * Do not add SSN here.
 */

/** Auto vehicle ownership (Javy 2026-09-10). */
export const VEHICLE_OWNERSHIP_OPTIONS = ["Owned", "Financed", "Leased"] as const;

/** How long owned / financed — Geico-style brackets (Javy 2026-09-10). */
export const VEHICLE_OWNERSHIP_LENGTH_OPTIONS = [
  "Less than 1 month",
  "1–5 months",
  "6–11 months",
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5+ years",
] as const;

/** Commute days per week (0–7) — Auto usage follow-up (Javy 2026-09-10). */
export const COMMUTE_DAYS_WEEK_OPTIONS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
] as const;

/** Common FL Auto lienholders / lenders (Javy 2026-09-10). */
export const VEHICLE_LIENHOLDER_OPTIONS = [
  "Acura Financial Services",
  "Honda Financial Services",
  "Toyota Financial Services",
  "Lexus Financial Services",
  "BMW Financial Services",
  "Mercedes-Benz Financial Services",
  "Nissan Motor Acceptance",
  "Hyundai Motor Finance",
  "Kia Finance",
  "GM Financial",
  "Ford Credit",
  "Ally Financial",
  "Capital One Auto Finance",
  "Chase Auto",
  "Bank of America",
  "Wells Fargo Auto",
  "Santander Consumer USA",
  "TD Auto Finance",
  "USAA",
  "Navy Federal Credit Union",
  "Suncoast Credit Union",
  "Regions Bank",
  "Truist",
  "Other",
] as const;

/** Distance to hydrant (Javy 2026-09-09). */
export const DISTANCE_TO_HYDRANT_OPTIONS = [
  "Within 1,000 feet",
  "More than 1,000 feet",
] as const;

/** Distance to fire station (Javy 2026-09-09). */
export const DISTANCE_TO_STATION_OPTIONS = [
  "Within 5 miles",
  "More than 5 miles",
] as const;

/** Primary heat / heating system (carrier portals — Javy 2026-09-09). */
export const PRIMARY_HEAT_OPTIONS = [
  "Electric",
  "Heat pump",
  "Natural gas",
  "Propane",
  "Oil",
  "None",
  "Other",
] as const;

/**
 * QuoteRUSH Assumed Credit Score (2026-09-15).
 * Legacy People's Trust/Slate "Above Average" maps to Excellent.
 */
export const INSURANCE_SCORE_RANGE_OPTIONS = [
  "Average",
  "Below Average",
  "Excellent",
  "Poor",
  "Very Good",
] as const;

/** FL HO screen-enclosure limit bands (lean quote — not a porch schedule). */
export const SCREEN_ENCLOSURE_OPTIONS = [
  "None",
  "$5,000",
  "$10,000",
  "$25,000",
  "$50,000",
] as const;

/** Auto AAA membership tenure (portal rating). */
export const AAA_MEMBER_OPTIONS = [
  "None",
  "1–9 years",
  "10+ years",
] as const;

/** Auto passive restraints (airbags / automatic belts). */
export const PASSIVE_RESTRAINT_OPTIONS = [
  "Yes",
  "No",
  "Unknown",
] as const;

/** QuoteRUSH Water Backup/Sump Overflow (2026-09-15). Dollar strings for Super-Copy. */
export const WATER_BACKUP_OPTIONS = [
  "$2,000",
  "$5,000",
  "$10,000",
  "$15,000",
  "$20,000",
  "$25,000",
  "$30,000",
  "$50,000",
] as const;

/**
 * Claims last 5 years — store pasteable tokens.
 * "No claims" is the explicit zero (also accepts 0 / none).
 */
export const CLAIMS_5YR_OPTIONS = ["No claims", "1", "2", "3", "4+"] as const;

/** QuoteRUSH SWR is No/Yes; Unknown kept for OIR C / undetermined. */
export const YES_NO_UNKNOWN_OPTIONS = ["No", "Yes", "Unknown"] as const;

/** QuoteRUSH Roof Wall Connection (2026-09-15). */
export const ROOF_TO_WALL_OPTIONS = [
  "Clips",
  "Double Wraps",
  "N/A",
  "Single Wraps",
  "Structural",
  "Toe Nails",
  "Unknown",
] as const;

/**
 * QuoteRUSH Wind Speed/Design showed 100/110/120 (2026-09-15).
 * 130/140/150/HVHZ kept for OIR / other carriers.
 */
export const WIND_SPEED_OPTIONS = ["100", "110", "120", "130", "140", "150", "HVHZ"] as const;

/**
 * QuoteRUSH Building Code showed A/B/C (2026-09-15).
 * D kept for OIR-B1-1802 unknown / does not meet A–C.
 */
export const BUILDING_CODE_OPTIONS = ["A", "B", "C", "D"] as const;

/** QuoteRUSH roof covering / wind-mit FBC compliance (2026-09-15). */
export const ROOF_COVERING_OPTIONS = [
  "Meets FBC 1994",
  "Meets FBC 2001",
  "Non-FBC",
  "Reinf Concrete Roof Deck",
  "Unknown",
] as const;

/** Roof geometry from `WIND_MIT_CHECKBOX_MAPS.roof_shape`. */
export const ROOF_SHAPE_OPTIONS = ["hip", "flat", "other"] as const;

/** QuoteRUSH roof deck attachment (2026-09-15). */
export const ROOF_DECK_ATTACHMENT_OPTIONS = [
  "Level A",
  "Level B",
  "Level C",
  "Metal Deck - Type II or III",
  "Reinforced Concrete Roof Deck",
  "Unknown",
  "Wood Deck - Type II only",
] as const;

/** QuoteRUSH opening protection (2026-09-15). */
export const OPENING_PROTECTION_OPTIONS = [
  "Basic",
  "Hurricane Protection",
  "Unknown or None",
] as const;

/**
 * QuoteRUSH Terrain showed Exposure B / Exposure C (2026-09-15).
 * Exposure D kept for OIR terrain D.
 */
export const TERRAIN_OPTIONS = ["Exposure B", "Exposure C", "Exposure D"] as const;

/** QuoteRUSH-style stories including bi/tri-level (2026-09-15 follow-up). */
export const STORIES_OPTIONS = ["1", "2", "3", "4+", "Bi-Level", "Tri-Level"] as const;

/** ISO protection class 1–10. */
export const PROTECTION_CLASS_OPTIONS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
] as const;

/** ISO BCEG grade — Super-Copy helper. */
export const BCEG_OPTIONS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "Ungraded",
  "N/A",
] as const;

/** Common FEMA flood zones for home Super-Copy. */
export const FLOOD_ZONE_OPTIONS = [
  "A",
  "AE",
  "AH",
  "AO",
  "AR",
  "A99",
  "V",
  "VE",
  "X",
  "X-Shaded",
  "B",
  "C",
  "D",
] as const;

/** Dwelling structure type — Super-Copy helper. */
export const STRUCTURE_TYPE_OPTIONS = [
  "Single Family",
  "Townhouse",
  "Condo",
  "Duplex",
  "Rowhouse",
  "Mobile Home",
  "Manufactured Home",
] as const;

/** Pool type — Super-Copy helper (keep `pool` yes/no separate). */
export const POOL_TYPE_OPTIONS = [
  "None",
  "Above Ground",
  "In Ground",
  "Indoor",
  "Community",
] as const;

/** 4-point system update type. */
export const FOUR_POINT_UPDATE_TYPE_OPTIONS = [
  "Complete",
  "Partial",
  "None",
  "Unknown",
] as const;

export const ROOF_UPDATE_TYPE_OPTIONS = [
  "Complete replacement",
  "Partial",
  "Overlay",
  "None",
  "Unknown",
] as const;

export const WATER_HEATER_LOCATION_OPTIONS = [
  "Garage",
  "Interior closet",
  "Exterior closet",
  "Attic",
  "Utility room",
  "Other",
] as const;

/** Primary plumbing type (carrier portals — Javy 2026-09-09). */
export const PRIMARY_PLUMBING_OPTIONS = [
  "Copper",
  "PEX",
  "PVC / CPVC",
  "Galvanized",
  "Polybutylene",
  "Mixed",
  "Other",
] as const;

/**
 * Exterior = QuoteRUSH Wall Type (kept separate from construction).
 * 2026-09-15 harvest did not list full Wall Type values; keep close FitFirst vocab.
 */
export const EXTERIOR_OPTIONS = [
  "Masonry",
  "Frame",
  "Mixed Masonry-Frame",
] as const;

/** Foundation (7) — Javy 2026-09-09 night lock. */
export const FOUNDATION_OPTIONS = [
  "Slab",
  "Open foundation",
  "Crawl space 25%",
  "Crawl space 50%",
  "Crawl space 100%",
  "Piers (elevated)",
  "Basement",
] as const;

/**
 * Construction = QuoteRUSH Wall Construction (kept separate from exterior).
 * 2026-09-15 harvest did not list full Wall Construction values; keep close FitFirst vocab.
 */
export const CONSTRUCTION_OPTIONS = [
  "Masonry",
  "Frame",
  "Frame-Stucco",
  "Aluminum siding",
  "Vinyl siding",
  "Wood siding",
  "Hardy plank siding",
  "Masonry veneer",
  "Brick veneer",
  "Stone veneer",
  "Logs",
  "Asbestos",
] as const;

/** Expanded toward QuoteRUSH Coverage-tab deductibles (full harvest not listed). */
export const WIND_HAIL_DEDUCTIBLE_OPTIONS = [
  "500",
  "1000",
  "2000",
  "2500",
  "5000",
  "1%",
  "2%",
  "5%",
] as const;
export const HURRICANE_DEDUCTIBLE_OPTIONS = ["1%", "2%", "3%", "4%", "5%", "10%"] as const;
export const AOP_DEDUCTIBLE_OPTIONS = ["500", "1000", "1500", "2000", "2500", "5000"] as const;

/**
 * Empty-cell defaults for new blank sheets / Fill.
 * Protection + hazard starters only — never overwrite agent/confirmed/javy.
 */
export const MASTER_SHEET_EMPTY_DEFAULTS: Record<string, string> = {
  central_alarm: "no",
  smoke_detectors: "no",
  sprinkler: "no",
  deadbolts: "yes",
  pool: "no",
  trampoline: "no",
  dog_breed: "no",
  mobile_home: "no",
  pool_fence: "no",
  animals: "no",
  business_on_premises: "no",
  // Auto standing (Javy): always pull MVR / credit — permission defaults Yes.
  permission_pull_driving_history: "yes",
  permission_pull_credit_history: "yes",
  // applicant_gender / driver_1_gender / applicant_occupation / driver_1_occupation:
  // leave blank — agent answers (no Heather defaults).
  // applicant_education_level / driver_1_education_level: leave blank — wait for Javy (Geico blocked when blank; no Heather defaults).
  // applicant_industry / applicant_occupation / driver_N_industry / driver_N_occupation:
  // leave blank — agent answers (no Heather defaults). Personal employment status is gone.
  // own_rent: leave blank — set per deal (Heather Own on deal sheet).
  // years_at_address / address_same_6_months / prior_address: leave blank —
  // set per deal (Heather ~1yr Tallwood + address_same_6_months yes).
  // vehicle_ownership / vehicle_N_ownership: leave blank — wait for Javy (no Heather defaults).
  // vehicle_lienholder / vehicle_N_lienholder: leave blank — set per deal (Heather Acura Financial Services).
  // vehicle_ownership_length / commute_days_week / vehicle_lienholder_other: leave blank until Javy answers.
  // original_cost_new / vehicle_N_original_cost_new (OCN / cost new): leave blank — wait for Javy (no Heather defaults).
};

/**
 * Flood empty-cell defaults (Javy 2026-09-10 tip sep7jn).
 * Applied only on flood sheets — coverage limits/deductibles + construction flags.
 * current_carrier / nfip_policy stay blank until Gemini extracts a flood dec;
 * has_nfip defaults to no (Currently have flood/NFIP?).
 * prior_flood_losses / flood_quote_reason: leave blank — never assume from HO claims; agent answers.
 * effective_date: computed in emptyDefaultsForLine as application+30 unless under_construction/new house.
 * purchased_within_last_year / prior_owner_nfip_at_closing: leave blank — agent confirms (NFIP/Wright).
 */
export const FLOOD_SHEET_EMPTY_DEFAULTS: Record<string, string> = {
  under_construction: "no",
  over_water: "no",
  substantially_improved: "no",
  enclosure_present: "no",
  building_limit: "250000",
  contents_limit: "100000",
  building_deductible: "1000",
  contents_deductible: "1000",
  has_nfip: "no",
};


const MONTHS_0_3 = "0-3 months";
const MONTHS_4_8 = "4-8 months";
const MONTHS_9_PLUS = "9+ months";

/** Normalize free months / legacy buckets into the three picklist options. */
export function normalizeMonthsOccupied(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = lower.replace(/\s+/g, "");
  if (
    compact === "0to3" ||
    compact === "0-3" ||
    compact === "0–3" ||
    lower === "0 to 3 months" ||
    lower === "0-3 months"
  ) {
    return MONTHS_0_3;
  }
  if (
    compact === "4to8" ||
    compact === "4-8" ||
    compact === "4–8" ||
    lower === "4 to 8 months" ||
    lower === "4-8 months"
  ) {
    return MONTHS_4_8;
  }
  if (
    compact === "9+" ||
    compact === "9or more" ||
    compact === "9monthsormore" ||
    compact === "9-12" ||
    compact === "9–12" ||
    compact === "9to12" ||
    lower === "9 months or more" ||
    lower.includes("9 months or more") ||
    lower === "9+ months" ||
    lower.includes("9+ months")
  ) {
    return MONTHS_9_PLUS;
  }
  // Legacy two-bucket desk values
  if (compact === "0-9" || compact === "0–9" || compact === "0to9") return MONTHS_4_8;
  const n = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return text;
  if (n >= 9) return MONTHS_9_PLUS;
  if (n >= 4) return MONTHS_4_8;
  if (n >= 0) return MONTHS_0_3;
  return text;
}

/** Normalize usage into the five desk picklist values. */
export function normalizeUsage(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const map: Record<string, (typeof USAGE_OPTIONS)[number]> = {
    primary: "Primary",
    "primary / owner": "Primary",
    "primary owner": "Primary",
    "owner occupied": "Primary",
    owner: "Primary",
    secondary: "Secondary",
    "second home": "Secondary",
    seasonal: "Seasonal",
    rental: "Rental",
    tenant: "Rental",
    "tenant occupied": "Rental",
    vacant: "Vacant",
  };
  return map[lower] ?? text;
}

const WATER_BACKUP_BY_AMOUNT: Record<string, (typeof WATER_BACKUP_OPTIONS)[number]> = {
  "2000": "$2,000",
  "5000": "$5,000",
  "10000": "$10,000",
  "15000": "$15,000",
  "20000": "$20,000",
  "25000": "$25,000",
  "30000": "$30,000",
  "50000": "$50,000",
};

export function normalizeWaterBackup(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  if (WATER_BACKUP_OPTIONS.includes(text as (typeof WATER_BACKUP_OPTIONS)[number])) return text;
  const digits = text.replace(/[^0-9]/g, "");
  if (WATER_BACKUP_BY_AMOUNT[digits]) return WATER_BACKUP_BY_AMOUNT[digits];
  return text;
}

export function normalizeInsuranceScoreRange(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  // Legacy People's Trust/Slate "Above Average" → QuoteRUSH Excellent.
  if (lower === "above average" || lower === "excellent") return "Excellent";
  if (lower === "very good" || lower === "verygood") return "Very Good";
  if (lower === "average") return "Average";
  if (lower === "below average" || lower === "belowaverage") return "Below Average";
  if (lower === "poor") return "Poor";
  const hit = INSURANCE_SCORE_RANGE_OPTIONS.find((opt) => opt.toLowerCase() === lower);
  return hit ?? text;
}

export function normalizeClaims5yr(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (
    lower === "0" ||
    lower === "none" ||
    lower === "no" ||
    lower === "no claims" ||
    lower === "no claim" ||
    lower === "zero"
  ) {
    return "No claims";
  }
  if (lower === "4+" || lower === "4 or more" || lower.startsWith("4+") || Number(lower) >= 4) {
    return "4+";
  }
  if (lower === "1" || lower === "2" || lower === "3") return lower;
  return CLAIMS_5YR_OPTIONS.includes(text as (typeof CLAIMS_5YR_OPTIONS)[number]) ? text : text;
}

export function normalizeRoofToWall(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const letter = lower.match(/^(?:([a-h])(?:\s*[.)\-:]|$))/);
  const byLetter: Record<string, (typeof ROOF_TO_WALL_OPTIONS)[number]> = {
    a: "Toe Nails",
    b: "Clips",
    c: "Single Wraps",
    d: "Double Wraps",
    e: "Structural",
    f: "N/A",
    g: "Unknown",
    h: "N/A",
  };
  if (letter && byLetter[letter[1]!]) return byLetter[letter[1]!];
  if (lower.includes("toe nail") || lower.includes("toenail")) return "Toe Nails";
  if (lower.includes("clip")) return "Clips";
  if (lower.includes("single wrap")) return "Single Wraps";
  if (lower.includes("double wrap")) return "Double Wraps";
  if (lower.includes("structural")) return "Structural";
  if (lower.includes("no attic") || lower === "n/a" || lower === "na" || lower === "other") return "N/A";
  if (lower === "unknown" || lower.includes("unidentified")) return "Unknown";
  const titled = ROOF_TO_WALL_OPTIONS.find((opt) => opt.toLowerCase() === lower);
  return titled ?? text;
}

export function normalizeSecondaryWater(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (
    lower === "a" ||
    lower.startsWith("a.") ||
    lower === "yes" ||
    lower === "y" ||
    lower.includes("sealed")
  ) {
    return "Yes";
  }
  if (lower === "b" || lower.startsWith("b.") || lower === "no" || lower === "n" || lower === "false") {
    return "No";
  }
  if (
    lower === "c" ||
    lower.startsWith("c.") ||
    lower === "unknown" ||
    lower.includes("undetermined")
  ) {
    return "Unknown";
  }
  const hit = YES_NO_UNKNOWN_OPTIONS.find((opt) => opt.toLowerCase() === lower);
  return hit ?? text;
}

export function normalizeWindSpeed(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const upper = text.toUpperCase().replace(/\s+/g, "");
  if (upper.includes("HVHZ")) return "HVHZ";
  if (WIND_SPEED_OPTIONS.includes(text as (typeof WIND_SPEED_OPTIONS)[number])) return text;
  const mph = text.match(/\b(100|110|120|130|140|150)\b/);
  if (mph) return mph[1]!;
  return text;
}

export function normalizeBuildingCode(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lead = text.match(/^([A-Da-d])(?:\s*[.)\-:]|$)/);
  if (lead) return lead[1]!.toUpperCase();
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (lower.includes("unknown") || lower.includes("does not meet")) return "D";
  if (BUILDING_CODE_OPTIONS.includes(text as (typeof BUILDING_CODE_OPTIONS)[number])) return text;
  return text;
}

export function normalizeRoofCovering(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  if (ROOF_COVERING_OPTIONS.includes(text as (typeof ROOF_COVERING_OPTIONS)[number])) return text;
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (lower.includes("1994")) return "Meets FBC 1994";
  if (lower.includes("2001")) return "Meets FBC 2001";
  if (lower.includes("non-fbc") || lower.includes("non fbc")) return "Non-FBC";
  if (lower.includes("reinf") || (lower.includes("concrete") && lower.includes("deck"))) {
    return "Reinf Concrete Roof Deck";
  }
  if (lower === "unknown" || lower.includes("unidentified")) return "Unknown";
  return text;
}

export function normalizeRoofShape(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (lower === "a" || lower.startsWith("a.") || lower.includes("hip")) return "hip";
  if (lower === "b" || lower.startsWith("b.") || lower.includes("flat")) return "flat";
  if (lower === "c" || lower.startsWith("c.") || lower.includes("gable") || lower.includes("other")) {
    return "other";
  }
  const hit = ROOF_SHAPE_OPTIONS.find((opt) => opt === lower);
  return hit ?? text;
}

export function normalizeRoofDeckAttachment(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  if (ROOF_DECK_ATTACHMENT_OPTIONS.includes(text as (typeof ROOF_DECK_ATTACHMENT_OPTIONS)[number])) {
    return text;
  }
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (/^(level\s*)?a\b/.test(lower) || lower === "a") return "Level A";
  if (/^(level\s*)?b\b/.test(lower) || lower === "b") return "Level B";
  if (/^(level\s*)?c\b/.test(lower) || lower === "c") return "Level C";
  if (lower.includes("metal")) return "Metal Deck - Type II or III";
  if (lower.includes("wood")) return "Wood Deck - Type II only";
  if (lower.includes("concrete") || lower === "d") return "Reinforced Concrete Roof Deck";
  if (lower === "unknown" || lower.includes("unidentified") || lower === "g") return "Unknown";
  return text;
}

export function normalizeOpeningProtection(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  if (OPENING_PROTECTION_OPTIONS.includes(text as (typeof OPENING_PROTECTION_OPTIONS)[number])) {
    return text;
  }
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (
    lower === "none" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "n" ||
    lower === "x" ||
    lower === "unknown" ||
    lower.includes("unknown or none")
  ) {
    return "Unknown or None";
  }
  if (lower.includes("hurricane") || lower === "a" || lower.includes("class a") || lower === "full") {
    return "Hurricane Protection";
  }
  if (lower === "basic" || lower === "b" || lower.includes("class b")) return "Basic";
  return text;
}

export function normalizeTerrain(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  if (TERRAIN_OPTIONS.includes(text as (typeof TERRAIN_OPTIONS)[number])) return text;
  const letter = text.match(/^(?:exposure\s*)?([BCDbcd])(?:\s*[.)\-:]|$)/);
  if (letter) return `Exposure ${letter[1]!.toUpperCase()}` as (typeof TERRAIN_OPTIONS)[number];
  return text;
}

export function normalizeStories(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  if (STORIES_OPTIONS.includes(text as (typeof STORIES_OPTIONS)[number])) return text;
  const lower = text.toLowerCase();
  if (lower.includes("bi")) return "Bi-Level";
  if (lower.includes("tri") || lower.includes("split")) return "Tri-Level";
  const n = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return text;
  if (n >= 4) return "4+";
  if (n >= 1) return String(Math.trunc(n));
  return text;
}

/** Appetite / risk snapshot still wants a number. */
export function storiesAsNumber(raw: string | null | undefined): number | null {
  const normalized = normalizeStories(raw);
  if (!normalized) return null;
  if (normalized === "4+") return 4;
  if (normalized === "Bi-Level") return 2;
  if (normalized === "Tri-Level") return 3;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function normalizeFloodZone(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const upper = text.toUpperCase().replace(/\s+/g, "");
  if (upper === "XSHADED" || upper === "X-SHADED" || upper === "SHADEDX") return "X-Shaded";
  const hit = FLOOD_ZONE_OPTIONS.find((opt) => opt.toUpperCase() === upper);
  return hit ?? text;
}

export function normalizeLicenseStatus(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (lower === "valid" || lower === "active" || lower === "licensed") return "Valid";
  if (lower === "permit" || lower.includes("learner")) return "Permit";
  if (lower.includes("restrict")) return "Restricted";
  if (lower.includes("expir")) return "Expired";
  if (lower.includes("suspend")) return "Suspended";
  if (lower.includes("revok")) return "Revoked";
  if (lower.includes("international") || lower.includes("foreign")) return "International";
  if (lower.includes("never") || lower === "unlicensed" || lower === "not licensed") {
    return "Never licensed";
  }
  const hit = LICENSE_STATUS_OPTIONS.find((opt) => opt.toLowerCase() === lower);
  return hit ?? text;
}

export function normalizeAutoSplitLimit(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const compact = text.replace(/[$,\s]/g, "").replace(/-/g, "/").toLowerCase();
  if (compact === "none" || compact === "n/a" || compact === "na") return "None";
  if (compact === "rejected" || compact === "declined" || compact === "waived") return "Rejected";
  const slash = compact.match(/^(\d{2,3})\/(\d{2,3})$/);
  if (slash) {
    const next = `${Number(slash[1])}/${Number(slash[2])}`;
    const known = [
      ...AUTO_BI_LIMIT_OPTIONS,
      ...AUTO_UM_UIM_OPTIONS,
    ] as readonly string[];
    if (known.includes(next)) return next;
  }
  return text;
}

export function normalizeAutoDollarLimit(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const compact = text.toLowerCase().replace(/[\s$,]/g, "");
  if (compact === "none" || compact === "n/a" || compact === "na") return "None";
  const fromK = compact.match(/^(\d+)k$/);
  const digits = fromK ? `${fromK[1]}000` : text.replace(/[^0-9]/g, "");
  if (!digits) return text;
  if (AUTO_PD_LIMIT_OPTIONS.includes(digits as (typeof AUTO_PD_LIMIT_OPTIONS)[number])) return digits;
  if (AUTO_PIP_OPTIONS.includes(digits as (typeof AUTO_PIP_OPTIONS)[number])) return digits;
  if (AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS.includes(digits as (typeof AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS)[number])) {
    return digits;
  }
  if (FLOOD_DEDUCTIBLE_OPTIONS.includes(digits as (typeof FLOOD_DEDUCTIBLE_OPTIONS)[number])) {
    return digits;
  }
  return text;
}

export function normalizeFloodOccupancyUse(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  if (text === "Other" || text.toLowerCase() === "other") return "Other";
  return normalizeUsage(text);
}

export function normalizeProtectionClass(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const digits = text.replace(/[^0-9]/g, "");
  if (PROTECTION_CLASS_OPTIONS.includes(digits as (typeof PROTECTION_CLASS_OPTIONS)[number])) {
    return digits;
  }
  return text;
}

export function normalizeOccupancy(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (
    lower === "owner" ||
    lower === "owner occupied" ||
    lower === "owner-occupied" ||
    lower === "primary" ||
    lower.startsWith("owner")
  ) {
    return "Owner";
  }
  if (
    lower === "tenant" ||
    lower === "tenant occupied" ||
    lower === "tenant-occupied" ||
    lower === "renter" ||
    lower === "rental" ||
    lower.includes("tenant")
  ) {
    return "Tenant";
  }
  return text;
}

export function normalizeDistanceToHydrant(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = lower.replace(/[,\s]/g, "");
  if (
    lower === "yes" ||
    lower === "within 1,000 feet" ||
    lower === "within 1000 feet" ||
    compact === "within1000feet" ||
    compact === "within1000ft" ||
    compact.includes("within1000")
  ) {
    return "Within 1,000 feet";
  }
  if (
    lower === "no" ||
    lower === "more than 1,000 feet" ||
    lower === "more than 1000 feet" ||
    compact.includes("morethan1000") ||
    compact.includes(">1000")
  ) {
    return "More than 1,000 feet";
  }
  const n = Number(text.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(n)) {
    return n <= 1000 ? "Within 1,000 feet" : "More than 1,000 feet";
  }
  return text;
}

export function normalizeDistanceToStation(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = lower.replace(/[,\s]/g, "");
  if (
    lower === "within 5 miles" ||
    compact === "within5miles" ||
    compact.includes("within5")
  ) {
    return "Within 5 miles";
  }
  if (
    lower === "more than 5 miles" ||
    compact.includes("morethan5") ||
    compact.includes(">5")
  ) {
    return "More than 5 miles";
  }
  const n = Number(text.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(n)) {
    return n <= 5 ? "Within 5 miles" : "More than 5 miles";
  }
  return text;
}

export type ApplyDefaultsResult = {
  values: Record<string, QuoteSheetFieldValue>;
  filledKeys: string[];
};

/** Merge shared + optional line extras, then fill blank cells (empty-only). */
export function applyMasterSheetDefaults(
  existing: Record<string, QuoteSheetFieldValue>,
  extras?: Record<string, string>,
): ApplyDefaultsResult {
  const defaults: Record<string, string> = {
    ...MASTER_SHEET_EMPTY_DEFAULTS,
    ...(extras ?? {}),
  };
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  for (const [key, raw] of Object.entries(defaults)) {
    const current = values[key];
    if (isLockedSheetField(current) || !fieldIsBlank(current)) continue;
    values[key] = {
      value: raw,
      status: "check",
      source: "agent",
      sourceLabel: SHEET_DEFAULT_SOURCE_LABEL,
    };
    filledKeys.push(key);
  }
  // Normalize months_occupied display when present / blank leave alone.
  const months = values.months_occupied;
  if (months?.value?.trim()) {
    const next = normalizeMonthsOccupied(months.value);
    if (next && next !== months.value) {
      values.months_occupied = { ...months, value: next };
    }
  }
  const selectNormalizers: Array<[string, (raw: string | null | undefined) => string]> = [
    ["water_backup", normalizeWaterBackup],
    ["claims_5yr", normalizeClaims5yr],
    ["insurance_score_range", normalizeInsuranceScoreRange],
    ["roof_to_wall", normalizeRoofToWall],
    ["secondary_water", normalizeSecondaryWater],
    ["wind_speed", normalizeWindSpeed],
    ["building_code", normalizeBuildingCode],
    ["roof_covering", normalizeRoofCovering],
    ["roof_shape", normalizeRoofShape],
    ["roof_deck", normalizeRoofDeckAttachment],
    ["roof_deck_attachment", normalizeRoofDeckAttachment],
    ["opening_protection", normalizeOpeningProtection],
    ["terrain", normalizeTerrain],
    ["stories", normalizeStories],
    ["flood_zone", normalizeFloodZone],
    ["protection_class", normalizeProtectionClass],
    ["occupancy_use", normalizeFloodOccupancyUse],
    ["driver_1_status", normalizeLicenseStatus],
    ["liability_bi", normalizeAutoSplitLimit],
    ["um_uim", normalizeAutoSplitLimit],
    ["liability_pd", normalizeAutoDollarLimit],
    ["pip", normalizeAutoDollarLimit],
    ["comp_deductible", normalizeAutoDollarLimit],
    ["collision_deductible", normalizeAutoDollarLimit],
    ["building_deductible", normalizeAutoDollarLimit],
    ["contents_deductible", normalizeAutoDollarLimit],
    ["product_type", normalizeLifeProductType],
    ["plan_type", normalizeHealthPlanType],
    ["tobacco_status", normalizeTobaccoStatus],
  ];
  for (const [key, normalize] of selectNormalizers) {
    const cell = values[key];
    if (!cell?.value?.trim()) continue;
    const next = normalize(cell.value);
    if (next && next !== cell.value) {
      values[key] = { ...cell, value: next };
    }
  }
  return { values, filledKeys };
}


/** Format a Date as M/D/YYYY for flood portal sheets (US). */
export function formatFloodSheetDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Flood waiting period (Javy 2026-09-10): unless new house, effective ≈ application + 30 days.
 * New house / under construction → leave blank (agent picks sooner).
 */
export function floodEffectiveDateDefault(opts?: {
  applicationDay?: Date;
  underConstruction?: string | null;
  isNewHouse?: boolean;
}): { effective_date?: string; effective_date_type?: string } {
  const under = String(opts?.underConstruction ?? "").trim().toLowerCase();
  if (opts?.isNewHouse || under === "yes" || under === "true") {
    return {};
  }
  const base = opts?.applicationDay ? new Date(opts.applicationDay) : new Date();
  const eff = new Date(base);
  eff.setDate(eff.getDate() + 30);
  return {
    effective_date: formatFloodSheetDate(eff),
    effective_date_type: "New business",
  };
}

/** Line-scoped empty defaults (Flood coverage / construction starters). */
export function emptyDefaultsForLine(line: string | null | undefined): Record<string, string> {
  const key = String(line ?? "").trim().toLowerCase();
  if (key === "flood") {
    const under = FLOOD_SHEET_EMPTY_DEFAULTS.under_construction;
    return {
      ...FLOOD_SHEET_EMPTY_DEFAULTS,
      ...floodEffectiveDateDefault({ underConstruction: under }),
    };
  }
  if (key === "life") return { product_type: "Term" };
  if (key === "health") return { plan_type: "Marketplace" };
  if (key === "workers_comp") return { coverage_lines: "Workers' Comp", premises_same_as_business: "Yes" };
  if (key === "general_liability") {
    return { coverage_lines: "General Liability", premises_same_as_business: "Yes" };
  }
  if (key === "bop") return { coverage_lines: "BOP", premises_same_as_business: "Yes" };
  return {};
}


/** NFIP flood foundation types (FEMA FF-206 application). */
export const FLOOD_FOUNDATION_OPTIONS = [
  "Slab on grade (non-elevated)",
  "Basement (non-elevated)",
  "Crawlspace (elevated or sub-grade)",
  "Elevated without enclosure (posts/piles/piers)",
  "Elevated with enclosure on posts/piles/piers",
  "Elevated with enclosure not on posts (solid walls)",
] as const;

/** NFIP-ish building occupancy buckets for flood quote sheet. */
export const FLOOD_OCCUPANCY_OPTIONS = [
  "Single-family",
  "2–4 family",
  "Other residential",
  "Residential condo building",
  "Residential condo unit",
  "Mobile / manufactured home",
  "Non-residential / commercial",
  "Detached garage / guest house",
  "Other",
] as const;

/**
 * Flood occupancy use — home USAGE_OPTIONS plus Other.
 * Legacy catalog label "Primary / Owner" normalizes to Primary.
 */
export const FLOOD_OCCUPANCY_USE_OPTIONS = [...USAGE_OPTIONS, "Other"] as const;

/** Flood dwelling / building type — existing FitFirst flood catalog list. */
export const FLOOD_BUILDING_TYPE_OPTIONS = [
  "Single-family",
  "Townhouse",
  "Condo",
  "2-4 family",
  "Other",
] as const;

/** Flood effective-date type — existing FitFirst flood catalog list. */
export const FLOOD_EFFECTIVE_DATE_TYPE_OPTIONS = [
  "New business",
  "Renewal",
  "Rewrite",
  "Other",
] as const;

/** Why requesting this flood quote — existing FitFirst flood catalog list. */
export const FLOOD_QUOTE_REASON_OPTIONS = [
  "Shopping / comparison",
  "New purchase",
  "No current flood — shopping",
  "Other",
] as const;

/**
 * Flood building / contents deductibles.
 * AOP dollar set plus 1250 / 10000 (common NFIP). Default remains "1000".
 * QR Flood harvest strings were not in-repo.
 */
export const FLOOD_DEDUCTIBLE_OPTIONS = [
  "500",
  "1000",
  "1250",
  "1500",
  "2000",
  "2500",
  "5000",
  "10000",
] as const;

/** Common GL/BOP liability occurrence limits. */
export const GL_OCCURRENCE_LIMIT_OPTIONS = [
  "$300,000",
  "$500,000",
  "$1,000,000",
  "$2,000,000",
] as const;

/** Common GL aggregate limits. */
export const GL_AGGREGATE_LIMIT_OPTIONS = [
  "$600,000",
  "$1,000,000",
  "$2,000,000",
  "$4,000,000",
] as const;

/** GL claims basis. */
export const GL_CLAIMS_BASIS_OPTIONS = ["Occurrence", "Claims-made"] as const;

/** Construction types shared by BOP / commercial property. */
export const BOP_CONSTRUCTION_OPTIONS = [
  "Frame",
  "Joisted masonry",
  "Non-combustible",
  "Masonry non-combustible",
  "Modified fire resistive",
  "Fire resistive",
] as const;

/** Life product types — locked lean Risk Profile (Captain / Javy 2026-09-16). */
export const LIFE_PRODUCT_TYPE_OPTIONS = [
  "Term",
  "Whole Life",
  "Universal Life",
  "Indexed Universal Life",
  "Variable Universal Life",
  "Final Expense",
] as const;

/** Term length — shown only when product type is Term. */
export const LIFE_TERM_YEARS_OPTIONS = ["10", "15", "20", "30"] as const;

export const LIFE_PREMIUM_MODE_OPTIONS = [
  "Monthly",
  "Quarterly",
  "Annually",
] as const;

export const LIFE_PURPOSE_OPTIONS = [
  "Income replacement",
  "Estate planning",
  "Final expenses",
  "Business",
  "Mortgage payoff",
  "Other",
] as const;

export {
  LIFE_LEAN_MEDICAL_CONDITION_OPTIONS,
  LIFE_MATRIX_MEDICAL_CONDITION_OPTIONS,
  LIFE_MEDICAL_CONDITION_OPTIONS,
} from "@/lib/life/conditions";

export const TOBACCO_TYPE_OPTIONS = [
  "Cigarettes",
  "Cigars",
  "Chewing",
  "Vape",
  "Other",
] as const;

export const LIFE_HEIGHT_FT_OPTIONS = ["4", "5", "6", "7"] as const;
export const LIFE_HEIGHT_IN_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"] as const;

/** Industry personal-life tobacco / nicotine status (not a carrier table). */
export const TOBACCO_STATUS_OPTIONS = ["Never", "Former", "Current"] as const;

export const NICOTINE_TYPE_OPTIONS = [
  "None",
  "Cigarettes",
  "Cigars",
  "Pipe",
  "Chewing / dip",
  "Vape / e-cigarette",
  "Patch / gum / lozenge",
  "Other",
] as const;

export const LAST_NICOTINE_USE_OPTIONS = [
  "Never",
  "Within 12 months",
  "1–2 years",
  "2–3 years",
  "3+ years",
] as const;

/** Preferred / standard / table — generic PL life classes, not a carrier UW grid. */
export const LIFE_HEALTH_CLASS_OPTIONS = [
  "Preferred Plus",
  "Preferred",
  "Standard Plus",
  "Standard",
  "Table rated",
  "Uninsurable / decline",
  "Unknown",
] as const;

export const RESIDENCY_STATUS_OPTIONS = [
  "U.S. citizen",
  "Permanent resident",
  "Other",
] as const;

export const BENEFICIARY_SHARE_OPTIONS = [
  "100% primary",
  "Split (see notes)",
  "Other",
] as const;

/** Health coverage type — locked lean Risk Profile (Javy 2026-09-16). */
export const HEALTH_PLAN_TYPE_OPTIONS = [
  "Marketplace",
  "Medicare",
  "Medicare Advantage",
  "Medicare Supplement",
  "Dental",
  "Vision",
  "Short-term",
  "Other",
] as const;

/** Medicare block — same family as Medicare / MA / Medigap. */
export const MEDICARE_COVERAGE_TYPES = [
  "Medicare",
  "Medicare Advantage",
  "Medicare Supplement",
] as const;

/** Leftover desk / sheet labels that still open the Medicare block. */
export const MEDICARE_COVERAGE_ALIASES = ["Medicare A&B", "Supplemental"] as const;

export const MEDICARE_COVERAGE_SHOW_VALUES = [
  ...MEDICARE_COVERAGE_TYPES,
  ...MEDICARE_COVERAGE_ALIASES,
] as const;

/** Network type already used on Health deal-details custom fields. */
export const HEALTH_NETWORK_TYPE_OPTIONS = ["PPO", "HMO", "EPO", "HDHP"] as const;

export const HEALTH_METAL_LEVEL_OPTIONS = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
] as const;

export const HEALTH_COST_PREF_OPTIONS = ["Low", "Medium", "High"] as const;

export const HEALTH_MEDICAL_CONDITION_OPTIONS = [
  "None",
  "Diabetes",
  "High blood pressure",
  "Heart disease",
  "Asthma",
  "COPD",
  "Cancer",
  "Kidney disease",
  "Mental health condition",
  "Arthritis",
  "Thyroid disorder",
  "Sleep apnea",
  "Other",
] as const;

export const HEALTH_QLE_TYPE_OPTIONS = [
  "Lost other coverage",
  "Moved",
  "Marriage / divorce",
  "Birth or adoption",
  "Income / household change",
  "Other",
] as const;

export const HEALTH_DEPENDENT_SLOT_COUNT = 4;

export const HOUSEHOLD_SIZE_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8+"] as const;

export const TAX_FILING_STATUS_OPTIONS = [
  "Single",
  "Married filing jointly",
  "Married filing separately",
  "Head of household",
  "Other",
] as const;

/** Generic household income bands for Marketplace quoting prep (not FPL tables). */
export const HOUSEHOLD_INCOME_BAND_OPTIONS = [
  "Under $20,000",
  "$20,000 – $29,999",
  "$30,000 – $39,999",
  "$40,000 – $49,999",
  "$50,000 – $74,999",
  "$75,000 – $99,999",
  "$100,000 – $149,999",
  "$150,000+",
  "Unknown / not provided",
] as const;

export const HEALTH_EFFECTIVE_DATE_TYPE_OPTIONS = [
  "Open enrollment (OEP)",
  "Special enrollment (SEP)",
  "Medicare AEP",
  "New to Medicare",
  "Newborn / new dependent",
  "Loss of coverage",
  "Other",
] as const;

export const HEALTH_SEP_REASON_OPTIONS = [
  "None / open enrollment",
  "Lost other coverage",
  "Moved",
  "Marriage / divorce",
  "Birth or adoption",
  "Income / household change",
  "Other qualifying event",
] as const;

export const MEDICARE_PARTS_OPTIONS = [
  "None",
  "Part A only",
  "Part B only",
  "Parts A & B",
] as const;

export function normalizePicklistOption(
  raw: string | null | undefined,
  options: readonly string[],
): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  return options.find((opt) => opt.toLowerCase() === lower) ?? "";
}

export function normalizeTobaccoStatus(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/[_-]+/g, " ");
  const hit = normalizePicklistOption(text, TOBACCO_STATUS_OPTIONS);
  if (hit) return hit;
  if (lower === "no" || lower.includes("never") || lower.includes("non smoker") || lower.includes("nonsmoker")) {
    return "Never";
  }
  if (lower.includes("former") || lower.includes("quit") || lower.includes("ex smoker")) return "Former";
  if (lower === "yes" || lower === "smoker" || lower.includes("current")) return "Current";
  return "";
}

export function normalizeLifeProductType(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const hit = normalizePicklistOption(text, LIFE_PRODUCT_TYPE_OPTIONS);
  if (hit) return hit;
  const lower = text.toLowerCase().replace(/[_-]+/g, " ");
  if (lower.includes("final")) return "Final Expense";
  if (lower.includes("whole")) return "Whole Life";
  if (lower === "iul" || lower.includes("indexed")) return "Indexed Universal Life";
  if (lower === "vul" || lower.includes("variable")) return "Variable Universal Life";
  if (lower === "ul" || lower.includes("universal")) return "Universal Life";
  if (lower.includes("term")) return "Term";
  return "";
}

export function isLifeTermProduct(raw: string | null | undefined): boolean {
  const normalized = normalizeLifeProductType(raw) || (raw ?? "").trim();
  return /^term(\s*life)?$/i.test(normalized);
}

export function normalizeHealthPlanType(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const hit = normalizePicklistOption(text, HEALTH_PLAN_TYPE_OPTIONS);
  if (hit) return hit;
  const lower = text.toLowerCase().replace(/[_-]+/g, " ");
  if (lower.includes("advantage") || lower === "mapd" || lower === "ma") return "Medicare Advantage";
  if (lower.includes("supplement") || lower.includes("medigap") || lower === "supplemental") {
    return "Medicare Supplement";
  }
  if (
    lower.includes("a&b") ||
    lower.includes("a and b") ||
    lower.includes("original medicare") ||
    lower.includes("medicare a") ||
    lower === "medicare"
  ) {
    return "Medicare";
  }
  if (lower.includes("dental")) return "Dental";
  if (lower.includes("vision")) return "Vision";
  if (lower.includes("short term") || lower.includes("short-term") || lower.includes("shortterm")) {
    return "Short-term";
  }
  if (lower.includes("marketplace") || lower === "aca" || lower.includes("exchange")) return "Marketplace";
  if (lower === "other") return "Other";
  return "";
}

export function isMedicareCoverageType(raw: string | null | undefined): boolean {
  const normalized = normalizeHealthPlanType(raw) || (raw ?? "").trim();
  return (MEDICARE_COVERAGE_SHOW_VALUES as readonly string[]).some(
    (value) => value.toLowerCase() === normalized.toLowerCase(),
  );
}

export function isMarketplaceCoverageType(raw: string | null | undefined): boolean {
  const normalized = normalizeHealthPlanType(raw) || (raw ?? "").trim();
  return /^marketplace$/i.test(normalized);
}
