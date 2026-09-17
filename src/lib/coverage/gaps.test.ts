import { describe, expect, it } from "vitest";
import { analyzeCoverageGaps, classifyCoverageLine, inForceGapPolicies } from "./gaps";

function policy(partial: { id: string; status?: string; lineOfBusiness?: string }) {
  return {
    id: partial.id,
    status: partial.status ?? "active",
    lineOfBusiness: partial.lineOfBusiness ?? "HO",
    policyNumber: partial.id.toUpperCase(),
  };
}

describe("coverage gap rules (in-force only)", () => {
  it("classifies HO3, PA, NFIP, CGL, and workers comp", () => {
    expect(classifyCoverageLine("HO3")).toBe("HO");
    expect(classifyCoverageLine("PA")).toBe("AUTO");
    expect(classifyCoverageLine("NFIP")).toBe("FLOOD");
    expect(classifyCoverageLine("CGL")).toBe("GL");
    expect(classifyCoverageLine("WORKERS_COMP")).toBe("WC");
    expect(classifyCoverageLine("UMBRELLA")).toBe("UMBRELLA");
  });

  it("ignores quotes, quoted status, and cancelled rows", () => {
    const rows = [
      policy({ id: "q", status: "quoted", lineOfBusiness: "HO" }),
      policy({ id: "x", status: "cancelled", lineOfBusiness: "AUTO" }),
      policy({ id: "ok", status: "active", lineOfBusiness: "HO" }),
    ];
    expect(inForceGapPolicies(rows).map((p) => p.id)).toEqual(["ok"]);
  });

  it("keeps Ana at zero findings — quotes never invent coverage", () => {
    const report = analyzeCoverageGaps({
      policies: [],
      partyName: "Ana Dib",
      isAna: true,
      quoteCount: 10,
    });
    expect(report.inForceCount).toBe(0);
    expect(report.findings).toEqual([]);
    expect(report.emptyReason).toMatch(/Do not bind Ana/);
    expect(report.emptyReason).toMatch(/\$321,000/);
    expect(report.quotesDoNotCount).toMatch(/do not count as coverage/);
  });

  it("flags Elena-style homeowners without auto, flood, or umbrella", () => {
    const report = analyzeCoverageGaps({
      policies: [policy({ id: "ho3-elena", lineOfBusiness: "HO3" })],
      partyName: "Elena Ruiz",
    });
    expect(report.findings.map((f) => f.id)).toEqual(["home-no-auto", "home-no-flood", "no-umbrella"]);
    expect(report.findings.find((f) => f.id === "home-no-auto")?.plainEnglish).toMatch(/no auto/);
    expect(report.findings.find((f) => f.id === "home-no-flood")?.plainEnglish).toMatch(/does not pay for flood/);
    expect(report.findings.every((f) => !/score/i.test(f.plainEnglish))).toBe(true);
  });

  it("flags auto-no-home in plain English", () => {
    const report = analyzeCoverageGaps({
      policies: [policy({ id: "pa", lineOfBusiness: "AUTO" })],
      partyName: "Ivy Soto",
    });
    expect(report.findings.map((f) => f.id)).toContain("auto-no-home");
    expect(report.findings.find((f) => f.id === "auto-no-home")?.plainEnglish).toMatch(/no homeowners/);
    expect(report.findings.map((f) => f.id)).not.toContain("home-no-flood");
  });

  it("does not flag flood when the household already has NFIP in force", () => {
    const report = analyzeCoverageGaps({
      policies: [
        policy({ id: "ho", lineOfBusiness: "HO" }),
        policy({ id: "fl", lineOfBusiness: "FLOOD" }),
        policy({ id: "au", lineOfBusiness: "AUTO" }),
        policy({ id: "um", lineOfBusiness: "UMBRELLA" }),
      ],
      partyName: "Full book",
    });
    expect(report.findings).toEqual([]);
    expect(report.emptyReason).toMatch(/companion lines/);
  });

  it("flags Harbor-style GL without workers comp or umbrella", () => {
    const report = analyzeCoverageGaps({
      policies: [policy({ id: "gl-harbor", lineOfBusiness: "GL" })],
      partyName: "Harbor Key Marine LLC",
    });
    expect(report.findings.map((f) => f.id)).toEqual(["gl-no-wc", "gl-no-umbrella"]);
    expect(report.findings[0]?.plainEnglish).toMatch(/workers comp/);
    expect(report.findings.map((f) => f.id)).not.toContain("home-no-auto");
  });

  it("does not read a pending quote-looking status as in-force coverage from quotes", () => {
    const report = analyzeCoverageGaps({
      policies: [policy({ id: "shop", status: "quote", lineOfBusiness: "HO" })],
      partyName: "Shop only",
      quoteCount: 2,
    });
    expect(report.inForceCount).toBe(0);
    expect(report.findings).toEqual([]);
    expect(report.emptyReason).toMatch(/Quotes are not coverage|quote/);
  });

  it("counts bound and pending as in-force, same as Account 360", () => {
    const report = analyzeCoverageGaps({
      policies: [
        policy({ id: "b", status: "bound", lineOfBusiness: "HO" }),
        policy({ id: "p", status: "pending", lineOfBusiness: "AUTO" }),
      ],
      partyName: "Reyes",
    });
    expect(report.inForceCount).toBe(2);
    expect(report.findings.map((f) => f.id)).toEqual(["home-no-flood", "no-umbrella"]);
  });

  it("does not flag missing homeowners when HO is with another carrier (Rosa)", () => {
    const report = analyzeCoverageGaps({
      policies: [policy({ id: "pa", lineOfBusiness: "AUTO" })],
      partyName: "Rosa Castellanos",
      declaredCoverage: [{ line: "HO", carrierOfRecord: "other" }],
    });
    expect(report.findings.map((f) => f.id)).not.toContain("auto-no-home");
    expect(report.findings.flatMap((f) => f.missing)).not.toContain("HO");
    expect(report.coveredLines).toEqual(expect.arrayContaining(["AUTO", "HO"]));
    expect(report.otherCarrierLines).toEqual(["HO"]);
    expect(report.rewrites.map((row) => row.line)).toEqual(["HO"]);
    expect(report.rewrites[0]?.plainEnglish).toMatch(/another carrier/);
    expect(report.rewrites[0]?.plainEnglish).toMatch(/not a missing-homeowners/);
  });

  it("still flags missing homeowners when auto is in force and HO is not covered at all", () => {
    const report = analyzeCoverageGaps({
      policies: [policy({ id: "pa", lineOfBusiness: "AUTO" })],
      partyName: "Rosa Castellanos",
      declaredCoverage: [],
    });
    expect(report.findings.map((f) => f.id)).toContain("auto-no-home");
    expect(report.findings.find((f) => f.id === "auto-no-home")?.missing).toEqual(["HO"]);
    expect(report.otherCarrierLines).toEqual([]);
  });

  it("treats agency in-force HO as with us even if the contact mark says other", () => {
    const report = analyzeCoverageGaps({
      policies: [policy({ id: "ho", lineOfBusiness: "HO3" })],
      partyName: "Elena Ruiz",
      declaredCoverage: [{ line: "HO", carrierOfRecord: "other" }],
    });
    expect(report.otherCarrierLines).toEqual([]);
    expect(report.findings.map((f) => f.id)).toEqual(["home-no-auto", "home-no-flood", "no-umbrella"]);
  });
});
