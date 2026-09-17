import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deals pipeline chrome unlock (activity lift must not steal clicks)", () => {
  it("keeps List/Grid/Board/Funnel + line filters clickable under Today Activity lift", () => {
    const chrome = source("src/app/globals.css");
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    const page = source("src/app/deals/page.tsx");
    expect(bar).toMatch(/aria-label="List Grid Board Funnel"/);
    expect(bar).toMatch(/\["grid", "Grid"\]/);
    expect(bar).toMatch(/deal-pipeline-views/);
    expect(bar).toMatch(/deal-line-filters/);
    expect(bar).toMatch(/className="deal-workspace-bar/);
    // Durable: bar stacks above the lifted band; empty chrome passes clicks to Today strip.
    expect(chrome).toMatch(/\.deal-workspace-bar \{[\s\S]*z-index: 5;/);
    expect(chrome).toMatch(/\.deal-workspace-bar \{[\s\S]*isolation: isolate;/);
    expect(chrome).toMatch(/\.deal-workspace-bar \{[\s\S]*pointer-events: none;/);
    expect(chrome).toMatch(/\.deal-workspace-bar \[data-testid="deal-line-filters"\][\s\S]*pointer-events: auto;/);
    expect(chrome).toMatch(/\.deal-upload-activity \{[\s\S]*pointer-events: none;/);
    expect(chrome).toMatch(/\.deal-today-slot \{[\s\S]*pointer-events: none;/);
    expect(chrome).toMatch(/\.deal-today-strip \{[\s\S]*pointer-events: auto;/);
    expect(chrome).toMatch(/margin-top: -5rem;/);
    expect(chrome).toMatch(/padding-bottom: 0\.5rem !important;/);
    // Page must not re-assert the lift via inline styles (that dropped unlock rules before).
    expect(page).not.toMatch(/marginTop:\s*["']-5rem["']/);
    expect(page).not.toMatch(/marginTop:\s*["']-2\.5rem["']/);
  });
});
