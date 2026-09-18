export type ContactSectionId =
  | "at-a-glance"
  | "contact-details"
  | "coverage"
  | "opportunities"
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

/** Emails + SMS + Meetings — one Communications chip in the top nav. */
export const CONTACT_COMMUNICATION_SECTION_IDS = ["emails", "sms", "meetings"] as const;
export type ContactCommunicationSectionId = (typeof CONTACT_COMMUNICATION_SECTION_IDS)[number];

export const CONTACT_COMMUNICATIONS_CHIP_ID = "communications";

export function isContactCommunicationSectionId(
  value: string,
): value is ContactCommunicationSectionId {
  return (CONTACT_COMMUNICATION_SECTION_IDS as readonly string[]).includes(value);
}

export type ContactNavChip =
  | { kind: "section"; id: ContactSectionId; label: string }
  | {
      kind: "communications";
      id: typeof CONTACT_COMMUNICATIONS_CHIP_ID;
      label: "Communications";
      children: ContactSectionDef[];
    };

export function communicationCountSum(
  counts: Partial<Record<ContactSectionId, number>> | undefined,
): number {
  return CONTACT_COMMUNICATION_SECTION_IDS.reduce(
    (sum, id) => sum + (counts?.[id] ?? 0),
    0,
  );
}

/** Collapse Emails/SMS/Meetings into one Communications chip for the top bar. */
export function contactNavChips(selectedIds: ContactSectionId[]): ContactNavChip[] {
  const defs = contactSectionDefsForNav(selectedIds);
  const chips: ContactNavChip[] = [];
  let sawCommunications = false;
  for (const def of defs) {
    if (isContactCommunicationSectionId(def.id)) {
      if (sawCommunications) continue;
      sawCommunications = true;
      chips.push({
        kind: "communications",
        id: CONTACT_COMMUNICATIONS_CHIP_ID,
        label: "Communications",
        children: CONTACT_COMMUNICATION_SECTION_IDS.map((id) => {
          const found = CONTACT_SECTION_POOL.find((section) => section.id === id);
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
export function contactCustomizeDefs(selectedIds: ContactSectionId[]): {
  selected: Array<ContactSectionDef | { id: typeof CONTACT_COMMUNICATIONS_CHIP_ID; label: "Communications" }>;
  available: Array<ContactSectionDef | { id: typeof CONTACT_COMMUNICATIONS_CHIP_ID; label: "Communications" }>;
} {
  const normalized = normalizeContactSectionNavIds(selectedIds);
  const selectedHasComms = normalized.some(isContactCommunicationSectionId);
  const selected: Array<
    ContactSectionDef | { id: typeof CONTACT_COMMUNICATIONS_CHIP_ID; label: "Communications" }
  > = [];
  let sawComms = false;
  for (const id of normalized) {
    if (isContactCommunicationSectionId(id)) {
      if (sawComms) continue;
      sawComms = true;
      selected.push({ id: CONTACT_COMMUNICATIONS_CHIP_ID, label: "Communications" });
      continue;
    }
    const def = CONTACT_SECTION_POOL.find((section) => section.id === id);
    if (def) selected.push(def);
  }
  const available = CONTACT_SECTION_POOL.filter(
    (section) =>
      !isContactCommunicationSectionId(section.id) && !normalized.includes(section.id),
  ) as Array<ContactSectionDef | { id: typeof CONTACT_COMMUNICATIONS_CHIP_ID; label: "Communications" }>;
  if (!selectedHasComms) {
    available.push({ id: CONTACT_COMMUNICATIONS_CHIP_ID, label: "Communications" });
  }
  return { selected, available };
}

export function addCommunicationsToNav(selectedIds: ContactSectionId[]): ContactSectionId[] {
  if (selectedIds.some(isContactCommunicationSectionId)) return selectedIds;
  if (selectedIds.length + CONTACT_COMMUNICATION_SECTION_IDS.length > CONTACT_SECTION_NAV_MAX) {
    return selectedIds;
  }
  return normalizeContactSectionNavIds([...selectedIds, ...CONTACT_COMMUNICATION_SECTION_IDS]);
}

export function removeCommunicationsFromNav(selectedIds: ContactSectionId[]): ContactSectionId[] {
  return selectedIds.filter((id) => !isContactCommunicationSectionId(id));
}

export function reorderNavTreatingCommunications(
  selectedIds: ContactSectionId[],
  fromId: string,
  toId: string,
): ContactSectionId[] {
  const chips = contactCustomizeDefs(selectedIds).selected.map((item) => item.id);
  const from = chips.indexOf(fromId as ContactSectionId | typeof CONTACT_COMMUNICATIONS_CHIP_ID);
  const to = chips.indexOf(toId as ContactSectionId | typeof CONTACT_COMMUNICATIONS_CHIP_ID);
  if (from < 0 || to < 0 || from === to) return selectedIds;
  const next = [...chips];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  const expanded: ContactSectionId[] = [];
  for (const id of next) {
    if (id === CONTACT_COMMUNICATIONS_CHIP_ID) {
      expanded.push(...CONTACT_COMMUNICATION_SECTION_IDS);
    } else if (isContactSectionId(id)) {
      expanded.push(id);
    }
  }
  return normalizeContactSectionNavIds(expanded);
}

/** Full pool + default order (top → bottom). Nav shows at most 12 selected. */
export const CONTACT_SECTION_POOL: ContactSectionDef[] = [
  { id: "at-a-glance", label: "At a Glance" },
  { id: "contact-details", label: "Contact Details" },
  { id: "coverage", label: "Coverage" },
  { id: "opportunities", label: "Opportunities" },
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
export const LEGACY_CONTACT_SECTION_NAV_IDS: ContactSectionId[] = [
  "at-a-glance",
  "contact-details",
  "policies",
  "deals",
  "timeline",
  "emails",
  "sms",
  "meetings",
  "documents",
  "notes",
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
  if (out.length > 0 && sameSectionIds(out, LEGACY_CONTACT_SECTION_NAV_IDS)) {
    return [...DEFAULT_CONTACT_SECTION_NAV_IDS];
  }
  return out.length > 0 ? out : [...DEFAULT_CONTACT_SECTION_NAV_IDS];
}

function sameSectionIds(left: ContactSectionId[], right: ContactSectionId[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
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
