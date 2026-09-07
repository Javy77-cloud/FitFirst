import { describe, expect, it } from "vitest";
import {
  dealStagePatch,
  isManualBindStage,
  massUpdateAppliesTo,
  massUpdateStatusOptions,
  selectAllMode,
} from "./mass-update";

describe("mass update", () => {
  it("keeps Bound off the deal status menu — bind is signature-only", () => {
    const values = massUpdateStatusOptions("deals").map((row) => row.value);
    expect(values).not.toContain("bound");
    expect(values).not.toContain("closed_won");
    expect(isManualBindStage("bound")).toBe(true);
    expect(dealStagePatch("quote_sent").pipelineStage).toBe("quote_sent");
  });

  it("select-all has visible-page and all-matching states", () => {
    const visible = ["a", "b"];
    const matching = ["a", "b", "c", "d"];
    expect(selectAllMode(visible, matching, [])).toBe("none");
    expect(selectAllMode(visible, matching, ["a"])).toBe("partial");
    expect(selectAllMode(visible, matching, ["a", "b"])).toBe("page");
    expect(selectAllMode(visible, matching, ["a", "b", "c", "d"])).toBe("matching");
  });

  it("offers the same fields on every CRM list", () => {
    expect(massUpdateAppliesTo("deals", "status")).toBe(true);
    expect(massUpdateAppliesTo("leads", "follow_up_template")).toBe(true);
    expect(massUpdateAppliesTo("contacts", "source")).toBe(true);
    expect(massUpdateAppliesTo("policies", "owner")).toBe(true);
    expect(massUpdateAppliesTo("deals", "custom")).toBe(true);
  });
});
