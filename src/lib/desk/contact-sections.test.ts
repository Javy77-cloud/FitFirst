import { describe, expect, it } from "vitest";
import { clientStatusFromCounts } from "@/lib/lifecycle/client-status";
import {
  CONTACT_SECTION_NAV_MAX,
  CONTACT_SECTION_POOL,
  DEFAULT_CONTACT_SECTION_NAV_IDS,
  canAskTeammateOnContact,
  contactSectionDefsForNav,
  contactSectionsForRole,
  normalizeContactSectionNavIds,
  relatedIdsFromEntity,
} from "./contact-sections";

describe("contact record sections", () => {
  it("default nav is full pool up to max and never exceeds max", () => {
    expect(CONTACT_SECTION_NAV_MAX).toBe(12);
    expect(DEFAULT_CONTACT_SECTION_NAV_IDS).toHaveLength(
      Math.min(CONTACT_SECTION_POOL.length, CONTACT_SECTION_NAV_MAX),
    );
    expect(DEFAULT_CONTACT_SECTION_NAV_IDS).toEqual([
      "at-a-glance",
      "contact-details",
      "coverage",
      "opportunities",
      "policies",
      "deals",
      "timeline",
      "emails",
      "sms",
      "meetings",
      "documents",
      "notes",
    ]);
    expect(CONTACT_SECTION_POOL.map((s) => s.id)).toEqual([
      "at-a-glance",
      "contact-details",
      "coverage",
      "opportunities",
      "policies",
      "deals",
      "timeline",
      "emails",
      "sms",
      "meetings",
      "documents",
      "notes",
    ]);
    expect(normalizeContactSectionNavIds(CONTACT_SECTION_POOL.map((s) => s.id))).toHaveLength(
      Math.min(CONTACT_SECTION_POOL.length, CONTACT_SECTION_NAV_MAX),
    );
    expect(normalizeContactSectionNavIds(["bogus", "policies", "policies", "notes"]).map((id) => id)).toEqual([
      "policies",
      "notes",
    ]);
    expect(
      normalizeContactSectionNavIds([
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
      ]),
    ).toEqual(DEFAULT_CONTACT_SECTION_NAV_IDS);
  });

  it("role helper returns selected defs without Ask a teammate", () => {
    const admin = contactSectionsForRole(true);
    const agent = contactSectionsForRole(false);
    expect(admin.map((s) => s.id)).toEqual(DEFAULT_CONTACT_SECTION_NAV_IDS);
    expect(agent.map((s) => s.id)).toEqual(DEFAULT_CONTACT_SECTION_NAV_IDS);
    expect(admin.every((s) => s.label !== "Ask a teammate")).toBe(true);
    expect(contactSectionDefsForNav(["timeline", "notes"]).map((s) => s.id)).toEqual([
      "timeline",
      "notes",
    ]);
  });

  it("removes Ask a teammate from Contact for every role", () => {
    expect(canAskTeammateOnContact(true)).toBe(false);
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
