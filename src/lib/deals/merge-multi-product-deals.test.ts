import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BOOK_MERGE_TARGETS,
  dealMatchesPerson,
  filledSheetCellCount,
  mergeQuoteSheetValues,
  planPersonMerge,
  productsFromMergeDeal,
  sheetMoveAction,
} from "./merge-multi-product-deals";

describe("Gloria / Heather multi-product book merge", () => {
  it("matches live names and infers HO3 vs DP3 vs Heather package", () => {
    expect(dealMatchesPerson({ id: "1", title: "Gloria Martinez / HO3" }, "Gloria Martinez")).toBe(
      true,
    );
    expect(
      dealMatchesPerson(
        { id: "2", title: "DP3 shop", primaryNamedInsured: "Gloria Martinez" },
        "Gloria Martinez",
      ),
    ).toBe(true);
    expect(productsFromMergeDeal({ id: "a", title: "HO3", quotingForm: "HO3", shopLines: ["home"] })).toEqual([
      "homeowners",
    ]);
    expect(productsFromMergeDeal({ id: "b", title: "DP3", quotingForm: "DP3", shopLines: ["home"] })).toEqual([
      "landlord",
    ]);
    expect(
      productsFromMergeDeal({
        id: "c",
        title: "Heather",
        shopLines: ["home", "auto", "flood"],
        quotingForm: "HO3",
      }),
    ).toEqual(["homeowners", "auto", "flood"]);
  });

  it("keeps the richer deal as survivor and plans HO3+DP3 onto one home line", () => {
    const gloria = planPersonMerge({
      deals: [
        { id: "ho3", title: "Gloria Martinez / HO3", quotingForm: "HO3", shopLines: ["home"] },
        { id: "dp3", title: "Gloria Martinez / DP3", quotingForm: "DP3", shopLines: ["home"] },
      ],
      richness: [
        { dealId: "ho3", docs: 4, quotes: 6, filledSheetCells: 40, sheetLines: ["home"] },
        { dealId: "dp3", docs: 1, quotes: 0, filledSheetCells: 8, sheetLines: ["home"] },
      ],
      requiredProducts: ["homeowners", "landlord"],
    });
    expect(gloria).toMatchObject({
      survivorId: "ho3",
      donorIds: ["dp3"],
      products: ["homeowners", "landlord"],
      shopLines: ["home"],
      alreadyMerged: false,
    });
  });

  it("plans Heather HO3 + Auto + Flood onto one deal with three sheets", () => {
    const heather = planPersonMerge({
      deals: [
        {
          id: "home",
          title: "Heather Camirand / HO3",
          quotingForm: "HO3",
          shopLines: ["home", "auto"],
        },
        { id: "flood", title: "Heather Camirand / Flood", quotingForm: "FLOOD", shopLines: ["flood"] },
      ],
      richness: [
        { dealId: "home", docs: 8, quotes: 12, filledSheetCells: 80, sheetLines: ["home", "auto"] },
        { dealId: "flood", docs: 2, quotes: 3, filledSheetCells: 10, sheetLines: ["flood"] },
      ],
      requiredProducts: ["homeowners", "auto", "flood"],
    });
    expect(heather).toMatchObject({
      survivorId: "home",
      donorIds: ["flood"],
      products: ["homeowners", "auto", "flood"],
      shopLines: ["home", "auto", "flood"],
    });
  });

  it("is a no-op when the book is already one multi-product deal", () => {
    expect(
      planPersonMerge({
        deals: [
          {
            id: "one",
            title: "Gloria Martinez / HO3",
            shopProducts: ["homeowners", "landlord"],
            shopLines: ["home"],
          },
        ],
        richness: [{ dealId: "one", docs: 1, quotes: 1, filledSheetCells: 4, sheetLines: ["home"] }],
        requiredProducts: ["homeowners", "landlord"],
      })?.alreadyMerged,
    ).toBe(true);
  });

  it("merges donor sheet blanks into the survivor home sheet", () => {
    const merged = mergeQuoteSheetValues(
      {
        coverage_a: { value: "321000", status: "confirmed", source: "agent" },
        year_built: { value: "", status: "missing", source: "blank" },
      },
      {
        year_built: { value: "1988", status: "confirmed", source: "agent" },
        coverage_a: { value: "100", status: "confirmed", source: "extracted" },
      },
    );
    expect(merged.coverage_a.value).toBe("321000");
    expect(merged.year_built.value).toBe("1988");
    expect(filledSheetCellCount(merged)).toBe(2);
    expect(sheetMoveAction({ survivorHasLine: false, donorHasUserData: true })).toBe("move");
    expect(sheetMoveAction({ survivorHasLine: true, donorHasUserData: true })).toBe(
      "merge-into-survivor",
    );
  });

  it("ships a one-shot Neon script under scripts/", () => {
    expect(BOOK_MERGE_TARGETS.map((row) => row.key)).toEqual(["gloria", "heather"]);
    const script = readFileSync("scripts/merge-gloria-heather-multiproduct.ts", "utf8");
    expect(script).toMatch(/DATABASE_URL/);
    expect(script).toMatch(/Gloria Martinez/);
    expect(script).toMatch(/Heather Camirand/);
    expect(script).toMatch(/archivedAt/);
    expect(script).toMatch(/shopProducts/);
    expect(script).toMatch(/tagDealQuoteShopLines/);
    expect(script).toMatch(/shopLineToPersist/);
  });
});
