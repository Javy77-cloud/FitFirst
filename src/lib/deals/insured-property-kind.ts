import type { CustomFieldDef, FieldLayout } from "@/lib/custom-fields/types";

/** Deal Details + Risk Profile control: is the insured location the person’s home? */
export const INSURED_PROPERTY_KIND_KEY = "insured_property_kind";

export const INSURED_PROPERTY_KIND_PRIMARY = "Primary residence";
export const INSURED_PROPERTY_KIND_SECONDARY = "Rental / secondary";

export const INSURED_PROPERTY_KIND_OPTIONS = [
  INSURED_PROPERTY_KIND_PRIMARY,
  INSURED_PROPERTY_KIND_SECONDARY,
] as const;

export type InsuredPropertyKind = "primary" | "secondary";

export const INSURED_PROPERTY_KIND_FIELD: CustomFieldDef = {
  key: INSURED_PROPERTY_KIND_KEY,
  label: "Property use",
  type: "picklist",
  options: [...INSURED_PROPERTY_KIND_OPTIONS],
};

const PRIMARY_HINT =
  /\b(ho[3586]|homeowners?|owner[- ]?occup|primary|owner)\b/i;
const SECONDARY_HINT =
  /\b(dp[13]|landlord|rental|seasonal|airbnb|investment|secondary|vacant|tenant)\b/i;

export function parseInsuredPropertyKind(
  raw: string | null | undefined,
): InsuredPropertyKind | null {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return null;
  if (
    text === "primary" ||
    text === INSURED_PROPERTY_KIND_PRIMARY.toLowerCase() ||
    text === "primary residence" ||
    text === "owner" ||
    text === "owner occupied" ||
    text === "owner-occupied"
  ) {
    return "primary";
  }
  if (
    text === "secondary" ||
    text === INSURED_PROPERTY_KIND_SECONDARY.toLowerCase() ||
    text === "rental" ||
    text === "rental / secondary" ||
    text === "seasonal" ||
    text === "vacant" ||
    text === "tenant"
  ) {
    return "secondary";
  }
  return null;
}

export function insuredPropertyKindLabel(kind: InsuredPropertyKind): string {
  return kind === "primary" ? INSURED_PROPERTY_KIND_PRIMARY : INSURED_PROPERTY_KIND_SECONDARY;
}

/** HO3 / owner-occupied → primary. DP3 / landlord / rental → rental/secondary. */
export function defaultInsuredPropertyKind(input: {
  product?: string | null;
  quotingForm?: string | null;
  sheetUsage?: string | null;
  occupancy?: string | null;
}): InsuredPropertyKind | null {
  const usage = parseInsuredPropertyKind(input.sheetUsage);
  if (usage) return usage;
  const occupancy = String(input.occupancy ?? "").trim().toLowerCase();
  if (occupancy === "tenant") return "secondary";
  const hay = `${input.product ?? ""} ${input.quotingForm ?? ""}`;
  if (SECONDARY_HINT.test(hay)) return "secondary";
  if (PRIMARY_HINT.test(hay) || occupancy === "owner") return "primary";
  return null;
}

export function resolveInsuredPropertyKind(input: {
  stored?: string | null;
  product?: string | null;
  quotingForm?: string | null;
  sheetUsage?: string | null;
  occupancy?: string | null;
}): InsuredPropertyKind | null {
  return (
    parseInsuredPropertyKind(input.stored) ??
    defaultInsuredPropertyKind({
      product: input.product,
      quotingForm: input.quotingForm,
      sheetUsage: input.sheetUsage,
      occupancy: input.occupancy,
    })
  );
}

export function isPrimaryResidence(kind: InsuredPropertyKind | null | undefined): boolean {
  return kind === "primary";
}

const HOME_ADDRESS_KEYS = ["mailing_address", "city", "state", "zip"] as const;

/** Drop insured-location address keys so they are not copied onto Contact home. */
export function omitHomeAddressIfNotPrimary<T extends Record<string, string | null | undefined>>(
  incoming: T,
  kind: InsuredPropertyKind | null,
): T {
  if (isPrimaryResidence(kind)) return incoming;
  const next = { ...incoming };
  for (const key of HOME_ADDRESS_KEYS) {
    delete next[key];
  }
  return next;
}

const ADDRESS_NOISE = /[.,#]/g;

export function normalizeAddressLine(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(ADDRESS_NOISE, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(street|st|road|rd|drive|dr|avenue|ave|lane|ln|court|ct|boulevard|blvd|point|pt)\b/g, "")
    .trim();
}

/** True when contact home looks like a linked non-primary insured location. */
export function contactAddressMatchesSecondaryProperty(input: {
  contactAddress?: string | null;
  insuredAddress?: string | null;
  kind?: InsuredPropertyKind | null;
}): boolean {
  if (input.kind !== "secondary") return false;
  const home = normalizeAddressLine(input.contactAddress);
  const insured = normalizeAddressLine(input.insuredAddress);
  if (!home || !insured) return false;
  if (home === insured) return true;
  return home.includes(insured) || insured.includes(home);
}

export function ensureInsuredPropertyKindInLayout(layout: FieldLayout): FieldLayout {
  const present = layout.columns.some((column) =>
    column.sections.some((section) => section.fieldKeys.includes(INSURED_PROPERTY_KIND_KEY)),
  );
  if (present) return layout;
  return {
    ...layout,
    columns: layout.columns.map((column) => ({
      ...column,
      sections: column.sections.map((section) => {
        if (section.id !== "insured_address" && section.label.trim().toLowerCase() !== "insured address") {
          return section;
        }
        const keys = [...section.fieldKeys];
        const at = keys.indexOf("mailing_address");
        if (at >= 0) keys.splice(at + 1, 0, INSURED_PROPERTY_KIND_KEY);
        else keys.unshift(INSURED_PROPERTY_KIND_KEY);
        return { ...section, fieldKeys: keys };
      }),
    })),
  };
}

export function needsInsuredPropertyKindLayout(layout: FieldLayout): boolean {
  return !layout.columns.some((column) =>
    column.sections.some((section) => section.fieldKeys.includes(INSURED_PROPERTY_KIND_KEY)),
  );
}
