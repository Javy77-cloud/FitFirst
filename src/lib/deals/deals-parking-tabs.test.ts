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
    expect(page).toMatch(/leading=/);
    const css = source("src/app/globals.css");
    expect(css).not.toMatch(/--ff-deal-products-headroom:\s*9\.5rem;/);
    expect(css).not.toMatch(/--ff-deal-products-qc-gap/);
    expect(css).not.toMatch(/\[data-ff-deal-products-column\] \{\s*bottom:/);
    expect(css).toMatch(/--ff-deal-tab-group-gap:\s*3rem;/);
    expect(css).toMatch(/--ff-deal-tab-group-pad:\s*0\.75rem;/);
    expect(css).toMatch(
      /\[data-ff-deal-workspace\] \[data-ff-deal-tab-row-wrap\] \{[^}]*margin-top:\s*calc\(1\.25rem \+ var\(--ff-deal-tab-group-gap\)\) !important;/,
    );
    expect(css).toMatch(
      /\[data-ff-deal-workspace\] \[data-ff-deal-tab-row-wrap\] \{[^}]*background:\s*transparent;/,
    );
    expect(css).toMatch(
      /\[data-ff-deal-workspace\] \[data-ff-deal-tab-panel\] \{\s*background:\s*transparent;/,
    );
    expect(css).not.toMatch(
      /\[data-ff-deal-workspace\] \[data-ff-deal-tab-row-wrap\] \{[^}]*var\(--ff-wash\)/,
    );
    expect(css).not.toMatch(
      /\[data-ff-deal-workspace\] \[data-ff-deal-tab-row-wrap\] \{[^}]*box-shadow:\s*inset/,
    );
    expect(css).toMatch(
      /margin-top:\s*calc\(-1 \* \(var\(--ff-deal-tab-group-gap\) \+ var\(--ff-deal-tab-group-pad\)\)\);/,
    );
    // Products no longer sit inside the top-left heading stack with Pipeline.
    const headingSlice = page.slice(
      page.indexOf("data-ff-deal-top-left"),
      page.indexOf("subnav="),
    );
    expect(headingSlice).not.toMatch(/DealLineSwitcher/);
  });
});
