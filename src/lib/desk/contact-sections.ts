import { canAskTeammate } from "@/lib/desk/record-asks";

export type ContactSectionId =
  | "overview"
  | "information"
  | "address"
  | "policies"
  | "deals"
  | "businesses"
  | "locations"
  | "ask"
  | "work"
  | "timeline";

export type ContactSectionDef = {
  id: ContactSectionId;
  label: string;
  adminOnly?: boolean;
};

/** Zoho-style contact jump list. Ask a teammate stays Admin-only. */
export const CONTACT_SECTIONS: ContactSectionDef[] = [
  { id: "overview", label: "Overview" },
  { id: "information", label: "Contact information" },
  { id: "address", label: "Address" },
  { id: "policies", label: "Policies" },
  { id: "deals", label: "Deals" },
  { id: "businesses", label: "Businesses" },
  { id: "locations", label: "Locations" },
  { id: "ask", label: "Ask a teammate", adminOnly: true },
  { id: "work", label: "Email, SMS, calls" },
  { id: "timeline", label: "Timeline" },
];

export function contactSectionsForRole(isAdmin: boolean): ContactSectionDef[] {
  return CONTACT_SECTIONS.filter((section) => !section.adminOnly || isAdmin);
}

export function canAskTeammateOnContact(isAdmin: boolean): boolean {
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
