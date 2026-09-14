import { describe, expect, it } from "vitest";
import { parseAgentPolicyTab, policyTabsForViewer } from "./tabs";

describe("policy tabs", () => {
  it("defaults to overview", () => {
    expect(parseAgentPolicyTab(undefined)).toBe("overview");
  });

  it("hides claims for agents without claims", () => {
    expect(parseAgentPolicyTab("claims", { hasClaims: false })).toBe("overview");
    expect(policyTabsForViewer({ hasClaims: false, isAdmin: false })).not.toContain("claims");
  });

  it("shows agency only for admin", () => {
    expect(parseAgentPolicyTab("agency", { isAdmin: false })).toBe("overview");
    expect(policyTabsForViewer({ hasClaims: true, isAdmin: true })).toEqual([
      "overview",
      "coverage",
      "billing",
      "documents",
      "activity",
      "claims",
      "agency",
    ]);
  });
});
