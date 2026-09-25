import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/rosa",
}));

import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import {
  mergeLiveWithServerValues,
  sheetControlValue,
  sheetDisplayValue,
  sheetFieldCell,
} from "@/lib/quote-sheet/sheet-live";

function cell(value: string): QuoteSheetFieldValue {
  return { value, status: "check", source: "extracted", sourceLabel: "wind mitigation" };
}

describe("sheet live rehydrate after Fill", () => {
  it("does not let a blank live string hide the stored cell", () => {
    expect("" ?? "OIR-B1-1802").toBe("");
    expect(sheetDisplayValue("", "OIR-B1-1802")).toBe("OIR-B1-1802");
    expect(sheetDisplayValue("", "2005")).toBe("2005");
    expect(sheetDisplayValue("typed", "OIR-B1-1802")).toBe("typed");
    expect(sheetControlValue("wind_mit_form", "", "OIR-B1-1802")).toBe("OIR-B1-1802");
    expect(sheetControlValue("wind_mit_date", "", "10/01/2020")).toBe("10/01/2020");
    expect(sheetControlValue("wind_mit_inspector", "", "Kendall")).toBe("Kendall");
    expect(sheetControlValue("roof_year", "", "2005")).toBe("2005");
    expect(sheetControlValue("roof_covering", "", "A")).toBe("Meets FBC 2001");
    expect(sheetControlValue("roof_deck", "", "Level C")).toBe("Level C");
    expect(sheetControlValue("opening_protection", "", "Hurricane Protection")).toBe(
      "Hurricane Protection",
    );
  });

  it("maps year_built and construction onto the Risk Profile controls", () => {
    const gloria = {
      year_built: { value: "2000", status: "check" as const, source: "extracted" as const },
      construction: { value: "masonry", status: "check" as const, source: "extracted" as const },
      occupancy: { value: "Owner", status: "check" as const, source: "extracted" as const },
      construction_type: { value: "", status: "missing" as const, source: "blank" as const },
    };
    expect(sheetFieldCell(gloria, "year_built")?.value).toBe("2000");
    expect(sheetFieldCell(gloria, "construction")?.value).toBe("masonry");
    expect(sheetControlValue("construction", "", sheetFieldCell(gloria, "construction")?.value)).toBe(
      "Masonry",
    );
    expect(sheetControlValue("year_built", "", sheetFieldCell(gloria, "year_built")?.value)).toBe("2000");

    const aliasOnly = {
      year_of_construction: { value: "24", status: "check" as const, source: "extracted" as const },
      construction_type: { value: "Masonry", status: "check" as const, source: "extracted" as const },
    };
    expect(sheetFieldCell(aliasOnly, "year_built")?.value).toBe("24");
    expect(sheetFieldCell(aliasOnly, "construction")?.value).toBe("Masonry");
    expect(sheetControlValue("construction", "", "masonry")).toBe("Masonry");
  });

  it("adopts filled server cells into a blank mount and keeps a typed override", () => {
    const blank = {
      wind_mit_form: "",
      wind_mit_date: "",
      wind_mit_inspector: "",
      roof_year: "",
      roof_covering: "",
      roof_deck: "",
      opening_protection: "",
    };
    const filled = {
      wind_mit_form: "OIR-B1-1802",
      wind_mit_date: "10/01/2020",
      wind_mit_inspector: "Kendall",
      roof_year: "2005",
      roof_covering: "A",
      roof_deck: "Level C",
      opening_protection: "Hurricane Protection",
    };
    expect(mergeLiveWithServerValues(blank, blank, filled)).toEqual(filled);
    expect(
      mergeLiveWithServerValues(
        { ...blank, wind_mit_form: "typed by agent" },
        blank,
        filled,
      ).wind_mit_form,
    ).toBe("typed by agent");
    expect(
      mergeLiveWithServerValues({ roof_year: "1999" }, { roof_year: "1999" }, { roof_year: "2005" })
        .roof_year,
    ).toBe("2005");
  });

  it("paints Wind Mitigation controls from filled sheet cells", () => {
    const values = {
      ...emptySheetValues("home", "homeowners"),
      wind_mit_form: cell("OIR-B1-1802"),
      wind_mit_date: cell("10/01/2020"),
      wind_mit_inspector: cell("Kendall"),
      roof_year: cell("2005"),
      roof_covering: cell("A"),
      roof_deck: cell("Level C"),
      opening_protection: cell("Hurricane Protection"),
    };
    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "260de6f1-d91b-4e9f-ae0e-61e38de04b52",
        line: "home",
        fields: [],
        values,
        product: "homeowners",
      }),
    );
    expect(html).toContain("OIR-B1-1802");
    expect(html).toContain("10/01/2020");
    expect(html).toContain("Kendall");
    expect(html).toContain("2005");
    expect(html).toContain("Meets FBC 2001");
    expect(html).toContain("Level C");
    expect(html).toContain("Hurricane Protection");
    expect(html).toContain("wind mitigation");
    expect(html).toContain(">check<");
    expect(html).toContain('data-ff-sheet-picklist="roof_covering"');
    expect(html).toMatch(/data-ff-sheet-picklist="roof_covering"[\s\S]*Meets FBC 2001/);

    const form = readFileSync("src/components/deal/master-sheet-compare.tsx", "utf8");
    expect(form).toMatch(/mergeLiveWithServerValues/);
    expect(form).toMatch(/sheetControlValue\(field\.key, liveValues\[field\.key\], cell\?\.value\)/);
    expect(form).not.toMatch(/liveValues\[field\.key\] \?\? cell\?\.value/);
    expect(form).toMatch(/key=\{rehydrateKey\}/);
  });
});
