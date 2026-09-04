import { describe, expect, it } from "vitest";
import { applyLoggedCorrections, preferCorrection } from "./prefer";

describe("fill feedback prefer (rule/log, not ML)", () => {
  const logs = [
    {
      docType: "wind_mit",
      fieldKey: "roof_covering",
      wrongValue: "shingle",
      correctedValue: "architectural shingle",
    },
    {
      docType: "dec",
      fieldKey: "hurricane_deductible",
      wrongValue: "2",
      correctedValue: "2%",
    },
  ];

  it("replaces a repeated wrong extract for the same doc type + field", () => {
    expect(
      preferCorrection(logs, { docType: "wind_mit", fieldKey: "roof_covering", value: "Shingle" }),
    ).toBe("architectural shingle");
  });

  it("does not invent a value when the extract does not match the logged wrong value", () => {
    expect(
      preferCorrection(logs, { docType: "wind_mit", fieldKey: "roof_covering", value: "clay tile" }),
    ).toBeNull();
  });

  it("does not apply a dec correction to a wind mit field of a different type", () => {
    expect(
      preferCorrection(logs, { docType: "wind_mit", fieldKey: "hurricane_deductible", value: "2" }),
    ).toBeNull();
  });

  it("rewrites extracted fields in place for the next fill", () => {
    const result = applyLoggedCorrections(
      [
        { fieldKey: "roof_covering", normalizedValue: "shingle" },
        { fieldKey: "year_built", normalizedValue: "2014" },
      ],
      "wind_mit",
      logs,
    );
    expect(result.appliedKeys).toEqual(["roof_covering"]);
    expect(result.fields[0].normalizedValue).toBe("architectural shingle");
    expect(result.fields[1].normalizedValue).toBe("2014");
  });
});
