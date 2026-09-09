import { describe, expect, it } from "vitest";
import { predictAppetite } from "./predict";
import { resolveActualColor, FLOOR_ONLY_RESOLVES_AS } from "./types";
import type { StandingRuleInput } from "./types";
import { FL_HO_STANDING_SEED } from "./seed-fl-ho";

function seedRules(): StandingRuleInput[] {
  return FL_HO_STANDING_SEED.map((r, i) => ({
    id: `seed-${i}`,
    field: r.field,
    operator: r.operator,
    threshold: r.threshold,
    disposition: String(r.disposition),
    reasonCode: r.reasonCode,
    carrierId: null,
    layer: "standing",
    live: true,
  }));
}

describe("predictAppetite (shadow Standing only)", () => {
  const carriers = ["carrier-a", "carrier-b"];

  it("defaults to green when no rules fire", () => {
    const out = predictAppetite({
      state: "FL",
      line: "HO",
      sheetSnapshot: {
        year_built: 2005,
        miles_to_coast: 12,
        mobile_home: false,
      },
      carriers,
      rules: seedRules(),
    });
    expect(out).toHaveLength(2);
    expect(out.every((p) => p.color === "green")).toBe(true);
    expect(out.every((p) => p.ruleId == null)).toBe(true);
  });

  it("flags mobile_home as red", () => {
    const out = predictAppetite({
      state: "FL",
      line: "HO",
      sheetSnapshot: { mobile_home: true, year_built: 2010, miles_to_coast: 20 },
      carriers: ["carrier-a"],
      rules: seedRules(),
    });
    expect(out[0]?.color).toBe("red");
    expect(out[0]?.reasonCode).toBe("mobile_home");
    expect(out[0]?.ruleId).toBeTruthy();
  });

  it("infers mobile from construction string", () => {
    const out = predictAppetite({
      state: "FL",
      line: "HO",
      sheetSnapshot: { construction: "Manufactured Home", miles_to_coast: 5 },
      carriers: ["c1"],
      rules: seedRules(),
    });
    expect(out[0]?.color).toBe("red");
  });

  it("flags very coastal as yellow", () => {
    const out = predictAppetite({
      state: "FL",
      line: "HO",
      sheetSnapshot: { miles_to_coast: 0.25, year_built: 1995, mobile_home: false },
      carriers: ["c1"],
      rules: seedRules(),
    });
    expect(out[0]?.color).toBe("yellow");
    expect(out[0]?.reasonCode).toBe("coastal");
  });

  it("flags very old year_built as yellow", () => {
    const out = predictAppetite({
      state: "FL",
      line: "HO",
      sheetSnapshot: { year_built: 1955, miles_to_coast: 10, mobile_home: false },
      carriers: ["c1"],
      rules: seedRules(),
    });
    expect(out[0]?.color).toBe("yellow");
    expect(out[0]?.reasonCode).toBe("year_built");
  });

  it("ignores candidate / non-live rules", () => {
    const rules: StandingRuleInput[] = [
      {
        id: "cand",
        field: "year_built",
        operator: "lte",
        threshold: 2020,
        disposition: "red",
        reasonCode: "other",
        layer: "candidate",
        live: false,
      },
    ];
    const out = predictAppetite({
      state: "FL",
      line: "HO",
      sheetSnapshot: { year_built: 2000 },
      carriers: ["c1"],
      rules,
    });
    expect(out[0]?.color).toBe("green");
  });

  it("applies carrier-specific rules only to that carrier", () => {
    const rules: StandingRuleInput[] = [
      {
        id: "all",
        field: "year_built",
        operator: "lte",
        threshold: 1970,
        disposition: "yellow",
        reasonCode: "year_built",
        carrierId: null,
        layer: "standing",
        live: true,
      },
      {
        id: "only-a",
        field: "miles_to_coast",
        operator: "lte",
        threshold: 5,
        disposition: "red",
        reasonCode: "coastal",
        carrierId: "carrier-a",
        layer: "standing",
        live: true,
      },
    ];
    const out = predictAppetite({
      state: "FL",
      line: "HO",
      sheetSnapshot: { year_built: 1965, miles_to_coast: 2 },
      carriers: ["carrier-a", "carrier-b"],
      rules,
    });
    expect(out.find((p) => p.carrierId === "carrier-a")?.color).toBe("red");
    expect(out.find((p) => p.carrierId === "carrier-b")?.color).toBe("yellow");
  });

  it("documents floor_only resolves as yellow (never green)", () => {
    expect(FLOOR_ONLY_RESOLVES_AS).toBe("yellow");
    expect(resolveActualColor("floor_only")).toBe("yellow");
    expect(resolveActualColor("forced_cov_a")).toBe("yellow");
    expect(resolveActualColor("bindable")).toBe("green");
    expect(resolveActualColor("declined")).toBe("red");
    expect(resolveActualColor("portal_closed")).toBeNull();
  });
});
