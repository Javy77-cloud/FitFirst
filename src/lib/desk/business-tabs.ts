import {
  BUSINESS_COMMUNICATION_SECTION_IDS,
  isBusinessCommunicationSectionId,
  isBusinessSectionId,
  type BusinessSectionId,
} from "@/lib/desk/business-sections";

/** URL `?tab=` values for Account page true panels. */
export type BusinessTabSlug =
  | "glance"
  | "details"
  | "coverage"
  | "opportunities"
  | "locations"
  | "policies"
  | "deals"
  | "timeline"
  | "communications"
  | "documents"
  | "notes";

const SECTION_TO_TAB: Record<BusinessSectionId, BusinessTabSlug> = {
  "at-a-glance": "glance",
  "business-details": "details",
  coverage: "coverage",
  opportunities: "opportunities",
  locations: "locations",
  policies: "policies",
  deals: "deals",
  timeline: "timeline",
  emails: "communications",
  sms: "communications",
  meetings: "communications",
  documents: "documents",
  notes: "notes",
};

const TAB_TO_SECTION: Record<BusinessTabSlug, BusinessSectionId> = {
  glance: "at-a-glance",
  details: "business-details",
  coverage: "coverage",
  opportunities: "opportunities",
  locations: "locations",
  policies: "policies",
  deals: "deals",
  timeline: "timeline",
  communications: "emails",
  documents: "documents",
  notes: "notes",
};

const TAB_SLUGS = new Set<string>(Object.keys(TAB_TO_SECTION));

export function isBusinessTabSlug(value: string): value is BusinessTabSlug {
  return TAB_SLUGS.has(value);
}

export function businessTabFromSection(id: BusinessSectionId): BusinessTabSlug {
  return SECTION_TO_TAB[id];
}

export function businessSectionFromTab(tab: BusinessTabSlug): BusinessSectionId {
  return TAB_TO_SECTION[tab];
}

/**
 * Resolve active Account tab from `?tab=` / legacy `?section=` / hash-friendly section id.
 * Default: At a Glance.
 */
export function parseBusinessTab(
  tabParam?: string | null,
  sectionParam?: string | null,
): BusinessTabSlug {
  if (tabParam && isBusinessTabSlug(tabParam)) return tabParam;
  if (tabParam && isBusinessSectionId(tabParam)) return businessTabFromSection(tabParam);
  if (sectionParam && isBusinessSectionId(sectionParam)) {
    return businessTabFromSection(sectionParam);
  }
  if (sectionParam && isBusinessTabSlug(sectionParam)) return sectionParam;
  return "glance";
}

/** Chip / accordion section id → panel id for true tabs. */
export function businessPanelIdForSection(id: BusinessSectionId): BusinessTabSlug {
  return businessTabFromSection(id);
}

export function isBusinessCommunicationsTab(tab: BusinessTabSlug): boolean {
  return tab === "communications";
}

export function businessCommunicationSectionIds(): BusinessSectionId[] {
  return [...BUSINESS_COMMUNICATION_SECTION_IDS];
}

export function businessSectionMatchesActiveTab(
  sectionId: BusinessSectionId,
  activeTab: BusinessTabSlug,
): boolean {
  if (activeTab === "communications") return isBusinessCommunicationSectionId(sectionId);
  return businessTabFromSection(sectionId) === activeTab;
}
