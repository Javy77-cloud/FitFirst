import { describe, expect, it } from "vitest";
import { healthProductType } from "./product-type";
import { mergeHealthPolicyGaps, planHealthPolicyWrite, type HealthPolicyIdentity } from "./policy-dedup";

const contact = {
  contactId: "contact-1",
  clientName: "Elena Hale",
  dateOfBirth: "1980-01-02",
};

function row(partial: Partial<HealthPolicyIdentity> & Pick<HealthPolicyIdentity, "id">): HealthPolicyIdentity {
  return {
    ...contact,
    policyNumber: "MED-1",
    carrierName: "Ambetter",
    planType: "Marketplace",
    policySubType: "Marketplace",
    lineOfBusiness: "HEALTH",
    insuranceType: "Health",
    intakeSource: "manual",
    status: "active",
    premium: "420.00",
    ...partial,
  };
}

describe("health product separation", () => {
  it("keeps marketplace medical, dental, and vision distinct", () => {
    expect(
      healthProductType({ lineOfBusiness: "HEALTH", policySubType: "Marketplace", insuranceType: "Health" }),
    ).toBe("medical");
    expect(healthProductType({ lineOfBusiness: "HEALTH", policySubType: "Dental", insuranceType: "Health" })).toBe(
      "dental",
    );
    expect(healthProductType({ lineOfBusiness: "HEALTH", sourceProduct: "vision", insuranceType: "Health" })).toBe(
      "vision",
    );
  });
});

describe("health policy dedup", () => {
  it("merges on name+DOB inside the same product and fills gaps", () => {
    const existing = row({
      id: "pol-med",
      policyNumber: "",
      premium: null,
      carrierName: "",
      planType: "",
      policySubType: "Marketplace",
      status: "unpublished",
    });
    const plan = planHealthPolicyWrite({
      source: "healthsherpa",
      existing: [existing],
      incoming: {
        ...contact,
        policyNumber: "HS-100",
        premium: "88.00",
        carrierName: "Ambetter",
        planType: "Marketplace",
        policySubType: "Marketplace",
        lineOfBusiness: "HEALTH",
        bound: true,
        status: "bound",
      },
    });
    expect(plan.action).toBe("merge");
    if (plan.action !== "merge") return;
    expect(plan.targetId).toBe("pol-med");
    expect(plan.matchReason).toBe("name_dob");
    expect(plan.setBound).toBe(true);
    expect(plan.patch.policyNumber).toBe("HS-100");
    expect(plan.patch.premium).toBe("88.00");
    expect(plan.patch.status).toBe("bound");
  });

  it("does not merge medical into dental on name+DOB alone", () => {
    const dental = row({
      id: "pol-den",
      policyNumber: "DEN-1",
      policySubType: "Dental",
      planType: "Dental",
      sourceProduct: "dental",
    });
    const plan = planHealthPolicyWrite({
      source: "manual",
      confirmed: true,
      existing: [dental],
      incoming: {
        ...contact,
        policyNumber: "MED-9",
        policySubType: "Marketplace",
        planType: "Marketplace",
        lineOfBusiness: "HEALTH",
        insuranceType: "Health",
      },
    });
    expect(plan.action).toBe("create");
  });

  it("matches policy number inside the product even when the name differs", () => {
    const existing = row({ id: "pol-med", policyNumber: "HS-100", clientName: "Elena Hale" });
    const plan = planHealthPolicyWrite({
      source: "connector",
      existing: [existing],
      incoming: {
        contactId: "contact-1",
        clientName: "E. Hale",
        dateOfBirth: null,
        policyNumber: "hs-100",
        policySubType: "Marketplace",
        lineOfBusiness: "HEALTH",
      },
    });
    expect(plan.action).toBe("merge");
    if (plan.action !== "merge") return;
    expect(plan.matchReason).toBe("policy_number");
  });

  it("matches carrier + plan type inside the product", () => {
    const existing = row({
      id: "pol-vis",
      policyNumber: "",
      clientName: "",
      dateOfBirth: null,
      policySubType: "Vision",
      planType: "Vision",
      carrierName: "VSP",
      sourceProduct: "vision",
    });
    const plan = planHealthPolicyWrite({
      source: "healthsherpa",
      existing: [existing],
      incoming: {
        contactId: "contact-1",
        clientName: "Someone Else",
        dateOfBirth: "1990-05-05",
        policyNumber: "VIS-2",
        carrierName: "vsp",
        planType: "Vision",
        policySubType: "Vision",
        lineOfBusiness: "HEALTH",
      },
    });
    expect(plan.action).toBe("merge");
    if (plan.action !== "merge") return;
    expect(plan.matchReason).toBe("carrier_plan");
  });

  it("prefills an inbound-first row when the agent has not confirmed", () => {
    const existing = row({ id: "pol-med", intakeSource: "healthsherpa", premium: "10.00" });
    const plan = planHealthPolicyWrite({
      source: "manual",
      existing: [existing],
      incoming: {
        ...contact,
        policyNumber: "MED-1",
        policySubType: "Marketplace",
        lineOfBusiness: "HEALTH",
        premium: "12.00",
      },
    });
    expect(plan.action).toBe("prefill");
  });

  it("merges a manual-first row when inbound arrives later", () => {
    const existing = row({ id: "pol-med", intakeSource: "manual", premium: "10.00", policyNumber: "MED-1" });
    const plan = planHealthPolicyWrite({
      source: "healthsherpa",
      existing: [existing],
      incoming: {
        ...contact,
        policyNumber: "MED-1",
        policySubType: "Marketplace",
        lineOfBusiness: "HEALTH",
        premium: "99.00",
        sourceId: "app-1",
      },
    });
    expect(plan.action).toBe("merge");
    if (plan.action !== "merge") return;
    expect(plan.patch.premium).toBeUndefined();
    expect(plan.patch.sourceId).toBe("app-1");
    expect(plan.filledGaps).toContain("sourceId");
  });

  it("does not blank a filled premium when merging gaps", () => {
    const { patch } = mergeHealthPolicyGaps(
      { premium: "10.00", status: "active", policyNumber: "MED-1" },
      { premium: "99.00", policyNumber: "", bound: false },
    );
    expect(patch.premium).toBeUndefined();
    expect(patch.policyNumber).toBeUndefined();
    expect(patch.status).toBeUndefined();
  });
});
