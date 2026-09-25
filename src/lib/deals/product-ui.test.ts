import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealFlowRail } from "@/components/deals/deal-flow-rail";
import { DealLineSwitcher } from "@/components/deal/deal-line-switcher";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { ProductPicker } from "@/components/deals/product-picker";
import { DEAL_SHOP_FLOW, nextStepCopy, themeForProduct } from "./product-ui";
import { productSectionProgress } from "./product-layout";

describe("deal shop flow + product chrome", () => {
  it("orders Create → Details → Documents → Markets → Quotes", () => {
    expect(DEAL_SHOP_FLOW.map((step) => step.id)).toEqual([
      "create",
      "details",
      "documents",
      "markets",
      "quotes",
    ]);
    expect(nextStepCopy({ step: "create" })).toMatch(/Save Deal/);
    expect(nextStepCopy({ step: "details", activeLabel: "Home (HO)", productComplete: false })).toMatch(
      /Home \(HO\)/,
    );
    expect(nextStepCopy({ step: "documents" })).toMatch(/Markets/);
    expect(themeForProduct("gl").id).toBe("commercial");
    expect(themeForProduct("life_term").id).toBe("life");
  });

  it("renders the numbered flow rail and next-step copy", () => {
    const html = renderToString(createElement(DealFlowRail, { current: "details" }));
    expect(html).toMatch(/data-ff-deal-flow-rail/);
    expect(html).toMatch(/data-ff-deal-flow-step="create"/);
    expect(html).toMatch(/data-ff-deal-flow-step="quotes"/);
    expect(html).toMatch(/data-ff-deal-flow-next/);
    expect(html).toContain("Up next: Documents");
  });

  it("paints family-colored product chips with completion + progress", () => {
    expect(productSectionProgress("auto", { vin: "1", make: "Honda" }).complete).toBe(true);
    expect(productSectionProgress("auto", { vin: "1", make: "Honda" }).pct).toBeGreaterThan(0);
    const html = renderToString(
      createElement(DealLineSwitcher, {
        dealId: "deal-1",
        products: ["homeowners", "auto"],
        active: "auto",
        tab: "details",
        complete: { homeowners: true, auto: false },
        progress: { auto: { filled: 1, total: 4, pct: 25, complete: false } },
        stages: {
          homeowners: { stage: "bound", selectedQuoteIds: ["q-ho3"] },
          auto: { stage: "markets" },
        },
      }),
    );
    expect(html).toMatch(/data-ff-deal-product-chip="auto"/);
    expect(html).toMatch(/data-ff-product-complete="1"/);
    expect(html).not.toMatch(/data-ff-product-ready-count/);
    expect(html).not.toMatch(/\d+\s*\/\s*\d+\s*ready/);
    expect(html).toContain("Auto");
    expect(html).toMatch(/data-active="true"/);
    expect(html).toMatch(/bg-navy/);
    expect(html).toMatch(/data-ff-product-stage-label/);
    expect(html).toContain("Markets");
    expect(html).toContain("Bound");
    expect(html).not.toContain(">PA<");
    expect(html).not.toContain(">Review<");
    expect(html).toMatch(/data-ff-deal-package-toggle/);
    expect(html).toContain("Add / change products");
    expect(html).toMatch(/border-navy\/40 bg-white text-navy/);
    expect(readFileSync("src/components/deal/deal-package-lines-form.tsx", "utf8")).not.toMatch(
      /hover:underline/,
    );
    const gloriaStale = renderToString(
      createElement(DealLineSwitcher, {
        dealId: "deal-gloria",
        products: ["homeowners", "landlord"],
        active: "homeowners",
        tab: "quotes",
        stages: { homeowners: { stage: "quote_sent", selectedQuoteIds: [] } },
      }),
    );
    expect(gloriaStale).toContain("Quote review");
    expect(gloriaStale).not.toContain("Quote sent");
    const rail = renderToString(
      createElement(DealLineSwitcher, {
        dealId: "deal-gloria",
        products: ["homeowners", "landlord", "homeowners~new"],
        active: "homeowners",
        tab: "quotes",
        labels: {
          homeowners: "HO3 8944 Adriatico",
          landlord: "DP3 10358 Northwest 30th",
          "homeowners~new": "HO3 16021 Northwest 79th",
        },
        layout: "rail",
      }),
    );
    expect(rail).toMatch(/data-ff-deal-products-rail/);
    expect(rail).toMatch(/data-ff-policy-form-line/);
    expect(rail).toMatch(/data-ff-policy-form-dropup/);
    expect(rail).toMatch(/bottom-full/);
    expect(rail).toContain(">Products<");
    expect(rail).not.toMatch(/>Policy form</);
    expect(rail).toMatch(/flex w-max max-w-full min-w-0 flex-col/);
    expect(rail).toMatch(/data-ff-policy-form-caption/);
    expect(rail.indexOf("data-ff-policy-form-trigger")).toBeLessThan(rail.indexOf("data-ff-policy-form-caption"));
    expect(rail.indexOf("data-ff-policy-form-caption")).toBeLessThan(rail.indexOf(">Products<"));
    expect(rail.indexOf(">Products<")).toBeLessThan(rail.indexOf("Add or change product"));
    const field = rail.slice(
      rail.indexOf("data-ff-policy-form-field"),
      rail.indexOf("data-ff-policy-form-caption"),
    );
    expect(field).not.toContain(">Products<");
    expect(field).not.toContain("Add or change product");
    const menu = rail.slice(rail.indexOf("data-ff-policy-form-menu"));
    expect(menu.indexOf("HO3 16021 Northwest 79th")).toBeLessThan(menu.indexOf("DP3 10358 Northwest 30th"));
    expect(menu.indexOf("DP3 10358 Northwest 30th")).toBeLessThan(menu.indexOf("HO3 8944 Adriatico"));
    expect(menu).not.toMatch(/line-clamp/);
    const addressed = renderToString(
      createElement(DealLineSwitcher, {
        dealId: "deal-gloria",
        products: ["homeowners", "landlord", "homeowners~new"],
        active: "homeowners",
        tab: "quotes",
        layout: "rail",
        labelFacts: {
          homeowners: {
            address: "8944 Adriatico Ln",
            city: "Kissimmee",
            state: "FL",
            zip: "34747",
            quotingForm: "HO3",
          },
          landlord: {
            address: "10358 Corporate Blvd",
            city: "Orlando",
            state: "FL",
            quotingForm: "DP3",
          },
          "homeowners~new": {
            address: "Edmerson Miami Lakes HO",
            city: "Miami Lakes",
            state: "FL",
            quotingForm: "HO3",
          },
        },
      }),
    );
    expect(addressed).toContain("HO3 · 8944 Adriatico · Kissimmee");
    expect(addressed).toContain("DP3 · 10358 Corporate · Orlando");
    expect(addressed).toContain("HO3 · Edmerson · Miami Lakes");
    expect(addressed).not.toContain("34747");
    expect(addressed).not.toContain("Adriatico Ln");
    expect(addressed).not.toMatch(/>HO3</);
  });

  it("picker is grouped tiles, not a wall of unlabeled checkboxes", () => {
    const html = renderToString(
      createElement(ProductPicker, {
        selected: ["homeowners", "life_term"],
        onChange: () => undefined,
      }),
    );
    expect(html).toMatch(/data-ff-product-picker/);
    expect(html).toMatch(/data-ff-product-group="personal"/);
    expect(html).toMatch(/data-ff-product-group="life"/);
    expect(html).toMatch(/2<!-- --> selected|2 selected/);
    expect(html).toContain("Term Life");
    const picker = readFileSync("src/components/deals/product-picker.tsx", "utf8");
    expect(picker).toMatch(/sr-only/);
    expect(readFileSync("src/app/deals/[id]/page.tsx", "utf8")).not.toMatch(/DealFlowRail/);
    expect(readFileSync("src/components/deals/new-deal-create-fields.tsx", "utf8")).toMatch(
      /DealFlowRail/,
    );
  });

  it("renders breadcrumbs as a text trail, not navy action chips", () => {
    const html = renderToString(
      createElement(DeskPageTrail, {
        showBack: false,
        crumbs: [
          { href: "/deals", label: "Deals" },
          { label: "Deal" },
        ],
      }),
    );
    expect(html).toMatch(/data-ff-desk-crumbs/);
    expect(html).toMatch(/data-ff-desk-crumb="link"/);
    expect(html).toMatch(/data-ff-desk-crumb="current"/);
    expect(html).toContain("Deals");
    expect(html).toContain("Deal");
    expect(html).toContain("/");
    expect(html).not.toMatch(/border-navy bg-navy text-white/);
    expect(html).toMatch(/underline/);
    const trail = readFileSync("src/components/desk/desk-page-trail.tsx", "utf8");
    expect(trail).toMatch(/data-ff-desk-crumb="link"/);
    expect(trail).toMatch(/backVariant = "link"/);
    expect(trail).not.toMatch(/border-navy bg-navy text-white/);
  });
});
