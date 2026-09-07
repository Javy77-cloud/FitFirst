import { describe, expect, it } from "vitest";
import { createConsentStore } from "../consent/store";
import type { RawCorrection } from "../types";
import { createGlobalPoolStore } from "./store";
import { writeAnonymizedToGlobalPool } from "./write";

const AGENCY = "agency-a";

function correction(): RawCorrection {
  return {
    id: "raw-1",
    tenantId: AGENCY,
    documentId: "doc-1",
    extractionId: "ext-1",
    fieldKey: "roof_year",
    fieldType: "roof_year",
    extractedValue: "2014",
    correctedValue: "2019",
    sourceLabel: "Wind mitigation",
    formVersion: "OIR-B1-1802",
    carrier: "Heritage",
    correctedBy: "Agent Name",
    correctedAt: new Date("2026-09-07T12:00:00.000Z"),
  };
}

describe("global pool write gate", () => {
  it("refuses when the purchase / consent-live flag is off", () => {
    const consents = createConsentStore();
    consents.record({ agencyId: AGENCY, tenantId: AGENCY, optedIn: true });
    const result = writeAnonymizedToGlobalPool({
      raw: correction(),
      agencyId: AGENCY,
      consents,
      pool: createGlobalPoolStore(),
      env: {},
    });
    expect(result).toEqual({ ok: false, reason: "consent_not_live" });
  });

  it("refuses when the flag is on but no consent record exists", () => {
    const result = writeAnonymizedToGlobalPool({
      raw: correction(),
      agencyId: AGENCY,
      consents: createConsentStore(),
      pool: createGlobalPoolStore(),
      env: { LEARNING_POOL_CONSENT_LIVE: "true" },
    });
    expect(result).toEqual({ ok: false, reason: "no_consent_record" });
  });

  it("refuses a recorded decline even when the flag is on", () => {
    const consents = createConsentStore();
    consents.record({ agencyId: AGENCY, tenantId: AGENCY, optedIn: false });
    const result = writeAnonymizedToGlobalPool({
      raw: correction(),
      agencyId: AGENCY,
      consents,
      pool: createGlobalPoolStore(),
      env: { LEARNING_POOL_CONSENT_LIVE: "1" },
    });
    expect(result).toEqual({ ok: false, reason: "declined" });
  });

  it("writes an anonymized mapping when consent exists and the live flag is on", () => {
    const consents = createConsentStore();
    consents.record({ agencyId: AGENCY, tenantId: AGENCY, optedIn: true });
    const pool = createGlobalPoolStore();
    const result = writeAnonymizedToGlobalPool({
      raw: correction(),
      agencyId: AGENCY,
      consents,
      pool,
      env: { LEARNING_POOL_CONSENT_LIVE: "true" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected write");
    expect(result.record.fieldType).toBe("roof_year");
    expect(result.record.correction.extractedValue).toBe("2014");
    expect(result.record.correction.correctedValue).toBe("2019");
    expect(JSON.stringify(result.record)).not.toContain("Agent Name");
    expect(pool.size()).toBe(1);
  });
});
