import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import {
  AMS_WAVE3_IDS,
  CONTACT_ID,
  ELENA_POLICY_ID,
  HALE_POLICY_ID,
  HARBOR_POLICY_ID,
} from "@/lib/fixtures/ids";

describe("AMS wave 3 seed ids", () => {
  it("does not reuse Ana, bind her, or auto-cancel Hale", () => {
    const ids = Object.values(AMS_WAVE3_IDS);
    expect(ids).not.toContain(CONTACT_ID);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ELENA_POLICY_ID).not.toBe(CONTACT_ID);
    expect(HALE_POLICY_ID).not.toBe(CONTACT_ID);
    expect(HARBOR_POLICY_ID).not.toBe(CONTACT_ID);
    expect(fixture.risk.coverageA).toBe(321000);
  });
});
