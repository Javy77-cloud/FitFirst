import { describe, expect, it } from "vitest";
import {
  canAwardOffer,
  canClaimOffer,
  canTakeOwnership,
  claimRelationLabel,
  offerStatusLabel,
  parseEmailFrom,
  parseLeadOfferKind,
  parseLeadOfferStatus,
} from "./lead-offers";

describe("management lead offers", () => {
  it("lets an agent claim an open referral once", () => {
    expect(canClaimOffer("open", false)).toBe(true);
    expect(canClaimOffer("open", true)).toBe(false);
    expect(canClaimOffer("awarded", false)).toBe(false);
    expect(canClaimOffer("open", false, "inbound_email")).toBe(false);
  });

  it("lets admin award only while a referral is open", () => {
    expect(canAwardOffer("open")).toBe(true);
    expect(canAwardOffer("awarded")).toBe(false);
    expect(canAwardOffer("open", "inbound_email")).toBe(false);
    expect(parseLeadOfferStatus("nope")).toBe("open");
    expect(offerStatusLabel("awarded")).toBe("Awarded");
    expect(offerStatusLabel("claimed")).toBe("Claimed");
  });

  it("lets an agent take ownership of an open inbound email", () => {
    expect(canTakeOwnership("open", "inbound_email")).toBe(true);
    expect(canTakeOwnership("claimed", "inbound_email")).toBe(false);
    expect(canTakeOwnership("open", "referral")).toBe(false);
    expect(parseLeadOfferKind("inbound_email")).toBe("inbound_email");
    expect(claimRelationLabel("know_client")).toBe("I know this client");
    expect(claimRelationLabel("new_lead")).toBe("New lead");
  });

  it("parses inbound From into a lead identity", () => {
    expect(parseEmailFrom("Renee Colbert <renee.colbert@inbox.local>")).toEqual({
      firstName: "Renee",
      lastName: "Colbert",
      email: "renee.colbert@inbox.local",
      displayName: "Renee Colbert",
    });
    expect(parseEmailFrom("renee.colbert@inbox.local")).toEqual({
      firstName: "Renee",
      lastName: "Colbert",
      email: "renee.colbert@inbox.local",
      displayName: "renee.colbert@inbox.local",
    });
    expect(parseEmailFrom("")).toEqual({
      firstName: "Unknown",
      lastName: "Lead",
      email: null,
      displayName: "",
    });
  });
});
