import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import {
  AMS_WAVE2_IDS,
  AMS_WAVE4_IDS,
  AMS_WAVE5_IDS,
  AMS_WAVE6_IDS,
  AMS_WAVE7_IDS,
  AMS_WAVE8_IDS,
  CLAIM_IDS,
  CONTACT_ID,
  ELENA_POLICY_ID,
  HALE_POLICY_ID,
  HARBOR_CERTIFICATE_ID,
  HARBOR_POLICY_ID,
  NAIR_POLICY_ID,
} from "@/lib/fixtures/ids";

describe("AMS wave 8 seed ids", () => {
  it("does not reuse Ana, Elena, Hale, Nair, Harbor, claim, or earlier AMS ids and keeps Cov A 321000", () => {
    const ids = Object.values(AMS_WAVE8_IDS);
    const blocked = new Set([
      CONTACT_ID,
      ELENA_POLICY_ID,
      HALE_POLICY_ID,
      NAIR_POLICY_ID,
      HARBOR_POLICY_ID,
      HARBOR_CERTIFICATE_ID,
      ...Object.values(CLAIM_IDS),
      ...Object.values(AMS_WAVE2_IDS),
      ...Object.values(AMS_WAVE4_IDS),
      ...Object.values(AMS_WAVE5_IDS),
      ...Object.values(AMS_WAVE6_IDS),
      ...Object.values(AMS_WAVE7_IDS),
    ]);
    expect(ids.some((id) => blocked.has(id))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
    expect(fixture.risk.coverageA).toBe(321000);
  });
});
