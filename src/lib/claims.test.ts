import { describe, expect, it } from "vitest";
import { CLAIM_STATUSES } from "@/lib/domain";
import { CONTACT_ID, OPP_CONTACT_IDS } from "@/lib/fixtures/ids";
import {
  CLAIMS_DESK_COPY,
  claimCountsLabel,
  claimStatusLabel,
  isClaimStatus,
  isOpenClaimStatus,
  claimCreateValues,
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
