import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Won-Lost + Archived parking tabs", () => {
  it("feeds parking boards from getPipelineBoard cards so tabs are not inert", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/parkingBoard/);
    expect(page).toMatch(/pipeline === "won-lost" \|\| pipeline === "archive"/);
    expect(page).toMatch(/boardData\?\.cards/);
    expect(page).toMatch(/sourceRows/);
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(bar).toMatch(/deal-closed-filters/);
    expect(bar).toMatch(/CLOSED_SLUGS/);
    expect(bar).toMatch(/"won-lost"/);
    expect(bar).toMatch(/"archive"/);
  });

  it("groups products + module tabs below pipeline chrome", () => {
    const tabs = source("src/components/section-tabs.tsx");
    expect(tabs).toMatch(/subnav/);
    expect(tabs).toMatch(/data-ff-deal-products-tabs-group/);
    expect(tabs).toMatch(/mt-5/);
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/subnav=/);
    expect(page).toMatch(/DealLineSwitcher/);
    expect(page).toMatch(/layout="rail"/);
    expect(page).toMatch(/data-ff-deal-products-column/);
    // Products no longer sit inside the top-left heading stack with Pipeline.
    const headingSlice = page.slice(
      page.indexOf("data-ff-deal-top-left"),
      page.indexOf("subnav="),
    );
    expect(headingSlice).not.toMatch(/DealLineSwitcher/);
  });
});
