import { describe, expect, it } from "vitest";
import {
  applyCoverageLineChoice,
  applyInForceCarrierLock,
  classifyDeclaredCoverageType,
  coverageChoiceForLine,
  declaredCoverageFromFields,
  parseCoverageCarrierMap,
  serializeCoverageCarrierMap,
} from "./declared-coverage";

describe("declared coverage / carrier-of-record", () => {
  it("maps policy-subtype labels onto gap lines", () => {
    expect(classifyDeclaredCoverageType("HO3")).toBe("HO");
    expect(classifyDeclaredCoverageType("HO6 ( Condo)")).toBe("HO");
    expect(classifyDeclaredCoverageType("HO4 (Renters)")).toBe("HO");
    expect(classifyDeclaredCoverageType("Homeowners")).toBe("HO");
    expect(classifyDeclaredCoverageType("NFIP Flood")).toBe("FLOOD");
    expect(classifyDeclaredCoverageType("Private Flood")).toBe("FLOOD");
    expect(classifyDeclaredCoverageType("Personal Umbrella")).toBe("UMBRELLA");
    expect(classifyDeclaredCoverageType("Auto")).toBe("AUTO");
    expect(classifyDeclaredCoverageType("Motorcycle")).toBe("AUTO");
  });

  it("parses a carrier map keyed by line or label", () => {
    const map = parseCoverageCarrierMap(
      JSON.stringify({ HO: "other", Auto: "us", "NFIP Flood": "other" }),
    );
    expect(map.HO).toBe("other");
    expect(map.AUTO).toBe("us");
    expect(map.FLOOD).toBe("other");
  });

  it("treats every selected type as other-carrier coverage, never with us", () => {
    const rows = declaredCoverageFromFields({
      existingCoverageTypes: "HO3,Auto",
      carrierOfRecord: JSON.stringify({ HO: "us", AUTO: "other" }),
    });
    expect(rows).toEqual(
      expect.arrayContaining([
        { line: "HO", carrierOfRecord: "other" },
        { line: "AUTO", carrierOfRecord: "other" },
      ]),
    );
    expect(rows.every((row) => row.carrierOfRecord === "other")).toBe(true);
  });

  it("ignores a stale us mark that is not on the other-carrier field", () => {
    const rows = declaredCoverageFromFields({
      existingCoverageTypes: "",
      carrierOfRecord: JSON.stringify({ HO: "us" }),
    });
    expect(rows).toEqual([]);
  });

  it("locks in-force lines as with us", () => {
    const locked = applyInForceCarrierLock(
      [{ line: "HO", carrierOfRecord: "other" }],
      ["AUTO"],
    );
    expect(locked.find((row) => row.line === "AUTO")).toEqual({
      line: "AUTO",
      carrierOfRecord: "us",
    });
    expect(locked.find((row) => row.line === "HO")?.carrierOfRecord).toBe("other");
  });

  it("keeps an existing HO6 label when flipping carrier-of-record", () => {
    const next = applyCoverageLineChoice({
      line: "HO",
      choice: "other",
      existingTypes: ["HO6 ( Condo)", "Auto"],
      carrierMap: { AUTO: "us" },
    });
    expect(next.existingTypes).toEqual(["Auto", "HO6 ( Condo)"]);
    expect(next.carrierMap.HO).toBe("other");
    expect(next.carrierMap.AUTO).toBe("us");
  });

  it("drops the line when marked not covered", () => {
    const next = applyCoverageLineChoice({
      line: "HO",
      choice: "none",
      existingTypes: ["HO3", "Auto"],
      carrierMap: { HO: "other", AUTO: "other" },
    });
    expect(next.existingTypes).toEqual(["Auto"]);
    expect(next.carrierMap.HO).toBeUndefined();
    expect(serializeCoverageCarrierMap(next.carrierMap)).toBe(JSON.stringify({ AUTO: "other" }));
  });

  it("does not persist with-us onto the other-carrier field", () => {
    const next = applyCoverageLineChoice({
      line: "HO",
      choice: "us",
      existingTypes: ["HO3", "Auto"],
      carrierMap: { HO: "other", AUTO: "other" },
    });
    expect(next.existingTypes).toEqual(["Auto"]);
    expect(next.carrierMap.HO).toBeUndefined();
  });

  it("prefers in-force over a stored other-carrier mark", () => {
    expect(
      coverageChoiceForLine({
        line: "HO",
        declared: [{ line: "HO", carrierOfRecord: "other" }],
        inForceLines: ["HO"],
      }),
    ).toBe("us");
  });

  it("does not treat a stale us mark as with us when the line is not in force", () => {
    expect(
      coverageChoiceForLine({
        line: "HO",
        declared: [{ line: "HO", carrierOfRecord: "us" }],
        inForceLines: [],
      }),
    ).toBe("none");
  });
});
