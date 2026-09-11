export type BusinessSectionId =
  | "at-a-glance"
  | "business-details"
  | "locations"
  | "policies"
  | "deals"
  | "timeline"
  | "emails"
  | "sms"
  | "meetings"
  | "documents"
  | "notes";

export type BusinessSectionDef = {
  id: BusinessSectionId;
  label: string;
};

/** Kept for RecordSectionNav consumers (generic jump list). */
export type RecordSectionDef = {
  id: string;
  label: string;
  adminOnly?: boolean;
};

/** Full pool + default order (top → bottom). Nav shows at most 12 selected. */
export const BUSINESS_SECTION_POOL: BusinessSectionDef[] = [
  { id: "at-a-glance", label: "At a Glance" },
  { id: "business-details", label: "Business Details" },
  { id: "locations", label: "Locations" },
  { id: "policies", label: "Policies" },
  { id: "deals", label: "Deals" },
  { id: "timeline", label: "Timeline" },
  { id: "emails", label: "Emails" },
  { id: "sms", label: "SMS" },
  { id: "meetings", label: "Meetings" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
];

/** @deprecated use BUSINESS_SECTION_POOL — alias for older imports */
export const BUSINESS_SECTIONS = BUSINESS_SECTION_POOL;

export const BUSINESS_SECTION_NAV_MAX = 12;

export const DEFAULT_BUSINESS_SECTION_NAV_IDS: BusinessSectionId[] = BUSINESS_SECTION_POOL.slice(
  0,
  BUSINESS_SECTION_NAV_MAX,
).map((s) => s.id);

const POOL_IDS = new Set<string>(BUSINESS_SECTION_POOL.map((s) => s.id));

export function isBusinessSectionId(value: string): value is BusinessSectionId {
  return POOL_IDS.has(value);
}

/** Normalize stored agency order: valid ids only, unique, max 12. Empty → default. */
export function normalizeBusinessSectionNavIds(raw: unknown): BusinessSectionId[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: BusinessSectionId[] = [];
  for (const item of list) {
    if (typeof item !== "string" || !isBusinessSectionId(item)) continue;
    if (out.includes(item)) continue;
    out.push(item);
    if (out.length >= BUSINESS_SECTION_NAV_MAX) break;
  }
  return out.length > 0 ? out : [...DEFAULT_BUSINESS_SECTION_NAV_IDS];
}

export function businessSectionDefsForNav(selectedIds: BusinessSectionId[]): BusinessSectionDef[] {
  const byId = new Map(BUSINESS_SECTION_POOL.map((s) => [s.id, s]));
  return normalizeBusinessSectionNavIds(selectedIds)
    .map((id) => byId.get(id))
    .filter((s): s is BusinessSectionDef => Boolean(s));
}

export function availableBusinessSectionDefs(selectedIds: BusinessSectionId[]): BusinessSectionDef[] {
  const selected = new Set(normalizeBusinessSectionNavIds(selectedIds));
  return BUSINESS_SECTION_POOL.filter((s) => !selected.has(s.id));
}

export function businessSectionsForRole(_isAdmin: boolean): BusinessSectionDef[] {
  return businessSectionDefsForNav(DEFAULT_BUSINESS_SECTION_NAV_IDS);
}

export function canAskTeammateOnBusiness(_isAdmin: boolean): boolean {
  return false;
}

export function relatedIdsFromEntity(entityType: string, entityId: string) {
  return {
    contactId: entityType === "contact" ? entityId : null,
    accountId: entityType === "account" ? entityId : null,
    policyId: entityType === "policy" ? entityId : null,
    dealId: entityType === "deal" ? entityId : null,
    leadId: entityType === "lead" ? entityId : null,
  };
}
