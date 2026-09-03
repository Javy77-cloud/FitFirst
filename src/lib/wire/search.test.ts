import { describe, expect, it } from "vitest";
import { hitFromBusiness, hitFromContact, hitFromDeal, hitFromLead, hitFromPolicy, matchesQuery } from "./search";

describe("smart search", () => {
  it("finds lead, deal, contact, business, and policy by name", () => {
    expect(matchesQuery("elena", "Elena", "Ruiz")).toBe(true);
    expect(hitFromLead({ id: "l", firstName: "Elena", lastName: "Ruiz" }).href).toBe("/leads/l");
    expect(hitFromDeal({ id: "d", title: "Ruiz · Melbourne HO3", pipelineStage: "bound" }).href).toBe("/deals/d");
    expect(hitFromContact({ id: "c", firstName: "Elena", lastName: "Ruiz" }).href).toBe("/contacts/c");
    expect(hitFromBusiness({ id: "b", name: "Harbor Key Marine LLC" }).href).toBe("/accounts/b");
    expect(hitFromPolicy({ id: "p", policyNumber: "HO3-ELENA-2026", lineOfBusiness: "HO" }).href).toBe(
      "/policies/p",
    );
  });
});
