import { describe, expect, it } from "vitest";
import { clientStatusFromCounts } from "@/lib/lifecycle/client-status";
import {
  CONTACT_SECTIONS,
  canAskTeammateOnContact,
  contactSectionsForRole,
  relatedIdsFromEntity,
} from "./contact-sections";

describe("contact record sections", () => {
  it("lists a left-nav jump set that includes timeline and hides Ask for agents", () => {
    const admin = contactSectionsForRole(true);
    const agent = contactSectionsForRole(false);
    expect(admin.map((s) => s.id)).toEqual(CONTACT_SECTIONS.map((s) => s.id));
    expect(admin.some((s) => s.id === "ask")).toBe(true);
    expect(agent.some((s) => s.id === "ask")).toBe(false);
    expect(agent.some((s) => s.id === "timeline")).toBe(true);
    expect(agent.map((s) => s.label).join(" ")).not.toMatch(/activity log/i);
  });

  it("keeps Ask a teammate Admin-only", () => {
    expect(canAskTeammateOnContact(true)).toBe(true);
    expect(canAskTeammateOnContact(false)).toBe(false);
  });

  it("maps a contact click-to-call onto that contact", () => {
    expect(relatedIdsFromEntity("contact", "c1")).toEqual({
      contactId: "c1",
      accountId: null,
      policyId: null,
      dealId: null,
      leadId: null,
    });
  });

  it("keeps Ana-style 0-policy contacts as Not a client", () => {
    expect(clientStatusFromCounts(0, 0)).toBe("not_a_client");
  });
});
