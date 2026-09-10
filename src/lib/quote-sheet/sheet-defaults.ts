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
export { GENDER_OPTIONS, OCCUPATION_OPTIONS } from "./applicant-core";

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

/** Months occupied — three desk buckets (Javy 2026-09-09). */
export const MONTHS_OCCUPIED_OPTIONS = [
  "0 to 3 months",
  "4 to 8 months",
  "9 months or more",
] as const;

/** Usage / how the dwelling is used (Javy 2026-09-09). */
export const USAGE_OPTIONS = [
  "Primary",
  "Secondary",
  "Seasonal",
  "Rental",
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

/** Exterior = wall type (Javy 2026-09-09 night lock). */
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

/** Construction = wall construction (11) — Javy 2026-09-09 night lock. */
export const CONSTRUCTION_OPTIONS = [
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

export const WIND_HAIL_DEDUCTIBLE_OPTIONS = ["1000", "2000", "2500"] as const;
export const HURRICANE_DEDUCTIBLE_OPTIONS = ["1%", "2%", "3%", "4%", "5%"] as const;
export const AOP_DEDUCTIBLE_OPTIONS = ["1000", "2000", "2500"] as const;

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
  // own_rent: leave blank — set per deal (Heather Own on deal sheet).
  // years_at_address / address_same_6_months / prior_address: leave blank —
  // set per deal (Heather ~1yr Tallwood + address_same_6_months yes).
  // vehicle_ownership / vehicle_N_ownership: leave blank — wait for Javy (no Heather defaults).
  // vehicle_lienholder / vehicle_N_lienholder: leave blank — set per deal (Heather Acura Financial Services).
  // vehicle_ownership_length / commute_days_week / vehicle_lienholder_other: leave blank until Javy answers.
  // original_cost_new / vehicle_N_original_cost_new (OCN / cost new): leave blank — wait for Javy (no Heather defaults).
};


const MONTHS_0_3 = "0 to 3 months";
const MONTHS_4_8 = "4 to 8 months";
const MONTHS_9_PLUS = "9 months or more";

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
    lower.includes("9 months or more")
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

/** Fill blank cells with master-sheet defaults (empty-only). */
export function applyMasterSheetDefaults(
  existing: Record<string, QuoteSheetFieldValue>,
): ApplyDefaultsResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  for (const [key, raw] of Object.entries(MASTER_SHEET_EMPTY_DEFAULTS)) {
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
  return { values, filledKeys };
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
