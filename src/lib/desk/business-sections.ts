export type BusinessSectionId =
  | "at-a-glance"
  | "business-details"
  | "coverage"
  | "opportunities"
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

/** Emails + SMS + Meetings — one Communications chip in the top nav. */
export const BUSINESS_COMMUNICATION_SECTION_IDS = ["emails", "sms", "meetings"] as const;
export type BusinessCommunicationSectionId = (typeof BUSINESS_COMMUNICATION_SECTION_IDS)[number];

export const BUSINESS_COMMUNICATIONS_CHIP_ID = "communications";

export function isBusinessCommunicationSectionId(
  value: string,
): value is BusinessCommunicationSectionId {
  return (BUSINESS_COMMUNICATION_SECTION_IDS as readonly string[]).includes(value);
}

export type BusinessNavChip =
  | { kind: "section"; id: BusinessSectionId; label: string }
  | {
      kind: "communications";
      id: typeof BUSINESS_COMMUNICATIONS_CHIP_ID;
      label: "Communications";
      children: BusinessSectionDef[];
    };

export function businessCommunicationCountSum(
  counts: Partial<Record<BusinessSectionId, number>> | undefined,
): number {
  return BUSINESS_COMMUNICATION_SECTION_IDS.reduce(
    (sum, id) => sum + (counts?.[id] ?? 0),
    0,
  );
}

/** Collapse Emails/SMS/Meetings into one Communications chip for the top bar. */
export function businessNavChips(selectedIds: BusinessSectionId[]): BusinessNavChip[] {
  const defs = businessSectionDefsForNav(selectedIds);
  const chips: BusinessNavChip[] = [];
  let sawCommunications = false;
  for (const def of defs) {
    if (isBusinessCommunicationSectionId(def.id)) {
      if (sawCommunications) continue;
      sawCommunications = true;
      chips.push({
        kind: "communications",
        id: BUSINESS_COMMUNICATIONS_CHIP_ID,
        label: "Communications",
        children: BUSINESS_COMMUNICATION_SECTION_IDS.map((id) => {
          const found = BUSINESS_SECTION_POOL.find((section) => section.id === id);
          return found ?? { id, label: id };
        }),
      });
      continue;
    }
    chips.push({ kind: "section", id: def.id, label: def.label });
  }
  return chips;
}

/** Customize dialog: one Communications row instead of Emails / SMS / Meetings. */
export function businessCustomizeDefs(selectedIds: BusinessSectionId[]): {
  selected: Array<
    BusinessSectionDef | { id: typeof BUSINESS_COMMUNICATIONS_CHIP_ID; label: "Communications" }
  >;
  available: Array<
    BusinessSectionDef | { id: typeof BUSINESS_COMMUNICATIONS_CHIP_ID; label: "Communications" }
  >;
} {
  const normalized = normalizeBusinessSectionNavIds(selectedIds);
  const selectedHasComms = normalized.some(isBusinessCommunicationSectionId);
  const selected: Array<
    BusinessSectionDef | { id: typeof BUSINESS_COMMUNICATIONS_CHIP_ID; label: "Communications" }
  > = [];
  let sawComms = false;
  for (const id of normalized) {
    if (isBusinessCommunicationSectionId(id)) {
      if (sawComms) continue;
      sawComms = true;
      selected.push({ id: BUSINESS_COMMUNICATIONS_CHIP_ID, label: "Communications" });
      continue;
    }
    const def = BUSINESS_SECTION_POOL.find((section) => section.id === id);
    if (def) selected.push(def);
  }
  const available = BUSINESS_SECTION_POOL.filter(
    (section) =>
      !isBusinessCommunicationSectionId(section.id) && !normalized.includes(section.id),
  ) as Array<
    BusinessSectionDef | { id: typeof BUSINESS_COMMUNICATIONS_CHIP_ID; label: "Communications" }
  >;
  if (!selectedHasComms) {
    available.push({ id: BUSINESS_COMMUNICATIONS_CHIP_ID, label: "Communications" });
  }
  return { selected, available };
}

export function addBusinessCommunicationsToNav(selectedIds: BusinessSectionId[]): BusinessSectionId[] {
  if (selectedIds.some(isBusinessCommunicationSectionId)) return selectedIds;
  if (selectedIds.length + BUSINESS_COMMUNICATION_SECTION_IDS.length > BUSINESS_SECTION_NAV_MAX) {
    return selectedIds;
  }
  return normalizeBusinessSectionNavIds([...selectedIds, ...BUSINESS_COMMUNICATION_SECTION_IDS]);
}

export function removeBusinessCommunicationsFromNav(
  selectedIds: BusinessSectionId[],
): BusinessSectionId[] {
  return selectedIds.filter((id) => !isBusinessCommunicationSectionId(id));
}

export function reorderBusinessNavTreatingCommunications(
  selectedIds: BusinessSectionId[],
  fromId: string,
  toId: string,
): BusinessSectionId[] {
  const chips = businessCustomizeDefs(selectedIds).selected.map((item) => item.id);
  const from = chips.indexOf(fromId as BusinessSectionId | typeof BUSINESS_COMMUNICATIONS_CHIP_ID);
  const to = chips.indexOf(toId as BusinessSectionId | typeof BUSINESS_COMMUNICATIONS_CHIP_ID);
  if (from < 0 || to < 0 || from === to) return selectedIds;
  const next = [...chips];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  const expanded: BusinessSectionId[] = [];
  for (const id of next) {
    if (id === BUSINESS_COMMUNICATIONS_CHIP_ID) {
      expanded.push(...BUSINESS_COMMUNICATION_SECTION_IDS);
    } else if (isBusinessSectionId(id)) {
      expanded.push(id);
    }
  }
  return normalizeBusinessSectionNavIds(expanded);
}

/** Full pool + default order (top → bottom). Nav shows at most 12 selected. */
export const BUSINESS_SECTION_POOL: BusinessSectionDef[] = [
  { id: "at-a-glance", label: "At a Glance" },
  { id: "business-details", label: "Business Details" },
  { id: "coverage", label: "Coverage" },
  { id: "opportunities", label: "Opportunities" },
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

/** Pre-Coverage/Opportunities chip default. Upgrade only this stock list. */
export const LEGACY_BUSINESS_SECTION_NAV_IDS: BusinessSectionId[] = [
  "at-a-glance",
  "business-details",
  "locations",
  "policies",
  "deals",
  "timeline",
  "emails",
  "sms",
  "meetings",
  "documents",
  "notes",
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
  if (out.length > 0 && sameSectionIds(out, LEGACY_BUSINESS_SECTION_NAV_IDS)) {
    return [...DEFAULT_BUSINESS_SECTION_NAV_IDS];
  }
  return out.length > 0 ? out : [...DEFAULT_BUSINESS_SECTION_NAV_IDS];
}

function sameSectionIds(left: BusinessSectionId[], right: BusinessSectionId[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
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
