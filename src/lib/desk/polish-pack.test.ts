import { describe, expect, it } from "vitest";
import { radarGlance } from "@/lib/deals/radar-glance";
import { stackMidLine } from "@/lib/desk/stack-mid";
import { leadSourceGlance } from "@/lib/leads/source-glance";

describe("restrained desk polish", () => {
  it("keeps a stack center line to two cues", () => {
    expect(stackMidLine(["4 days silent", "Next quote", "extra"])).toBe("4 days silent · Next quote");
    expect(stackMidLine(["", null, "Chase the first call"])).toBe("Chase the first call");
  });

  it("names the leading sources without listing the whole catalog", () => {
    const glance = leadSourceGlance([
      "referral",
      "referral",
      "referral",
      "facebook",
      "website",
      "google",
      null,
    ]);
    expect(glance.total).toBe(7);
    expect(glance.leader?.label).toBe("Referral");
    expect(glance.top.map((row) => row.label)).toEqual(["Referral", "Facebook", "Google"]);
    expect(glance.top).toHaveLength(3);
  });

  it("summarizes radar without touching heat-row shape", () => {
    const glance = radarGlance([
      { heat: "hot", silenceDays: 1, spark: [0, 1, 2] },
      { heat: "cold", silenceDays: 9, spark: [2, 1, 0] },
      { heat: "hot", silenceDays: 3, spark: [1, 1, 1] },
    ]);
    expect(glance.total).toBe(3);
    expect(glance.hot).toBe(2);
    expect(glance.medianSilence).toBe(3);
    expect(glance.spark).toEqual([1, 1, 1]);
  });
});
