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
    expect(source("src/components/book-lists/glance-card.tsx")).toMatch(/ff-stack-action/);
    expect(source("src/components/book-lists/glance-card.tsx")).toMatch(/ff-stack-glyph/);
  });

  it("Carriers stack quote-ready / skip / stale signals", () => {
    const page = source("src/app/carriers/page.tsx");
    expect(page).toMatch(/BookCommandWorkspace/);
    expect(page).toMatch(/layout="stack"/);
    expect(page).not.toMatch(/DeskColumnTable/);
    expect(page).toMatch(/presentCarrierCard/);
    expect(source("src/lib/book-lists/lenses.ts")).toMatch(/Quote-ready/);
    expect(source("src/lib/book-lists/lenses.ts")).toMatch(/Skip/);
  });

  it("Policies use attention bands, not a letter wall", () => {
    const page = source("src/app/policies/page.tsx");
    expect(page).toMatch(/layout="bands"/);
    expect(page).toMatch(/POLICY_COLUMNS/);
    expect(page).not.toMatch(/DeskColumnTable/);
    expect(source("src/lib/book-lists/types.ts")).toMatch(/Needs care now/);
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
