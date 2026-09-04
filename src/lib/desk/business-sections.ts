import { canAskTeammate } from "@/lib/desk/record-asks";

export type BusinessSectionId =
  | "overview"
  | "information"
  | "address"
  | "policies"
  | "deals"
  | "people"
  | "locations"
  | "certificates"
  | "ask"
  | "work"
  | "timeline";

export type BusinessSectionDef = {
  id: BusinessSectionId;
  label: string;
  adminOnly?: boolean;
};

export type RecordSectionDef = {
  id: string;
  label: string;
  adminOnly?: boolean;
};

/** Zoho-style Business jump list. Mirrors Contact. Ask a teammate stays Admin-only. */
export const BUSINESS_SECTIONS: BusinessSectionDef[] = [
  { id: "overview", label: "Overview" },
  { id: "information", label: "Business information" },
  { id: "address", label: "Address" },
  { id: "policies", label: "Policies" },
  { id: "deals", label: "Deals" },
  { id: "people", label: "People" },
  { id: "locations", label: "Locations" },
  { id: "certificates", label: "Certificates" },
  { id: "ask", label: "Ask a teammate", adminOnly: true },
  { id: "work", label: "Email, SMS, calls" },
  { id: "timeline", label: "Timeline" },
];

export function businessSectionsForRole(isAdmin: boolean): BusinessSectionDef[] {
  return BUSINESS_SECTIONS.filter((section) => !section.adminOnly || isAdmin);
}

export function canAskTeammateOnBusiness(isAdmin: boolean): boolean {
  return canAskTeammate(isAdmin);
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
