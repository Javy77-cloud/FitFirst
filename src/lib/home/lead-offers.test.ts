import { describe, expect, it } from "vitest";
import { canAwardOffer, canClaimOffer, offerStatusLabel, parseLeadOfferStatus } from "./lead-offers";

describe("management lead offers", () => {
  it("lets an agent claim an open offer once", () => {
    expect(canClaimOffer("open", false)).toBe(true);
    expect(canClaimOffer("open", true)).toBe(false);
    expect(canClaimOffer("awarded", false)).toBe(false);
  });

  it("lets admin award only while the offer is open", () => {
    expect(canAwardOffer("open")).toBe(true);
    expect(canAwardOffer("awarded")).toBe(false);
    expect(parseLeadOfferStatus("nope")).toBe("open");
    expect(offerStatusLabel("awarded")).toBe("Awarded");
  });
});
