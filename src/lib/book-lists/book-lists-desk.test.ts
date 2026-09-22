import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("command-card book lists", () => {
  it("Contacts and Accounts are priority stacks, not column grids", () => {
    for (const file of ["src/app/contacts/page.tsx", "src/app/accounts/page.tsx"]) {
      const page = source(file);
      expect(page).toMatch(/BookCommandWorkspace/);
      expect(page).toMatch(/layout="stack"/);
      expect(page).not.toMatch(/DeskColumnTable/);
      expect(page).toMatch(/PipelineFilterPopover/);
    }
    expect(source("src/components/book-lists/glance-card.tsx")).toMatch(/data-ff-book-why/);
    expect(source("src/components/book-lists/glance-card.tsx")).toMatch(/data-ff-stack-mid/);
    expect(source("src/components/book-lists/glance-card.tsx")).toMatch(/data-hay=\{card\.hay\}/);
    expect(source("src/app/contacts/page.tsx")).not.toMatch(/People pulse/);
    expect(source("src/app/accounts/page.tsx")).not.toMatch(/Account pulse/);
    expect(source("src/components/book-lists/book-workspace.tsx")).toMatch(/contacts-stack/);
    expect(source("src/components/book-lists/book-workspace.tsx")).toMatch(/StandardActivityShell/);
    expect(source("src/components/book-lists/book-workspace.tsx")).not.toMatch(/DeskTruthStrip/);
    expect(source("src/components/book-lists/book-workspace.tsx")).toMatch(/BookLiveScope/);
    expect(source("src/components/smart-search.tsx")).toMatch(/chrome-search/);
    expect(source("src/components/smart-search.tsx")).toMatch(/\/contacts/);
    expect(source("src/components/book-lists/glance-card.tsx")).toMatch(/ff-stack-action/);
    expect(source("src/components/book-lists/glance-card.tsx")).toMatch(/ff-stack-glyph/);
  });

  it("Carriers stack quote-ready / skip / stale signals", () => {
    const page = source("src/app/carriers/page.tsx");
    expect(page).toMatch(/BookCommandWorkspace/);
    expect(page).toMatch(/layout="stack"/);
    expect(page).not.toMatch(/DeskColumnTable/);
    expect(page).toMatch(/presentCarrierCard/);
    expect(page).not.toMatch(/Market pulse/);
    expect(page).toMatch(/carrierMarketGlance/);
    expect(page).not.toMatch(/StandardActivityShell/);
    expect(source("src/lib/book-lists/lenses.ts")).toMatch(/Quote-ready/);
    expect(source("src/lib/book-lists/lenses.ts")).toMatch(/Skip/);
  });

  it("Policies keep Bands and the existing List view", () => {
    const page = source("src/app/policies/page.tsx");
    const lenses = source("src/components/book-lists/book-lenses.tsx");
    const workspace = source("src/components/book-lists/book-workspace.tsx");
    expect(page).toMatch(/parseBookLayout/);
    expect(page).toMatch(/layout=\{layout\}/);
    expect(page).toMatch(/POLICY_COLUMNS/);
    expect(page).not.toMatch(/Policy attention/);
    expect(page).not.toMatch(/StandardActivityShell/);
    expect(page).not.toMatch(/DeskColumnTable/);
    expect(lenses).toMatch(/data-ff-book-layout="list"/);
    expect(lenses).toMatch(/data-ff-book-layout="bands"/);
    expect(workspace).toMatch(/layout === "bands"/);
    expect(workspace).toMatch(/BookPriorityStack/);
    expect(source("src/components/book-lists/glance-card.tsx")).not.toMatch(/ff-book-grid|ff-policy-list/);
    expect(source("src/app/globals.css")).not.toMatch(/ff-policy-list-grid|ff-book-grid/);
    expect(source("src/lib/book-lists/types.ts")).toMatch(/Needs care now/);
    expect(source("src/app/contacts/page.tsx")).toMatch(/layout="stack"/);
    expect(source("src/app/accounts/page.tsx")).toMatch(/layout="stack"/);
    expect(source("src/components/deals/deal-host-face.tsx")).not.toMatch(/data-ff-deal-zone/);
  });

  it("says reached, and only offers a carrier line filter when Life or Health is on", () => {
    const kpi = source("src/lib/book-lists/kpi.ts");
    expect(kpi).toMatch(/Reached lately/);
    expect(kpi).toMatch(/Not reached/);
    expect(kpi).not.toMatch(/Touched lately|Never touched/);
    expect(source("src/lib/book-lists/present.ts")).not.toMatch(/Never touched|Last touch|No logged touch|No touch in/);
    expect(source("src/app/contacts/page.tsx")).not.toMatch(/need a touch/);
    expect(source("src/app/accounts/page.tsx")).not.toMatch(/need a touch/);
    const filter = source("src/components/book-lists/carrier-lob-filter.tsx");
    expect(filter).toMatch(/if \(!writeLife && !writeHealth\) return null/);
    expect(source("src/app/carriers/page.tsx")).toMatch(/CarrierLobFilter/);
    expect(source("src/components/book-lists/glance-card.tsx")).toMatch(/ff-book-columns/);
    expect(source("src/components/book-lists/book-kpi-strip.tsx")).toMatch(/ff-book-share-title/);
  });

  it("policy detail has a care strip and waiting-only tab counters", () => {
    const detail = source("src/app/policies/[id]/page.tsx");
    expect(detail).toMatch(/PolicyCareStrip/);
    expect(detail).toMatch(/buildPolicyCareItems/);
    expect(detail).toMatch(/counts=\{tabCareCounts\}/);
    expect(source("src/components/policy/policy-tabs.tsx")).toMatch(/ff-policy-tab-wait/);
    expect(source("src/components/policy/policy-tabs.tsx")).toMatch(/waiting > 0/);
  });
});
