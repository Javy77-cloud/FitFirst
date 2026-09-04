import { canAskTeammate } from "@/lib/desk/record-asks";

export type ContactSectionId =
  | "overview"
  | "information"
  | "address"
  | "policies"
  | "claims"
  | "deals"
  | "businesses"
  | "locations"
  | "work"
  | "optouts"
  | "timeline";

export type ContactSectionDef = {
  id: ContactSectionId;
  label: string;
  adminOnly?: boolean;
};

/** Contact jump list. Ask a teammate is not on Contact — Admin uses it on other records. */
export const CONTACT_SECTIONS: ContactSectionDef[] = [
  { id: "overview", label: "Overview" },
  { id: "information", label: "Contact information" },
  { id: "address", label: "Address" },
  { id: "policies", label: "Policies" },
  { id: "claims", label: "Claims" },
  { id: "deals", label: "Deals" },
  { id: "businesses", label: "Businesses" },
  { id: "locations", label: "Locations" },
  { id: "work", label: "Email, SMS, calls" },
  { id: "optouts", label: "Opt-outs" },
  { id: "timeline", label: "Timeline" },
];

export function contactSectionsForRole(_isAdmin: boolean): ContactSectionDef[] {
  return CONTACT_SECTIONS.filter((section) => !section.adminOnly);
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
