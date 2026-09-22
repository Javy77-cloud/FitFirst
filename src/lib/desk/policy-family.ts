import { inferLineFamily, type LineFamily } from "@/lib/desk/commission-line";
import { homeLineKey } from "@/lib/home/lines";
import { lineOfBusinessFromZoho, policyTypesFor, policySubTypesFor } from "@/lib/commissions/zoho-fields";
import { policyStatusColor, statusColorClass } from "@/lib/desk/status-colors";

export const INSURANCE_FAMILIES = ["Life", "Health", "P&C"] as const;
export type InsuranceFamily = (typeof INSURANCE_FAMILIES)[number];

export type PolicyStatusTone = "green" | "yellow" | "red";

export const POLICY_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "bound", label: "Bound" },
  { value: "pending", label: "Pending" },
  { value: "lapse", label: "Lapse" },
  { value: "cancellation", label: "Cancellation" },
  { value: "non_renewal", label: "Non-renewal" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
] as const;

/** Active green; Lapse / Bound yellow; everything else red. */
export function policyStatusTone(status: string | null | undefined): PolicyStatusTone {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "active") return "green";
  if (value === "bound" || value === "lapse" || value === "lapsed") return "yellow";
  return "red";
}

export function policyStatusClass(status: string | null | undefined): string {
  return statusColorClass(policyStatusColor(status));
}

export const POLICY_TERMS_BY_FAMILY: Record<InsuranceFamily, readonly string[]> = {
  Life: ["10 Year", "15 Year", "20 Year", "30 Year", "Whole Life", "To Age 65", "To Age 100"],
  Health: ["Annual", "Monthly", "Continuous"],
  "P&C": ["6 Months", "12 Months", "3 Months"],
};

/** Policy Documents attach + FileActionMenu Change type. Order matches Documents tab. */
export const DOCUMENT_CATEGORIES = [
  { value: "policy_dec", label: "Issued declaration page" },
  { value: "policy_complete", label: "Complete policy" },
  { value: "policy_id", label: "ID card" },
  { value: "endorsement", label: "Endorsement" },
  { value: "application", label: "Application" },
  { value: "binder", label: "Binder" },
  { value: "aor", label: "AOR packet" },
  { value: "coi", label: "COI" },
  { value: "inspection", label: "Inspection" },
] as const;

/** @deprecated alias — prefer DOCUMENT_CATEGORIES */
export const POLICY_ATTACH_DOC_TYPES = DOCUMENT_CATEGORIES;

export function insuranceFamilyFromPolicy(input: {
  insuranceType?: string | null;
  commissionFamily?: string | null;
  lineOfBusiness?: string | null;
  policySubType?: string | null;
}): InsuranceFamily {
  const raw = (input.insuranceType ?? "").trim();
  if (raw === "Life" || raw === "Health" || raw === "P&C") return raw;
  const family = inferLineFamily(
    input.lineOfBusiness ?? "",
    input.commissionFamily,
    input.policySubType,
  );
  if (family === "life") return "Life";
  if (family === "health_marketplace" || family === "medicare_advantage" || family === "other_health") {
    return "Health";
  }
  return "P&C";
}

export function policyTypeFromLine(
  lineOfBusiness: string | null | undefined,
  family: InsuranceFamily,
): string {
  if (family === "Life") return "Life";
  if (family === "Health") return "Health";
  const key = homeLineKey(lineOfBusiness ?? "");
  if (key === "AUTO") return "Auto";
  if (key === "FLOOD") return "Flood";
  if (key === "COMMERCIAL") return "Commercial";
  if (key === "HO") return "Home";
  return "Home";
}

export function commissionFamilyFromInsurance(
  family: InsuranceFamily,
  subType?: string | null,
): LineFamily {
  if (family === "Life") return "life";
  if (family === "Health") {
    const blob = (subType ?? "").toLowerCase();
    if (blob.includes("marketplace")) return "health_marketplace";
    if (blob.includes("medicare advantage") || blob === "ma") return "medicare_advantage";
    return "other_health";
  }
  return "pc";
}

export function lineOfBusinessForFamily(
  family: InsuranceFamily,
  policyType?: string | null,
  policySubType?: string | null,
): string {
  return lineOfBusinessFromZoho(family, policyType, policySubType);
}

export function typesForFamily(family: InsuranceFamily): readonly string[] {
  return policyTypesFor(family);
}

export function subTypesForFamily(
  family: InsuranceFamily,
  policyType?: string | null,
): readonly string[] {
  return policySubTypesFor(family, policyType);
}

export function termsForFamily(family: InsuranceFamily): readonly string[] {
  return POLICY_TERMS_BY_FAMILY[family];
}

export function addCalendarYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + years,
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    ),
  );
}

export function addCalendarMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    ),
  );
}

/** Zoho-style term → expiration. Whole Life / Continuous / To Age keep the existing date. */
export function expirationFromTerm(
  effective: Date,
  term: string | null | undefined,
  fallback?: Date | null,
): Date | null {
  const label = (term ?? "").trim();
  if (!label) return fallback ?? null;
  const yearMatch = label.match(/^(\d+)\s*Year/i);
  if (yearMatch) return addCalendarYears(effective, Number(yearMatch[1]));
  if (/^12\s*Months?$/i.test(label) || /^Annual$/i.test(label)) return addCalendarMonths(effective, 12);
  if (/^6\s*Months?$/i.test(label)) return addCalendarMonths(effective, 6);
  if (/^3\s*Months?$/i.test(label)) return addCalendarMonths(effective, 3);
  if (/^Monthly$/i.test(label)) return addCalendarMonths(effective, 1);
  return fallback ?? null;
}

export function defaultTermForFamily(family: InsuranceFamily): string {
  if (family === "Life") return "20 Year";
  if (family === "Health") return "Annual";
  return "12 Months";
}

export function premiumLabel(family: InsuranceFamily, subType?: string | null): string {
  if (family === "P&C") return "Annual premium";
  const blob = (subType ?? "").toLowerCase();
  if (family === "Health" && blob.includes("marketplace")) return "PMPM ($)";
  return "Premium";
}
