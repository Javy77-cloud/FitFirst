import { describe, expect, it } from "vitest";
import { DEAL_ID, ELENA_DEAL_ID } from "@/lib/fixtures/ids";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { parseSheetFieldParam, sheetBlankHref, sheetFieldDomId } from "./fix-href";
import { reportFromSheet } from "./report";
import { anaHomeSheetValues } from "@/lib/quote-sheet/ana-home";

describe("missing-data gauge links", () => {
  it("points a blank at the Quote Sheet cell, not a bind path", () => {
    expect(sheetFieldDomId("square_feet")).toBe("sheet-field-square_feet");
    expect(sheetBlankHref(ELENA_DEAL_ID, "square_feet")).toBe(
      `/deals/${ELENA_DEAL_ID}?tab=documents&field=square_feet#sheet-field-square_feet`,
    );
    expect(parseSheetFieldParam("coverage_a")).toBe("coverage_a");
  });

  it("links Ana's missing bind fields without offering bind", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    const report = reportFromSheet("home", anaHomeSheetValues(fixture.risk));
    const hrefs = report.bindBlockers.map((row) => sheetBlankHref(DEAL_ID, row.key));
    expect(hrefs.some((href) => href.includes("square_feet"))).toBe(true);
    expect(hrefs.join(" ")).not.toMatch(/bind/i);
    expect(hrefs.every((href) => href.includes("tab=documents"))).toBe(true);
  });
});
