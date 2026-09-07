import { describe, expect, it } from "vitest";
import { LEARNING_POOL_TERMS_VERSION } from "./terms";
import { createConsentStore } from "./store";

describe("learning pool consent", () => {
  it("defaults to opt-out when no record exists", () => {
    const store = createConsentStore();
    expect(store.getByAgency("agency-a")).toBeNull();
    expect(store.hasActiveConsent("agency-a")).toBe(false);
  });

  it("stores agency id, timestamp, and terms version on opt-in", () => {
    const store = createConsentStore();
    const at = new Date("2026-09-07T18:00:00.000Z");
    const row = store.record({
      agencyId: "agency-a",
      tenantId: "11111111-1111-4111-8111-111111111111",
      optedIn: true,
      at,
    });
    expect(row.agencyId).toBe("agency-a");
    expect(row.tenantId).toBe("11111111-1111-4111-8111-111111111111");
    expect(row.optedIn).toBe(true);
    expect(row.agreedAt?.toISOString()).toBe("2026-09-07T18:00:00.000Z");
    expect(row.termsVersion).toBe(LEARNING_POOL_TERMS_VERSION);
    expect(store.hasActiveConsent("agency-a")).toBe(true);
  });

  it("records a decline without contributing", () => {
    const store = createConsentStore();
    const row = store.record({
      agencyId: "agency-b",
      tenantId: "tenant-b",
      optedIn: false,
    });
    expect(row.optedIn).toBe(false);
    expect(row.agreedAt).toBeNull();
    expect(store.hasActiveConsent("agency-b")).toBe(false);
  });
});
