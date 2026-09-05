import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import {
  AMS_WAVE2_IDS,
  AMS_WAVE4_IDS,
  CONTACT_ID,
  ELENA_POLICY_ID,
  HALE_POLICY_ID,
} from "@/lib/fixtures/ids";
import { packetTaskTitle } from "@/lib/ams/packet-tasks";

describe("AMS wave 4 seed ids", () => {
  it("does not reuse Ana, Elena, Hale, or wave2 ids and keeps Cov A 321000", () => {
    const ids = Object.values(AMS_WAVE4_IDS);
    const blocked = new Set([
      CONTACT_ID,
      ELENA_POLICY_ID,
      HALE_POLICY_ID,
      ...Object.values(AMS_WAVE2_IDS),
    ]);
    expect(ids.some((id) => blocked.has(id))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
    expect(fixture.risk.coverageA).toBe(321000);
    expect(packetTaskTitle("aor", "HO3-ELENA-2026")).toContain("AOR packet");
  });
});
