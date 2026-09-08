import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7ce Fill from property records", () => {
  it("places the button above the sheet next to the existing header actions", () => {
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).toMatch(/Fill from property records/);
    expect(sheet).toMatch(/fillFromPropertyRecords/);
    expect(sheet).toMatch(/data-ff-fill-property-records/);
    expect(sheet).toMatch(/Confirm extracted/);
    expect(sheet.indexOf("Fill from property records")).toBeLessThan(sheet.indexOf("Save sheet"));
    expect(sheet.indexOf("Fill from source")).toBeLessThan(sheet.indexOf("Fill from property records"));
    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-1",
        line: "home",
        fields: [],
        values: {},
        product: "homeowners",
      }),
    );
    expect(html).toContain("Fill from property records");
    expect(html).toContain("Fill from source");
    expect(html).toContain("Parcel ID");
    expect(html).toContain("Assessed value");
    expect(html).toContain("Records check");
    expect(html).toContain("Square footage");
    expect(html.indexOf("Fill from property records")).toBeLessThan(html.indexOf("Save sheet"));
  });

  it("adds Parcel ID, Assessed value, Records check, and Square footage on the HO sheet", () => {
    const home = fieldsForLine("home", "homeowners");
    expect(home.map((field) => field.label)).toEqual(
      expect.arrayContaining(["Parcel ID", "Assessed value", "Records check", "Square footage"]),
    );
    expect(home.map((field) => field.key)).toEqual(
      expect.arrayContaining(["parcel_id", "assessed_value", "records_check", "square_feet"]),
    );
  });

  it("keeps empty-only apply wired from Fill action (provider is getparceldata)", () => {
    const action = source("src/app/actions/quote-sheet.ts");
    expect(action).toMatch(/fillFromPropertyRecords/);
    expect(action).toMatch(/applyPropertyRecordsToSheet/);
    expect(action).toMatch(/orchestratePropertyFill/);
    expect(action).toMatch(/loadGetParcelDataApiKey/);
  });

  it("does not rewrite document extraction maps", () => {
    const maps = source("src/lib/extraction/legacy_extraction/field-maps.ts");
    expect(maps).toMatch(/sourceLabel: "Year built"/);
    expect(maps).toMatch(/sheetField: "year_built"/);
  });
});
