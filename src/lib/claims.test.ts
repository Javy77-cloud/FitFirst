import { describe, expect, it } from "vitest";
import { CLAIM_STATUSES } from "@/lib/domain";
import { CONTACT_ID, OPP_CONTACT_IDS } from "@/lib/fixtures/ids";
import {
  CLAIMS_DESK_COPY,
  FNOL_INTAKE_COPY,
  claimCountsLabel,
  claimHasShopFields,
  claimNotifyCopy,
  claimStatusLabel,
  fnolIntakeValues,
  isClaimStatus,
  isOpenClaimStatus,
  linkClaimParties,
  nextClaimStatus,
  resolveClaimProducerId,
  shouldNotifyProducer,
  claimCreateValues,
  summarizeClaimPipeline,
  summarizeClaims,
} from "./claims";

describe("light claims log", () => {
  it("only allows inquiry / referred to carrier / closed", () => {
    expect([...CLAIM_STATUSES]).toEqual(["inquiry", "referred_to_carrier", "closed"]);
    expect(isClaimStatus("inquiry")).toBe(true);
    expect(isClaimStatus("open")).toBe(false);
    expect(isClaimStatus("reserved")).toBe(false);
    expect(isClaimStatus("paid")).toBe(false);
    expect(isClaimStatus("fnol")).toBe(false);
  });

  it("treats inquiry and referred-to-carrier as open desk items", () => {
    expect(isOpenClaimStatus("inquiry")).toBe(true);
    expect(isOpenClaimStatus("referred_to_carrier")).toBe(true);
    expect(isOpenClaimStatus("closed")).toBe(false);
    expect(
      summarizeClaims([
        { status: "referred_to_carrier" },
        { status: "closed" },
        { status: "inquiry" },
      ]),
    ).toEqual({ total: 3, open: 2 });
  });

  it("labels Account 360 chips without inventing a lifecycle", () => {
    expect(claimStatusLabel("referred_to_carrier")).toBe("Referred to carrier");
    expect(claimCountsLabel({ total: 0, open: 0 })).toBe("0 claims");
    expect(claimCountsLabel({ total: 1, open: 1 })).toBe("1 claim · 1 open claim");
    expect(claimCountsLabel({ total: 4, open: 0 })).toBe("4 claims · 0 open claims");
  });

  it("keeps Ana off the demo claim host", () => {
    expect(OPP_CONTACT_IDS.ruiz).not.toBe(CONTACT_ID);
  });

  it("saves a stub claim row without a policy", () => {
    const row = claimCreateValues({
      description: "Water notice, no policy picked yet",
    });
    expect(row.policyId).toBeNull();
    expect(row.status).toBe("inquiry");
    expect(row.causeType).toBe("other");
    expect(row.dateReported).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("tells the broker to handle the claim on the carrier site", () => {
    expect(CLAIMS_DESK_COPY).toMatch(/carrier website/i);
    expect(CLAIMS_DESK_COPY).toMatch(/not a claims shop/i);
    expect(CLAIMS_DESK_COPY.toLowerCase()).not.toContain("file with the carrier from here");
  });
});

describe("FNOL intake + status pipeline", () => {
  it("links Policy and Contact, filling contact from the policy when blank", () => {
    expect(
      linkClaimParties({
        policyId: "p1",
        contactId: "",
        policyContactId: "c1",
      }),
    ).toEqual({ policyId: "p1", contactId: "c1" });
    expect(linkClaimParties({ contactId: "c9" })).toEqual({
      policyId: null,
      contactId: "c9",
    });
  });

  it("builds an FNOL payload with carrier claim # and producer notify on", () => {
    const row = fnolIntakeValues({
      policyId: "p1",
      policyContactId: "c1",
      causeType: "wind",
      carrierClaimNumber: "AI-CLM-19044",
      lossLocation: "880 Croton Rd, Melbourne FL",
      reporterName: "Camila Ruiz",
      reporterPhone: "321-555-0266",
      description: "Tree on the lanai after the squall.",
    });
    expect(row.contactId).toBe("c1");
    expect(row.policyId).toBe("p1");
    expect(row.status).toBe("inquiry");
    expect(row.carrierClaimNumber).toBe("AI-CLM-19044");
    expect(row.notifyProducer).toBe(true);
    expect(claimHasShopFields(row)).toBe(false);
    expect(row).not.toHaveProperty("reserve");
    expect(row).not.toHaveProperty("adjuster");
  });

  it("walks the three-stage broker pipeline and never invents reserves", () => {
    expect(nextClaimStatus("inquiry")).toBe("referred_to_carrier");
    expect(nextClaimStatus("referred_to_carrier")).toBe("closed");
    expect(nextClaimStatus("closed")).toBeNull();
    expect(
      summarizeClaimPipeline([
        { status: "inquiry" },
        { status: "inquiry" },
        { status: "referred_to_carrier" },
        { status: "closed" },
      ]),
    ).toEqual({ inquiry: 2, referred_to_carrier: 1, closed: 1 });
    expect(FNOL_INTAKE_COPY.toLowerCase()).toContain("does not file fnol");
    expect(FNOL_INTAKE_COPY.toLowerCase()).toContain("adjusters");
  });

  it("writes an in-app FNOL ping for the producer, not an email", () => {
    expect(shouldNotifyProducer(undefined)).toBe(true);
    expect(shouldNotifyProducer("0")).toBe(false);
    expect(resolveClaimProducerId({ policyOwnerId: "maya", contactOwnerId: "javy" })).toBe("maya");
    expect(resolveClaimProducerId({ contactOwnerId: "javy" })).toBe("javy");
    const ping = claimNotifyCopy({
      cause: "water",
      party: "Ruiz, Camila",
      policyNumber: "AI-HO-66102",
      carrierClaimNumber: "AI-CLM-19044",
      status: "referred_to_carrier",
    });
    expect(ping.kind).toBe("fnol");
    expect(ping.title).toBe("FNOL · Ruiz, Camila · AI-HO-66102");
    expect(ping.body).toMatch(/carrier claim AI-CLM-19044/i);
    expect(ping.body.toLowerCase()).toContain("in-desk only");
    expect(ping.body.toLowerCase()).not.toContain("email the producer");
  });
});
