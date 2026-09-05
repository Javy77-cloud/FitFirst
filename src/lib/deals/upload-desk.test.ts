import { describe, expect, it } from "vitest";
import { reportFromSheet } from "@/lib/completeness/report";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { anaHomeSheetValues } from "@/lib/quote-sheet/ana-home";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { collectDocHints } from "./upload-desk";

describe("collectDocHints — upload desk next-docs", () => {
  it("asks Ana for wind mit and 4-point when those bind cells are open and no source files", () => {
    const report = reportFromSheet("home", anaHomeSheetValues(fixture.risk));
    const hints = collectDocHints(report, []);
    expect(hints.map((row) => row.docType)).toEqual(["wind_mit", "four_point"]);
    expect(hints.some((row) => row.docType === "dec")).toBe(false);
  });

  it("drops a hint once that source type is already on the deal", () => {
    const report = reportFromSheet("home", anaHomeSheetValues(fixture.risk));
    const hints = collectDocHints(report, ["wind_mit"]);
    expect(hints.map((row) => row.docType)).toEqual(["four_point"]);
  });

  it("asks a blank home sheet for a dec first", () => {
    const report = reportFromSheet("home", emptySheetValues("home"));
    const hints = collectDocHints(report, []);
    expect(hints.map((row) => row.docType)).toEqual(["dec", "wind_mit", "four_point"]);
  });

  it("returns nothing without a sheet report", () => {
    expect(collectDocHints(null, [])).toEqual([]);
  });
});
