import { describe, expect, it } from "vitest";
import {
  hitFromBusiness,
  hitFromCarrier,
  hitFromContact,
  hitFromDeal,
  hitFromLead,
  hitFromPolicy,
  matchesQuery,
} from "./search";

describe("smart search", () => {
  it("finds lead, deal, contact, business, policy, and carrier by contains match", () => {
    expect(matchesQuery("lena", "Elena", "Ruiz")).toBe(true);
    expect(matchesQuery("integri", "American Integrity")).toBe(true);
    expect(hitFromLead({ id: "l", firstName: "Elena", lastName: "Ruiz" }).href).toBe("/leads/l");
    expect(hitFromDeal({ id: "d", title: "Ruiz · Melbourne HO3", pipelineStage: "bound" }).href).toBe("/deals/d");
    expect(hitFromContact({ id: "c", firstName: "Elena", lastName: "Ruiz" }).href).toBe("/contacts/c");
    expect(hitFromBusiness({ id: "b", name: "Harbor Key Marine LLC" }).href).toBe("/accounts/b");
    expect(hitFromPolicy({ id: "p", policyNumber: "HO3-ELENA-2026", lineOfBusiness: "HO" }).href).toBe(
      "/policies/p",
    );
    expect(
      hitFromCarrier({ id: "crr", name: "American Integrity", naic: "12841", writtenLines: ["HO"] }),
    ).toMatchObject({
      kind: "carrier",
      href: "/carriers/crr",
      title: "American Integrity",
      subtitle: "HO · NAIC 12841",
    });
  });
});
