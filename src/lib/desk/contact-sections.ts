export type ContactSectionId =
  | "at-a-glance"
  | "contact-details"
  | "policies"
  | "deals"
  | "timeline"
  | "emails"
  | "sms"
  | "meetings"
  | "documents"
  | "notes";

export type ContactSectionDef = {
  id: ContactSectionId;
  label: string;
};

/** Full pool + default order (top → bottom). Nav shows at most 12 selected. */
export const CONTACT_SECTION_POOL: ContactSectionDef[] = [
  { id: "at-a-glance", label: "At a Glance" },
  { id: "contact-details", label: "Contact Details" },
  { id: "policies", label: "Policies" },
  { id: "deals", label: "Deals" },
  { id: "timeline", label: "Timeline" },
  { id: "emails", label: "Emails" },
  { id: "sms", label: "SMS" },
  { id: "meetings", label: "Meetings" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
];

/** @deprecated use CONTACT_SECTION_POOL — kept alias for older imports */
export const CONTACT_SECTIONS = CONTACT_SECTION_POOL;

export const CONTACT_SECTION_NAV_MAX = 12;

export const DEFAULT_CONTACT_SECTION_NAV_IDS: ContactSectionId[] = CONTACT_SECTION_POOL.slice(
  0,
  CONTACT_SECTION_NAV_MAX,
).map((s) => s.id);

const POOL_IDS = new Set<string>(CONTACT_SECTION_POOL.map((s) => s.id));

export function isContactSectionId(value: string): value is ContactSectionId {
  return POOL_IDS.has(value);
}

/** Normalize stored agency order: valid ids only, unique, max 12. Empty → default. */
export function normalizeContactSectionNavIds(raw: unknown): ContactSectionId[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: ContactSectionId[] = [];
  for (const item of list) {
    if (typeof item !== "string" || !isContactSectionId(item)) continue;
    if (out.includes(item)) continue;
    out.push(item);
    if (out.length >= CONTACT_SECTION_NAV_MAX) break;
  }
  return out.length > 0 ? out : [...DEFAULT_CONTACT_SECTION_NAV_IDS];
}

export function contactSectionDefsForNav(selectedIds: ContactSectionId[]): ContactSectionDef[] {
  const byId = new Map(CONTACT_SECTION_POOL.map((s) => [s.id, s]));
  return normalizeContactSectionNavIds(selectedIds)
    .map((id) => byId.get(id))
    .filter((s): s is ContactSectionDef => Boolean(s));
}

export function availableContactSectionDefs(selectedIds: ContactSectionId[]): ContactSectionDef[] {
  const selected = new Set(normalizeContactSectionNavIds(selectedIds));
  return CONTACT_SECTION_POOL.filter((s) => !selected.has(s.id));
}

export function contactSectionsForRole(_isAdmin: boolean): ContactSectionDef[] {
  return contactSectionDefsForNav(DEFAULT_CONTACT_SECTION_NAV_IDS);
}

export function canAskTeammateOnContact(_isAdmin: boolean): boolean {
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
