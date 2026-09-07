import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const RAIL_CHILD_FILES = [
  "src/app/deals/[id]/page.tsx",
  "src/components/deal/sheet-health-toggle.tsx",
  "src/components/completeness/health-strip.tsx",
  "src/components/tags/record-tags.tsx",
  "src/components/comms/quick-comms-board.tsx",
  "src/components/record-context/record-context-rail.tsx",
  "src/components/deal/deal-motivation.tsx",
] as const;

const OVERFLOW_WIDTH =
  /\b(?:min-w|w|sm:w|md:w|lg:w)-\[(?!320px)(?:2[89]|[3-9]\d|[1-9]\d{2,})(?:rem|px)\]/;
const OVERFLOW_MIN = /\bmin-w-\[(?:1[6-9]|[2-9]\d)rem\]/;

describe("sep7by deal right rail hard-locked to 320px", () => {
  it("BY1 — rail is 320 on every viewport, not lg-only, left takes leftover flex", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/data-ff-deal-right-rail/);
    expect(page).toMatch(/data-ff-deal-rail-lock="320"/);
    expect(page).toMatch(/w-\[320px\] min-w-\[320px\] max-w-\[320px\] shrink-0 overflow-x-hidden/);
    expect(page).toMatch(/grow-0 basis-\[320px\]/);
    expect(page).not.toMatch(/lg:w-\[320px\]/);
    expect(page).not.toMatch(/lg:w-\[72%\]/);
    expect(page).not.toMatch(/lg:w-\[300px\]/);
    expect(page).toMatch(/min-w-0 flex-1 space-y-1/);
    expect(page).toMatch(/data-ff-deal-top-left/);
  });

  it("BY2 — CSS lock uses !important so cascade cannot widen the rail", () => {
    const css = source("src/app/globals.css");
    expect(css).toMatch(/\[data-ff-deal-right-rail\]/);
    expect(css).toMatch(/width: 320px !important;/);
    expect(css).toMatch(/min-width: 320px !important;/);
    expect(css).toMatch(/max-width: 320px !important;/);
    expect(css).toMatch(/flex: 0 0 320px !important;/);
    expect(css).toMatch(/overflow-x: hidden !important;/);
    expect(css).toMatch(/\[data-ff-deal-top-left\]/);
    expect(css).toMatch(/flex: 1 1 0% !important;/);
  });

  it("BY3 — rail children have no 28rem / overflowing min-widths", () => {
    for (const file of RAIL_CHILD_FILES) {
      const text = source(file);
      expect(text, file).not.toMatch(/28rem/);
      expect(text, file).not.toMatch(/sm:w-\[28rem\]/);
      expect(text, file).not.toMatch(/min-w-\[16rem\]/);
      expect(text, file).not.toMatch(OVERFLOW_WIDTH);
      expect(text, file).not.toMatch(OVERFLOW_MIN);
    }
    const health = source("src/components/deal/sheet-health-toggle.tsx");
    expect(health).toMatch(/w-full min-w-0 max-w-full/);
    expect(health).not.toMatch(/28rem/);
    const context = source("src/components/record-context/record-context-rail.tsx");
    expect(context).toMatch(/min-w-0 w-full max-w-full/);
  });

  it("BY3b — left column leftover flex is locked; only the rail is 320", () => {
    const css = source("src/app/globals.css");
    expect(css).toMatch(/\[data-ff-deal-top-left\]/);
    expect(css).toMatch(/flex: 1 1 0% !important;/);
    expect(css).toMatch(/max-width: none !important;/);
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/min-w-0 flex-1 space-y-1/);
    expect(page).not.toMatch(/lg:w-\[72%\]/);
  });

  it("BY4 — page stacks Tags, Quick Comms, sheet health, and context inside the locked rail", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page.indexOf("data-ff-deal-right-rail")).toBeLessThan(page.indexOf("<SheetHealthToggle"));
    expect(page.indexOf("<SheetHealthToggle")).toBeLessThan(page.indexOf("<RecordTags"));
    expect(page.indexOf("<RecordTags")).toBeLessThan(page.indexOf("data-ff-deal-quick-comms"));
    expect(page.indexOf("data-ff-deal-quick-comms")).toBeLessThan(page.indexOf("<RecordContextRail"));
    expect(page).toMatch(/ff-card min-w-0 w-full max-w-full p-3/);
    expect(page).toMatch(/min-w-0 w-full max-w-full" data-ff-deal-quick-comms/);
  });
});
