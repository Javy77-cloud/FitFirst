import { describe, expect, it } from "vitest";
import {
  compareQuotes,
  inferIncludesFlood,
  parseDeductible,
  quoteToCompareInput,
  type CompareQuote,
} from "./gap-notes";

const ai: CompareQuote = {
  id: "ai",
  carrierName: "American Integrity",
  premium: 2840,
  aopDeductible: "$2,500",
  hurricaneDeductible: "2%",
  coverageA: 385000,
  bindable: true,
  coverageGaps: [],
  notes: "Cheapest. Stub quote.",
  includesFlood: false,
};

const geo: CompareQuote = {
  id: "geo",
  carrierName: "GeoVera",
  premium: 3640,
  aopDeductible: "$5,000",
  hurricaneDeductible: "5%",
  coverageA: 365000,
  bindable: true,
  coverageGaps: ["No flood"],
  notes: "No flood endorsement.",
  includesFlood: false,
};

describe("parseDeductible", () => {
  it("reads dollars and percents", () => {
    expect(parseDeductible("$2,500")).toEqual({ kind: "dollars", value: 2500, raw: "$2,500" });
    expect(parseDeductible("5%")).toEqual({ kind: "percent", value: 5, raw: "5%" });
    expect(parseDeductible("")).toEqual({ kind: "unknown", value: null, raw: "" });
  });
});

describe("inferIncludesFlood", () => {
  it("treats includes-flood as yes and no-flood as no", () => {
    expect(inferIncludesFlood({ notes: "Includes flood endorsement" })).toBe(true);
    expect(inferIncludesFlood({ coverageGaps: ["No flood"] })).toBe(false);
  });
});

describe("compareQuotes", () => {
  it("flags higher deductible, no flood, lower Cov A, and higher premium", () => {
    const rows = compareQuotes([ai, geo], {
      coverageA: 385000,
      state: "FL",
      line: "HO",
      wantsFlood: true,
    });
    const geoNotes = rows.find((r) => r.id === "geo")!.notesPlain.map((n) => n.code);
    expect(geoNotes).toContain("aop_higher");
    expect(geoNotes).toContain("hurricane_higher");
    expect(geoNotes).toContain("cova_lower");
    expect(geoNotes).toContain("no_flood");
    expect(geoNotes).toContain("premium_higher");
    expect(rows.find((r) => r.id === "ai")!.cheapest).toBe(true);
    expect(rows.find((r) => r.id === "geo")!.notesPlain.find((n) => n.code === "aop_higher")?.text).toMatch(
      /higher \(\$5,000 vs \$2,500\)/,
    );
  });

  it("says Florida homeowners quotes do not include flood unless endorsed", () => {
    const rows = compareQuotes([ai], { state: "FL", line: "HO3" });
    expect(rows[0].notesPlain.some((n) => n.code === "no_flood" && /Florida/.test(n.text))).toBe(true);
  });

  it("marks a quote that is not bindable", () => {
    const ana = quoteToCompareInput({
      id: "ana-ai",
      carrierName: "American Integrity",
      premium: 5607.53,
      aopDeductible: null,
      hurricaneDeductible: null,
      coverageA: 321000,
      bindable: false,
      coverageGaps: ["No opening protection credit"],
      notes: "Quoted at $321,000 but not bindable.",
      result: "quoted",
    });
    expect(ana.coverageA).toBe(321000);
    const rows = compareQuotes([ana], { coverageA: 321000, state: "FL", line: "HO" });
    expect(rows[0].notesPlain.some((n) => n.code === "not_bindable")).toBe(true);
    expect(rows[0].notesPlain.some((n) => /opening protection/i.test(n.text))).toBe(true);
  });

  it("names the peer when another option includes flood", () => {
    const withFlood: CompareQuote = { ...ai, includesFlood: true, notes: "Includes flood endorsement" };
    const rows = compareQuotes([withFlood, geo], { state: "FL", line: "HO" });
    expect(rows.find((r) => r.id === "geo")!.notesPlain.find((n) => n.code === "no_flood")?.text).toMatch(
      /American Integrity includes flood/,
    );
  });
});
