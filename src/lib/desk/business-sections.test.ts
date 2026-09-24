import { describe, expect, it } from "vitest";
import { clientStatusFromCounts } from "@/lib/lifecycle/client-status";
import {
  BUSINESS_SECTION_POOL,
  BUSINESS_SECTIONS,
  DEFAULT_BUSINESS_SECTION_NAV_IDS,
  LEGACY_BUSINESS_SECTION_NAV_IDS,
  businessSectionsForRole,
  canAskTeammateOnBusiness,
  normalizeBusinessSectionNavIds,
  relatedIdsFromEntity,
} from "./business-sections";

describe("business record sections", () => {
  it("mirrors Contacts tip chip pool (At a Glance + Details + Coverage/Opps)", () => {
    const ids = BUSINESS_SECTION_POOL.map((s) => s.id);
    expect(ids).toEqual([
      "at-a-glance",
      "business-details",
      "coverage",
      "opportunities",
      "locations",
      "policies",
      "deals",
      "timeline",
      "emails",
      "sms",
      "meetings",
      "documents",
      "notes",
    ]);
    expect(BUSINESS_SECTIONS).toBe(BUSINESS_SECTION_POOL);
    expect(DEFAULT_BUSINESS_SECTION_NAV_IDS).toContain("coverage");
    expect(DEFAULT_BUSINESS_SECTION_NAV_IDS).toContain("opportunities");
    expect(DEFAULT_BUSINESS_SECTION_NAV_IDS).toHaveLength(12);
    const agent = businessSectionsForRole(false);
    expect(agent.map((s) => s.id)).toEqual(DEFAULT_BUSINESS_SECTION_NAV_IDS);
    expect(agent.map((s) => s.label).join(" ")).not.toMatch(/certificate/i);
    expect(agent.map((s) => s.label).join(" ")).not.toMatch(/co-applicant/i);
  });

  it("upgrades legacy stock nav to include Coverage and Opportunities", () => {
    expect(normalizeBusinessSectionNavIds(LEGACY_BUSINESS_SECTION_NAV_IDS)).toEqual(
      DEFAULT_BUSINESS_SECTION_NAV_IDS,
    );
  });

  it("normalizes agency nav prefs and Ask teammate stays off", () => {
    expect(normalizeBusinessSectionNavIds(["policies", "bogus", "deals"])).toEqual([
      "policies",
      "deals",
    ]);
    expect(canAskTeammateOnBusiness(true)).toBe(false);
    expect(canAskTeammateOnBusiness(false)).toBe(false);
  });

  it("maps a business click-to-call onto that account", () => {
    expect(relatedIdsFromEntity("account", "a1")).toEqual({
      contactId: null,
      accountId: "a1",
      policyId: null,
      dealId: null,
      leadId: null,
    });
  });

  it("keeps Harbor Key-style in-force businesses as Client", () => {
    expect(clientStatusFromCounts(1, 1)).toBe("client");
  });

  it("keeps Ruiz Tile-style 0-policy businesses as Not a client", () => {
    expect(clientStatusFromCounts(0, 0)).toBe("not_a_client");
  });
});
