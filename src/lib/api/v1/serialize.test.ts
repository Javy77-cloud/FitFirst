import { describe, expect, it } from "vitest";
import { serializeContact, serializeDeal, serializePolicy } from "./serialize";

describe("Open API serializers", () => {
  it("omits encrypted contact fields and uses snake_case", () => {
    const json = serializeContact({
      id: "c1",
      firstName: "Ana",
      lastName: "Dib",
      email: "ana.dib@desk.local",
      phone: "(321) 555-0144",
      mailingAddress: "1098 Adige Ct SE",
      city: "Palm Bay",
      state: "FL",
      zip: "32909",
      lifetimePolicyCount: 0,
      activePolicyCount: 0,
      clientStatus: "not_a_client",
      ownerId: null,
      createdAt: new Date("2026-09-02T16:00:00.000Z"),
      updatedAt: new Date("2026-09-02T16:00:00.000Z"),
    });
    expect(json.first_name).toBe("Ana");
    expect(json.lifetime_policy_count).toBe(0);
    expect(json.active_policy_count).toBe(0);
    expect(json).not.toHaveProperty("ssnEnc");
    expect(json).not.toHaveProperty("ssn_enc");
  });

  it("names the insured on a policy row", () => {
    const json = serializePolicy({
      policy: {
        id: "p1",
        policyNumber: "HO3-ELENA-2026",
        lineOfBusiness: "HO",
        status: "active",
        premium: "2140.00",
        effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
        expirationDate: new Date("2027-01-01T00:00:00.000Z"),
        contactId: "c1",
        accountId: null,
        dealId: "d1",
        carrierId: "car1",
        producer: "Javy Rivera",
        policyType: "HO3",
        policySubType: null,
        ownerId: "u1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      contact: { firstName: "Elena", lastName: "Ruiz" },
      carrier: { name: "American Integrity" },
    });
    expect(json.contact_name).toBe("Ruiz, Elena");
    expect(json.carrier_name).toBe("American Integrity");
    expect(json.policy_number).toBe("HO3-ELENA-2026");
  });

  it("keeps an unbound deal without bound_at", () => {
    const json = serializeDeal({
      deal: {
        id: "d-ana",
        title: "Dib · Palm Bay HO3",
        pipelineStage: "quote_sent",
        lineOfBusiness: "HO",
        state: "FL",
        notes: null,
        contactId: "c-ana",
        accountId: null,
        leadId: "l-ana",
        boundAt: null,
        ownerId: null,
        createdAt: new Date("2026-09-02T16:00:00.000Z"),
        updatedAt: new Date("2026-09-02T16:00:00.000Z"),
      },
      contact: { firstName: "Ana", lastName: "Dib" },
    });
    expect(json.bound_at).toBeNull();
    expect(json.pipeline_stage).toBe("quote_sent");
  });
});
