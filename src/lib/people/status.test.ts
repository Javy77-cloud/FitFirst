import { describe, expect, it } from "vitest";
import { accessStatusFromFlags, flagsForStatus, isDeskLoginAllowed, normalizeAccessStatus } from "./status";

describe("agent access status", () => {
  it("normalizes Active / Frozen / Removed", () => {
    expect(normalizeAccessStatus("Active")).toBe("active");
    expect(normalizeAccessStatus("FROZEN")).toBe("frozen");
    expect(normalizeAccessStatus("removed")).toBe("removed");
    expect(normalizeAccessStatus(null)).toBe("active");
  });

  it("blocks Frozen and Removed from login", () => {
    expect(isDeskLoginAllowed("active")).toBe(true);
    expect(isDeskLoginAllowed("frozen")).toBe(false);
    expect(isDeskLoginAllowed("removed")).toBe(false);
  });

  it("keeps active=false in sync with Frozen / Removed", () => {
    expect(flagsForStatus("frozen").active).toBe(false);
    expect(flagsForStatus("removed").active).toBe(false);
    expect(flagsForStatus("active").active).toBe(true);
    expect(accessStatusFromFlags({ frozenAt: new Date() })).toBe("frozen");
    expect(accessStatusFromFlags({ removedAt: new Date() })).toBe("removed");
  });
});
