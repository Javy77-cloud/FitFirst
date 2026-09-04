import { describe, expect, it } from "vitest";
import { clientStatusFromCounts } from "@/lib/lifecycle/client-status";
import {
  BUSINESS_SECTIONS,
  businessSectionsForRole,
  canAskTeammateOnBusiness,
  relatedIdsFromEntity,
} from "./business-sections";

describe("business record sections", () => {
  it("lists a left-nav jump set that includes timeline and hides Ask for agents", () => {
    const admin = businessSectionsForRole(true);
    const agent = businessSectionsForRole(false);
    expect(admin.map((s) => s.id)).toEqual(BUSINESS_SECTIONS.map((s) => s.id));
    expect(admin.some((s) => s.id === "ask")).toBe(true);
    expect(agent.some((s) => s.id === "ask")).toBe(false);
    expect(agent.some((s) => s.id === "timeline")).toBe(true);
    expect(admin.some((s) => s.id === "certificates")).toBe(true);
    expect(agent.map((s) => s.label).join(" ")).not.toMatch(/activity log/i);
    expect(agent.map((s) => s.label).join(" ")).not.toMatch(/quick log/i);
    expect(agent.map((s) => s.label).join(" ")).not.toMatch(/log on this record/i);
  });

  it("keeps Ask a teammate Admin-only", () => {
    expect(canAskTeammateOnBusiness(true)).toBe(true);
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
