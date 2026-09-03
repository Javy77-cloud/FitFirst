/** Live Zoho Policies picklists. Copied from the live module — do not invent values. */

export const INSURANCE_TYPES = ["Life", "Health", "P&C"] as const;
export type InsuranceType = (typeof INSURANCE_TYPES)[number];

export const POLICY_TYPES = [
  "Home",
  "Renter & Landord",
  "Auto",
  "Life",
  "Health",
  "Commercial",
  "Umbrella",
  "Flood",
  "Recreational Vehicle",
  "Other",
  "Workers' Comp",
] as const;
export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_SUB_TYPES = [
  "Commercial Auto",
  "Auto",
  "Motorcycle",
  "Rideshare (Uber/Lift)",
  "Classic/Collection",
  "HO3",
  "HO3 Wind Only",
  "HO3 X-wind",
  "HO5 (Open Perils)",
  "HO8 (Mobile Homes)",
  "HO6 ( Condo)",
  "DP1",
  "DP3",
  "HO6 with Loss Assesment",
  "HO4 (Renters)",
  "Term Life",
  "Whole Life",
  "Universal Life",
  "Indexed Universal Life (IUL)",
  "Final Expense",
  "Accidental Death",
  "Individual Health",
  "Marketplace",
  "Short-Term Medical",
  "Supplemental Health",
  "Dental",
  "Vision",
  "Medicare Advantage",
  "Medicare Supplement (Medigap)",
  "Part D (Prescription)",
  "Business Owners Policy (BOP)",
  "General Liability",
  "Commercial Property",
  "Workers' Comp",
  "Personal Umbrella",
  "Commercial Umbrella",
  "NFIP Flood",
  "Private Flood",
  "Boat Owners",
  "Yatch",
  "RV",
  "Travel Trailer",
  "Camper",
  "Specialty",
  "Excess Liability",
  "Cyber",
  "Professional Liability (E&O)",
] as const;
export type PolicySubType = (typeof POLICY_SUB_TYPES)[number];

export const PREMIUM_FREQUENCIES = ["Monthly", "Quarterly", "Semi-Annual", "Annual"] as const;
export type PremiumFrequency = (typeof PREMIUM_FREQUENCIES)[number];

export const PAYMENT_STATUSES = ["Outstanding", "Paid", "Pending", "Monthly"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const LIFE_SUBS = new Set([
  "Term Life",
  "Whole Life",
  "Universal Life",
  "Indexed Universal Life (IUL)",
  "Final Expense",
  "Accidental Death",
]);

const HEALTH_SUBS = new Set([
  "Individual Health",
  "Marketplace",
  "Short-Term Medical",
  "Supplemental Health",
  "Dental",
  "Vision",
  "Medicare Advantage",
  "Medicare Supplement (Medigap)",
  "Part D (Prescription)",
]);

const HOME_SUBS = new Set([
  "HO3",
  "HO3 Wind Only",
  "HO3 X-wind",
  "HO5 (Open Perils)",
  "HO8 (Mobile Homes)",
  "HO6 ( Condo)",
  "DP1",
  "DP3",
  "HO6 with Loss Assesment",
  "HO4 (Renters)",
]);

const AUTO_SUBS = new Set([
  "Commercial Auto",
  "Auto",
  "Motorcycle",
  "Rideshare (Uber/Lift)",
  "Classic/Collection",
]);

const COMMERCIAL_SUBS = new Set([
  "Business Owners Policy (BOP)",
  "General Liability",
  "Commercial Property",
  "Workers' Comp",
  "Cyber",
  "Professional Liability (E&O)",
  "Excess Liability",
]);

const FLOOD_SUBS = new Set(["NFIP Flood", "Private Flood"]);
const UMBRELLA_SUBS = new Set(["Personal Umbrella", "Commercial Umbrella"]);
const RV_SUBS = new Set(["Boat Owners", "Yatch", "RV", "Travel Trailer", "Camper", "Specialty"]);

export function policyTypesFor(insuranceType: string | null | undefined): readonly string[] {
  if (insuranceType === "Life") return ["Life"];
  if (insuranceType === "Health") return ["Health"];
  if (insuranceType === "P&C") {
    return POLICY_TYPES.filter((value) => value !== "Life" && value !== "Health");
  }
  return POLICY_TYPES;
}

export function subTypeFitsLine(
  policySubType: string | null | undefined,
  insuranceType: string | null | undefined,
  policyType: string | null | undefined,
): boolean {
  const sub = (policySubType ?? "").trim();
  if (!sub) return false;
  return policySubTypesFor(insuranceType, policyType).includes(sub);
}

export function policySubTypesFor(
  insuranceType: string | null | undefined,
  policyType: string | null | undefined,
): readonly string[] {
  if (insuranceType === "Life") return [...LIFE_SUBS];
  if (insuranceType === "Health") return [...HEALTH_SUBS];
  if (policyType === "Home" || policyType === "Renter & Landord") return [...HOME_SUBS];
  if (policyType === "Auto") return [...AUTO_SUBS];
  if (policyType === "Commercial" || policyType === "Workers' Comp") return [...COMMERCIAL_SUBS];
  if (policyType === "Flood") return [...FLOOD_SUBS];
  if (policyType === "Umbrella") return [...UMBRELLA_SUBS];
  if (policyType === "Recreational Vehicle") return [...RV_SUBS];
  if (insuranceType === "P&C") {
    return POLICY_SUB_TYPES.filter((value) => !LIFE_SUBS.has(value) && !HEALTH_SUBS.has(value));
  }
  return POLICY_SUB_TYPES;
}

export function lineOfBusinessFromZoho(
  insuranceType: string | null | undefined,
  policyType: string | null | undefined,
  policySubType: string | null | undefined,
): string {
  if (insuranceType === "Life") return "LIFE";
  if (insuranceType === "Health") return "HEALTH";
  const sub = policySubType ?? "";
  if (sub === "Auto" || policyType === "Auto") return "AUTO";
  if (sub.includes("Flood") || policyType === "Flood") return "FLOOD";
  if (sub.includes("Umbrella") || policyType === "Umbrella") return "UMBRELLA";
  if (sub === "Business Owners Policy (BOP)") return "BOP";
  if (sub === "General Liability" || sub === "Workers' Comp" || policyType === "Commercial") {
    return "GL";
  }
  if (
    policyType === "Home" ||
    policyType === "Renter & Landord" ||
    HOME_SUBS.has(sub)
  ) {
    return "HO";
  }
  return "HO";
}
