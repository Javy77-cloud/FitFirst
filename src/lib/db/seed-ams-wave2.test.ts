import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { AMS_WAVE2_IDS, CONTACT_ID, ELENA_POLICY_ID, HALE_POLICY_ID } from "@/lib/fixtures/ids";

describe("AMS wave 2 seed ids", () => {
  it("does not reuse Ana contact or bind a policy for her", () => {
    const ids = Object.values(AMS_WAVE2_IDS);
    expect(ids).not.toContain(CONTACT_ID);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ELENA_POLICY_ID).not.toBe(CONTACT_ID);
    expect(HALE_POLICY_ID).not.toBe(CONTACT_ID);
    expect(fixture.risk.coverageA).toBe(321000);
  });
});
