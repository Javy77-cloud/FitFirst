import { describe, expect, it } from "vitest";
import { applyPublicToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { anaHomeSheetValues } from "@/lib/quote-sheet/ana-home";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { addressFromSheet, curatedFactsFor } from "./facts";

describe("public-record gap-fill", () => {
  it("offers Adige listing/FEMA facts and never a Zestimate Cov A", () => {
    const found = curatedFactsFor({
      address1: "1098 Adige Ct SE",
      city: "Palm Bay",
      state: "FL",
      zip: "32909",
    });
    expect(found).toBeTruthy();
    expect(found!.facts.some((f) => f.fieldKey === "coverage_a")).toBe(false);
    expect(found!.facts.map((f) => f.fieldKey)).toEqual(
      expect.arrayContaining(["square_feet", "beds", "baths", "flood_zone"]),
    );
  });

  it("fills Ana blanks (sqft / beds) without touching Javy Cov A", () => {
    const existing = anaHomeSheetValues(fixture.risk);
    const found = curatedFactsFor(addressFromSheet(existing));
    const result = applyPublicToSheet("home", existing, found?.facts ?? []);
    expect(result.values.coverage_a.value).toBe("321000");
    expect(result.values.coverage_a.source).toBe("javy");
    expect(result.values.square_feet.value).toBe("1592");
    expect(result.values.beds.value).toBe("3");
    expect(result.values.flood_zone.value).toBe("A");
  });

  it("starts from emptySheetValues so new catalog keys exist as missing", () => {
    const empty = emptySheetValues("home");
    expect(empty.beds.status).toBe("missing");
    expect(empty.flood_zone.status).toBe("missing");
  });
});
