import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEAL_PRODUCTS,
  dealProductSwitcherHref,
  familyForProducts,
  hasCommercialProduct,
  inferDealProducts,
  lifeHealthShopRepair,
  normalizeDealProducts,
  pipelineSlugForProducts,
  productCreateDraft,
  productsFromForm,
  productsFromFormOrUndefined,
  resolveActiveDealProduct,
  shopLinesFromProducts,
  uniqueLobsToBind,
} from "./deal-products";

describe("deal product picker catalog", () => {
  it("groups Personal + Commercial + Life + Health and defaults to Home (HO)", () => {
    expect(DEAL_PRODUCTS).toEqual(
      expect.arrayContaining([
        "homeowners",
        "landlord",
        "auto",
        "flood",
        "rv",
        "boat",
        "umbrella",
        "motorcycle",
        "gl",
        "workers_comp",
        "bop",
        "commercial_auto",
        "life_term",
        "life_whole",
        "life_iul",
        "life_final",
        "health_marketplace",
        "health_ma",
        "health_med_ab",
        "health_supplemental",
      ]),
    );
    expect(normalizeDealProducts([])).toEqual(["homeowners"]);
    expect(normalizeDealProducts(["home", "dp3", "auto"])).toEqual(["homeowners", "landlord", "auto"]);
  });

  it("allows mixes across families and maps HO3+DP3 onto one home shop line", () => {
    expect(shopLinesFromProducts(["homeowners", "landlord"])).toEqual(["home"]);
    expect(shopLinesFromProducts(["homeowners", "auto", "flood"])).toEqual(["home", "auto", "flood"]);
    expect(shopLinesFromProducts(["life_term", "health_marketplace"])).toEqual(["life", "health"]);
    expect(shopLinesFromProducts(["gl", "homeowners"])).toEqual(["home", "general_liability"]);
  });

  it("reads shopProducts (or shopLines aliases) from FormData-like objects", () => {
    expect(
      productsFromForm({
        getAll: (name: string) => (name === "shopProducts" ? ["life_term", "auto"] : []),
        get: () => "",
      }),
    ).toEqual(["auto", "life_term"]);
    expect(productsFromFormOrUndefined({ getAll: () => [], get: () => "" })).toBeUndefined();
  });
});

describe("create draft + stages + bind LOBs", () => {
  it("persists products on Save and puts any PC mix on the p-c board", () => {
    const homeAuto = productCreateDraft(["homeowners", "auto"]);
    expect(homeAuto.shopLines).toEqual(["home", "auto"]);
    expect(homeAuto.products).toEqual(["homeowners", "auto"]);
    expect(homeAuto.quotingForm).toBe("HO3");
    expect(homeAuto.pipelineSlug).toBe("p-c");
    expect(homeAuto.accountKind).toBe("personal");
    expect(homeAuto.bindTarget).toBe("contact");

    const lifeOnly = productCreateDraft(["life_whole"]);
    expect(lifeOnly.pipelineSlug).toBe("life");
    expect(lifeOnly.quotingForm).toBe("Whole Life");

    const healthOnly = productCreateDraft(["health_ma"]);
    expect(healthOnly.pipelineSlug).toBe("health");

    const mixedPcLife = productCreateDraft(["homeowners", "life_term"]);
    expect(mixedPcLife.pipelineSlug).toBe("p-c");
    expect(familyForProducts(mixedPcLife.products)).toBe("pc");
  });

  it("flags commercial mixes for the Business/account path", () => {
    expect(hasCommercialProduct(["gl"])).toBe(true);
    expect(hasCommercialProduct(["homeowners", "bop"])).toBe(true);
    expect(hasCommercialProduct(["auto", "flood"])).toBe(false);
    expect(productCreateDraft(["gl", "workers_comp"]).accountKind).toBe("commercial");
    expect(productCreateDraft(["gl", "workers_comp"]).bindTarget).toBe("account");
    expect(productCreateDraft(["homeowners", "gl"]).bindTarget).toBe("contact");
    expect(productCreateDraft(["homeowners", "gl"]).accountKind).toBe("commercial");
  });

  it("binds one policy per distinct LOB (HO3+DP3 share HO; Heather is three)", () => {
    expect(uniqueLobsToBind({ shopProducts: ["homeowners", "landlord"] })).toEqual(["HO"]);
    expect(uniqueLobsToBind({ shopProducts: ["homeowners", "auto", "flood"] })).toEqual([
      "HO",
      "AUTO",
      "FLOOD",
    ]);
    expect(pipelineSlugForProducts(["flood"])).toBe("p-c");
  });
});

describe("chips + inference", () => {
  it("switches chips with ?line= + ?product= and infers HO3 vs DP3 on a home line", () => {
    expect(
      dealProductSwitcherHref({ dealId: "deal-1", product: "landlord", tab: "details" }),
    ).toBe("/deals/deal-1?tab=details&line=home&product=landlord");
    expect(
      resolveActiveDealProduct({
        productParam: "landlord",
        lineParam: "home",
        products: ["homeowners", "landlord"],
      }),
    ).toBe("landlord");
    expect(
      inferDealProducts({ shopLines: ["home"], quotingForm: "DP3" }),
    ).toEqual(["landlord"]);
    expect(
      inferDealProducts({ shopLines: ["home", "auto", "flood"], quotingForm: "HO3" }),
    ).toEqual(["homeowners", "auto", "flood"]);
  });

  it("does not inherit HO3 from leftover home shop_lines on Life/Health deals", () => {
    expect(
      inferDealProducts({
        shopLines: ["home"],
        shopProducts: [],
        lineOfBusiness: "LIFE",
        quotingLine: "life",
        quotingForm: "Term Life",
      }),
    ).toEqual(["life_term"]);
    expect(
      inferDealProducts({
        shopLines: ["home"],
        lineOfBusiness: "LIFE",
        quotingLine: "life",
      }),
    ).toEqual(["life_term"]);
    expect(
      inferDealProducts({
        shopProducts: ["homeowners"],
        shopLines: ["home"],
        lineOfBusiness: "HEALTH",
        quotingLine: "health",
      }),
    ).toEqual(["health_marketplace"]);
    const repair = lifeHealthShopRepair({
      shopLines: ["home"],
      shopProducts: [],
      lineOfBusiness: "LIFE",
      quotingLine: "life",
      quotingForm: "Term Life",
    });
    expect(repair).toEqual({ shopLines: ["life"], shopProducts: ["life_term"] });
  });

  it("repairs Tyler Bhattel Neon: LIFE + quoting_line=life + leftover shop_lines home", () => {
    // deal 9e9c9347-64ae-4c77-a76d-13a6a999df25
    const tyler = {
      title: "Tyler Bhattel / Term Life",
      shopLines: ["home"],
      shopProducts: [] as string[],
      lineOfBusiness: "LIFE",
      quotingLine: "life",
    };
    expect(inferDealProducts(tyler)).toEqual(["life_term"]);
    expect(lifeHealthShopRepair(tyler)).toEqual({
      shopLines: ["life"],
      shopProducts: ["life_term"],
    });
    expect(readFileSync("src/lib/deals/retitle.ts", "utf8")).toMatch(/lifeHealthShopRepair/);
    expect(readFileSync("src/lib/db/queries.ts", "utf8")).toMatch(/lifeHealthShopRepair\(deal\)/);
    expect(readFileSync("src/lib/deals/deal-title.ts", "utf8")).toMatch(/visibleDealTitle/);
  });
});

describe("create + detail wiring", () => {
  it("grouped picker is on create; chips + shared/product details are on the deal", () => {
    const picker = readFileSync("src/components/deals/product-picker.tsx", "utf8");
    expect(picker).toMatch(/data-ff-product-picker/);
    expect(picker).toMatch(/Personal/);
    expect(picker).toMatch(/Commercial/);
    expect(picker).toMatch(/Life/);
    expect(picker).toMatch(/Health/);
    expect(picker).toMatch(/shopProducts/);

    const dialog = readFileSync("src/components/deals/add-new-deal-dialog.tsx", "utf8");
    expect(dialog).toMatch(/ProductPicker/);
    expect(dialog).toMatch(/newDealCreateHref/);
    expect(dialog).not.toMatch(/createDealFromScratch/);

    const fields = readFileSync("src/components/deals/new-deal-create-fields.tsx", "utf8");
    expect(fields).toMatch(/ProductPicker/);
    expect(fields).toMatch(/intent/);
    expect(fields).toMatch(/new-shop/);

    const page = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    expect(page).toMatch(/DealLineSwitcher/);
    expect(page).toMatch(/DealFlowRail/);
    expect(page).toMatch(/layoutForActiveProduct|activeProduct/);
    expect(page).toMatch(/productSectionComplete/);
    expect(page).not.toMatch(/DealLineSelector/);
    expect(readFileSync("src/lib/deals/product-ui.ts", "utf8")).toMatch(
      /id: "create"[\s\S]*id: "details"[\s\S]*id: "documents"[\s\S]*id: "markets"[\s\S]*id: "quotes"/,
    );

    const save = readFileSync("src/app/actions/crm.ts", "utf8");
    expect(save).toMatch(/shopProducts/);
    expect(save).toMatch(/packageDraftForNewDealSave/);
    expect(save).toMatch(/insertSheetsForDeal\(deal\.id, shopLines\)/);
    expect(save).toMatch(/hasCommercialProduct/);
  });
});
