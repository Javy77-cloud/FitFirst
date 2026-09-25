import { describe, expect, it } from "vitest";
import {
  DEFAULT_DESK_LINE_SETTINGS,
  DEFAULT_HEALTH_SUBFILTERS,
  DEFAULT_LIFE_SUBFILTERS,
  deskNavExtras,
  fallbackPipelineSlug,
  filterLineMix,
  findSubfilter,
  isHiddenLine,
  matchesSubfilter,
  slugifySubfilter,
  visibleCommissionBooks,
  visibleInsuranceTypes,
  visibleLines,
  visiblePipelineBoards,
  visiblePolicyBooks,
  visibleShopLines,
  allowLifeHealthFamily,
  dealPipelineShowsSellingAgency,
} from "./line-settings";

const hiddenBoth = { writeLife: false, writeHealth: false, showSellingAgency: false };
const lifeOnly = { writeLife: true, writeHealth: false, showSellingAgency: false };
const healthOnly = { writeLife: false, writeHealth: true, showSellingAgency: false };

describe("default Life / Health subfilters", () => {
  it("ships Term / Whole / IUL / Final Expense on Life", () => {
    expect(DEFAULT_LIFE_SUBFILTERS.map((row) => row.label)).toEqual([
      "Term Life",
      "Whole Life",
      "IUL",
      "Final Expense",
    ]);
  });

  it("ships Marketplace / MA / A&B / Supplemental on Health", () => {
    expect(DEFAULT_HEALTH_SUBFILTERS.map((row) => row.label)).toEqual([
      "Marketplace",
      "Medicare Advantage",
      "Medicare A&B",
      "Supplemental",
    ]);
  });

  it("keeps selling-agency picklists off by default", () => {
    expect(DEFAULT_DESK_LINE_SETTINGS.showSellingAgency).toBe(false);
  });

  it("shows Deal Details selling agency only when Life or Health is written", () => {
    expect(dealPipelineShowsSellingAgency(hiddenBoth)).toBe(false);
    expect(dealPipelineShowsSellingAgency(lifeOnly)).toBe(true);
    expect(dealPipelineShowsSellingAgency(healthOnly)).toBe(true);
    expect(dealPipelineShowsSellingAgency({ writeLife: true, writeHealth: true })).toBe(true);
    expect(dealPipelineShowsSellingAgency(null)).toBe(true);
  });
});

describe("LOB hide toggles", () => {
  it("drops Life and Health from books, lines, shop tabs, boards, and nav", () => {
    expect(visiblePolicyBooks(hiddenBoth).map((row) => row.id)).toEqual(["all", "pc"]);
    expect(visibleLines(["HO", "LIFE", "HEALTH", "AUTO"], hiddenBoth)).toEqual(["HO", "AUTO"]);
    expect(visibleShopLines(["home", "life", "health", "auto"], hiddenBoth)).toEqual([
      "home",
      "auto",
    ]);
    expect(
      visiblePipelineBoards(
        [{ slug: "p-c" }, { slug: "life" }, { slug: "health" }, { slug: "won-lost" }, { slug: "renewals" }],
        hiddenBoth,
      ).map((row) => row.slug),
    ).toEqual(["p-c", "won-lost"]);
    expect(deskNavExtras(hiddenBoth)).toEqual([]);
    expect(isHiddenLine("LIFE", hiddenBoth)).toBe(true);
    expect(isHiddenLine("HEALTH", hiddenBoth)).toBe(true);
    expect(
      visibleInsuranceTypes(
        [{ id: "pc" }, { id: "life" }, { id: "health" }],
        hiddenBoth,
      ).map((row) => row.id),
    ).toEqual(["pc"]);
    expect(
      visibleCommissionBooks(
        [{ value: "pc" }, { value: "life" }, { value: "health" }],
        hiddenBoth,
      ).map((row) => row.value),
    ).toEqual(["pc"]);
    expect(allowLifeHealthFamily("life", "pc", hiddenBoth)).toBe("pc");
    expect(allowLifeHealthFamily("life", "life", hiddenBoth)).toBe("life");
  });

  it("can hide one book and keep the other", () => {
    expect(visiblePolicyBooks(lifeOnly).map((row) => row.id)).toEqual(["all", "pc", "life"]);
    expect(visiblePolicyBooks(healthOnly).map((row) => row.id)).toEqual(["all", "pc", "health"]);
    expect(deskNavExtras(lifeOnly)).toEqual([{ href: "/deals?pipeline=life", label: "Life" }]);
    expect(fallbackPipelineSlug("health", lifeOnly)).toBe("p-c");
    expect(fallbackPipelineSlug("life", lifeOnly)).toBe("life");
    expect(filterLineMix([{ key: "HO" }, { key: "LIFE" }, { key: "HEALTH" }], lifeOnly)).toEqual([
      { key: "HO" },
      { key: "LIFE" },
    ]);
  });
});

describe("subfilter matching", () => {
  it("matches Term Life, Whole Life, IUL, and Final Expense aliases", () => {
    const [term, whole, iul, final] = DEFAULT_LIFE_SUBFILTERS;
    expect(matchesSubfilter("Term Life", term)).toBe(true);
    expect(matchesSubfilter("Whole Life", whole)).toBe(true);
    expect(matchesSubfilter("Indexed Universal Life (IUL)", iul)).toBe(true);
    expect(matchesSubfilter("IUL", iul)).toBe(true);
    expect(matchesSubfilter("Final Expense", final)).toBe(true);
    expect(matchesSubfilter("Accidental Death", term)).toBe(false);
  });

  it("matches Marketplace, Medicare Advantage, Medicare A&B, and Supplemental", () => {
    const [marketplace, ma, ab, supp] = DEFAULT_HEALTH_SUBFILTERS;
    expect(matchesSubfilter("Marketplace", marketplace)).toBe(true);
    expect(matchesSubfilter("Medicare Advantage", ma)).toBe(true);
    expect(matchesSubfilter("Medicare A&B", ab)).toBe(true);
    expect(matchesSubfilter("Original Medicare", ab)).toBe(true);
    expect(matchesSubfilter("Supplemental Health", supp)).toBe(true);
    expect(matchesSubfilter("Medicare Supplement (Medigap)", supp)).toBe(true);
    expect(findSubfilter("MAPD", DEFAULT_HEALTH_SUBFILTERS)?.slug).toBe("medicare_advantage");
  });

  it("matches a custom option by its own label", () => {
    expect(
      matchesSubfilter("Guaranteed Issue", { slug: "guaranteed_issue", label: "Guaranteed Issue" }),
    ).toBe(true);
    expect(slugifySubfilter("Medicare A&B")).toBe("medicare_a_and_b");
  });
});
