import {
  CONTACT_COMMUNICATION_SECTION_IDS,
  isContactCommunicationSectionId,
  isContactSectionId,
  type ContactSectionId,
} from "@/lib/desk/contact-sections";

/** URL `?tab=` values for Contact page true panels. */
export type ContactTabSlug =
  | "glance"
  | "details"
  | "coverage"
  | "opportunities"
  | "policies"
  | "deals"
  | "timeline"
  | "communications"
  | "documents"
  | "notes";

const SECTION_TO_TAB: Record<ContactSectionId, ContactTabSlug> = {
  "at-a-glance": "glance",
  "contact-details": "details",
  coverage: "coverage",
  opportunities: "opportunities",
  policies: "policies",
  deals: "deals",
  timeline: "timeline",
  emails: "communications",
  sms: "communications",
  meetings: "communications",
  documents: "documents",
  notes: "notes",
};

const TAB_TO_SECTION: Record<ContactTabSlug, ContactSectionId> = {
  glance: "at-a-glance",
  details: "contact-details",
  coverage: "coverage",
  opportunities: "opportunities",
  policies: "policies",
  deals: "deals",
  timeline: "timeline",
  communications: "emails",
  documents: "documents",
  notes: "notes",
};

const TAB_SLUGS = new Set<string>(Object.keys(TAB_TO_SECTION));

export function isContactTabSlug(value: string): value is ContactTabSlug {
  return TAB_SLUGS.has(value);
}

export function contactTabFromSection(id: ContactSectionId): ContactTabSlug {
  return SECTION_TO_TAB[id];
}

export function contactSectionFromTab(tab: ContactTabSlug): ContactSectionId {
  return TAB_TO_SECTION[tab];
}

/**
 * Resolve active Contact tab from `?tab=` / legacy `?section=` / hash-friendly section id.
 * Default: At a Glance.
 */
export function parseContactTab(
  tabParam?: string | null,
  sectionParam?: string | null,
): ContactTabSlug {
  if (tabParam && isContactTabSlug(tabParam)) return tabParam;
  if (tabParam && isContactSectionId(tabParam)) return contactTabFromSection(tabParam);
  if (sectionParam && isContactSectionId(sectionParam)) {
    return contactTabFromSection(sectionParam);
  }
  if (sectionParam && isContactTabSlug(sectionParam)) return sectionParam;
  return "glance";
}

/** Chip / accordion section id → panel id for true tabs. */
export function contactPanelIdForSection(id: ContactSectionId): ContactTabSlug {
  return contactTabFromSection(id);
}

export function isCommunicationsTab(tab: ContactTabSlug): boolean {
  return tab === "communications";
}

export function communicationSectionIds(): ContactSectionId[] {
  return [...CONTACT_COMMUNICATION_SECTION_IDS];
}

export function sectionMatchesActiveTab(
  sectionId: ContactSectionId,
  activeTab: ContactTabSlug,
): boolean {
  if (activeTab === "communications") return isContactCommunicationSectionId(sectionId);
  return contactTabFromSection(sectionId) === activeTab;
}
