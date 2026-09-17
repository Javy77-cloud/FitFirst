import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Calendar + Deals density", () => {
  it("pushes Month/Week/Day + date title + Today below the header search banner", () => {
    const page = source("src/app/calendar/page.tsx");
    const calendar = source("src/components/calendar/desk-calendar.tsx");
    const chrome = source("src/app/globals.css");
    expect(page).toMatch(/data-ff-calendar-page=/);
    expect(page).not.toMatch(/-mt-6/);
    expect(calendar).toMatch(/data-ff-calendar-toolbar-wrap=/);
    expect(calendar).toMatch(/data-ff-calendar-toolbar-offset=/);
    expect(calendar).toMatch(/aria-label="Calendar toolbar"/);
    expect(calendar).toMatch(/>\s*Today\s*</);
    expect(calendar).not.toMatch(/-mt-8/);
    expect(chrome).toMatch(/\[data-ff-calendar-page\] \{[\s\S]*margin-top: -0\.5rem;/);
    expect(chrome).toMatch(/\[data-ff-calendar-toolbar-wrap\] \{[\s\S]*margin-top: -0\.75rem;/);
  });

  it("puts Add New Deal on the far right of the find/filter banner and drops the spare list row", () => {
    const page = source("src/app/deals/page.tsx");
    const table = source("src/components/deals/deals-table.tsx");
    const chrome = source("src/app/globals.css");
    const filterOpen = page.indexOf("data-ff-pipeline-filter-chrome");
    const addOpen = page.indexOf("data-ff-deals-list-actions");
    expect(filterOpen).toBeGreaterThan(-1);
    expect(addOpen).toBeGreaterThan(filterOpen);
    expect(page).toMatch(/Find a deal, insured, or phone/);
    expect(page).toMatch(/<AddNewDealDialog/);
    expect(page).not.toMatch(/data-ff-deals-board-actions/);
    expect(table).not.toMatch(/AddNewDealDialog/);
    expect(table).not.toMatch(/data-ff-deals-list-actions/);
    expect(chrome).toMatch(/\[data-ff-pipeline-filter-chrome\] \[data-ff-deals-list-actions\] \{[\s\S]*margin-left: auto;/);
    expect(chrome).toMatch(/\[data-ff-pipeline-filter-chrome\] \[data-ff-pipeline-filters\] \{[\s\S]*margin-bottom: 0;/);
  });

  it("lifts today's activity counters and the list another ~2 lines", () => {
    const chrome = source("src/app/globals.css");
    expect(chrome).toMatch(/\.deal-upload-activity \{[\s\S]*margin-top: -5rem;/);
    expect(chrome).toMatch(/\.deal-upload-activity \{[\s\S]*padding-bottom: 0\.5rem !important;/);
    expect(chrome).toMatch(/\.deal-list-below-activity \{[\s\S]*margin-top: 0 !important;/);
  });
});
