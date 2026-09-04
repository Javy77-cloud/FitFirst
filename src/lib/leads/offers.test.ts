import { describe, expect, it } from "vitest";
import { inboundAssignment, isInboundSocialSource } from "./routing";

describe("lead offer routing", () => {
  it("assigns inbound from an agent's connected account to that agent", () => {
    expect(inboundAssignment("44444444-4444-4444-8444-444444444402")).toEqual({
      assignment: "agent",
      ownerUserId: "44444444-4444-4444-8444-444444444402",
    });
  });

  it("keeps agency / unassigned social inbound in the Admin award pool", () => {
    expect(inboundAssignment(null)).toEqual({ assignment: "unassigned", ownerUserId: null });
    expect(inboundAssignment("")).toEqual({ assignment: "unassigned", ownerUserId: null });
  });

  it("treats social platform sources as inbound", () => {
    expect(isInboundSocialSource("instagram")).toBe(true);
    expect(isInboundSocialSource("google_business_profile")).toBe(true);
    expect(isInboundSocialSource("social_stub")).toBe(true);
    expect(isInboundSocialSource("referral")).toBe(false);
  });
});
