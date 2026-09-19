import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deals pipeline chrome unlock (activity lift must not steal clicks)", () => {
  it("keeps Stack/Radar + line filters clickable with corner Today Activity", () => {
    const chrome = source("src/app/globals.css");
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    const page = source("src/app/deals/page.tsx");
    expect(bar).toMatch(/aria-label=\{isRenewals \? "List Grid Board Funnel" : "Stack Radar"\}/);
    expect(bar).toMatch(/\["radar", "Radar"\]/);
    expect(bar).toMatch(/deal-pipeline-views/);
    expect(bar).toMatch(/deal-line-filters/);
    expect(bar).toMatch(/className="deal-workspace-bar/);
    expect(page).toMatch(/TodayActivityCorner/);
    expect(page).not.toMatch(/deal-upload-activity/);
    expect(chrome).toMatch(/\.deal-workspace-bar \{[\s\S]*z-index: 5;/);
    expect(chrome).toMatch(/\.ff-today-activity-corner \{[\s\S]*position: fixed;/);
    expect(chrome).toMatch(/\.ff-today-activity-corner/);
    expect(page).not.toMatch(/marginTop:\s*["']-5rem["']/);
    expect(page).not.toMatch(/marginTop:\s*["']-2\.5rem["']/);
  });
});
