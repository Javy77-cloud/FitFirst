import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealFlowRail } from "@/components/deals/deal-flow-rail";
import { DealLineSwitcher } from "@/components/deal/deal-line-switcher";
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
        stages: { homeowners: { stage: "bound" }, auto: { stage: "quotes" } },
      }),
    );
    expect(html).toMatch(/data-ff-deal-product-chip="auto"/);
    expect(html).toMatch(/data-ff-product-complete="1"/);
    expect(html).toMatch(/1<!-- -->\/<!-- -->2<!-- --> ready|1\/2 ready/);
    expect(html).toContain("Auto");
    expect(html).toMatch(/data-active="true"/);
    expect(html).toMatch(/bg-navy/);
    expect(html).toMatch(/data-ff-product-stage-label/);
    expect(html).toContain("Quotes");
    expect(html).not.toContain(">PA<");
    expect(html).not.toContain("review");
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
    expect(readFileSync("src/app/deals/[id]/page.tsx", "utf8")).toMatch(/DealFlowRail/);
    expect(readFileSync("src/components/deals/new-deal-create-fields.tsx", "utf8")).toMatch(
      /DealFlowRail/,
    );
  });
});
