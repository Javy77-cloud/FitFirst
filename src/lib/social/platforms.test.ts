import { describe, expect, it } from "vitest";
import {
  canUseSocialPlatform,
  gbpLockedForViewer,
  gbpVisibleToRole,
  isGbpPlatform,
  isSocialPlatformId,
  socialLeadSource,
} from "./platforms";

describe("social platforms", () => {
  it("names the five BYO plugs and treats GBP as gated", () => {
    expect(isSocialPlatformId("facebook")).toBe(true);
    expect(isSocialPlatformId("gmail")).toBe(false);
    expect(isGbpPlatform("google_business_profile")).toBe(true);
    expect(socialLeadSource("instagram")).toBe("instagram");
  });

  it("hides GBP from agents until Admin allows monitoring", () => {
    expect(gbpVisibleToRole("admin", false)).toBe(true);
    expect(gbpVisibleToRole("agent", false)).toBe(false);
    expect(gbpVisibleToRole("agent", true)).toBe(true);
    expect(gbpLockedForViewer("agent", false)).toBe(true);
    expect(gbpLockedForViewer("admin", false)).toBe(false);
    expect(canUseSocialPlatform("facebook", "agent", false)).toBe(true);
    expect(canUseSocialPlatform("google_business_profile", "agent", false)).toBe(false);
    expect(canUseSocialPlatform("google_business_profile", "admin", false)).toBe(true);
  });
});
