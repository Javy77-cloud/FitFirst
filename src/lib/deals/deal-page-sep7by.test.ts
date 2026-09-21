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
] as const;

const OVERFLOW_WIDTH =
  /\b(?:min-w|w|sm:w|md:w|lg:w)-\[(?!320px)(?:2[89]|[3-9]\d|[1-9]\d{2,})(?:rem|px)\]/;
const OVERFLOW_MIN = /\bmin-w-\[(?:1[6-9]|[2-9]\d)rem\]/;

describe("sep7by deal right rail hard-locked to 320px", () => {
  it("BY1 — rail is 320 on every viewport, not lg-only, left takes leftover flex", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/data-ff-deal-right-rail/);
    expect(page).toMatch(/data-ff-deal-rail-lock=\{ACTIVITY_RAIL_LOCK\}/);
    expect(page).toMatch(/ACTIVITY_RAIL_ASIDE_CLASS/);
    expect(source("src/lib/desk/activity-rail.ts")).toMatch(/overflow-x-hidden/);
    expect(page).not.toMatch(/lg:w-\[320px\]/);
    expect(page).not.toMatch(/lg:w-\[72%\]/);
    expect(page).not.toMatch(/lg:w-\[300px\]/);
    expect(page).toMatch(/min-w-0 flex-1 space-y-1/);
    expect(page).toMatch(/data-ff-deal-top-left/);
  });

  it("BY2 — CSS lock uses !important so cascade cannot widen the rail", () => {
    const css = source("src/app/globals.css");
    expect(css).toMatch(/\[data-ff-deal-right-rail\]/);
    expect(css).toMatch(/width: var\(--ff-activity-rail\) !important;/);
    expect(css).toMatch(/min-width: var\(--ff-activity-rail\) !important;/);
    expect(css).toMatch(/max-width: var\(--ff-activity-rail\) !important;/);
    expect(css).toMatch(/flex: 0 0 var\(--ff-activity-rail\) !important;/);
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

  it("BY4 — page stacks Quick Comms and context inside the locked 320px rail", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const tabs = source("src/components/section-tabs.tsx");
    expect(page).toMatch(/data-ff-deal-right-rail/);
    expect(page).toMatch(/data-ff-deal-rail-lock=\{ACTIVITY_RAIL_LOCK\}/);
    expect(tabs).toMatch(/data-ff-deal-rail-lock=\{ACTIVITY_RAIL_LOCK\}/);
    expect(page.indexOf("data-ff-deal-right-rail")).toBeLessThan(page.indexOf("data-ff-deal-quick-comms"));
    expect(page.indexOf("data-ff-deal-quick-comms")).toBeLessThan(page.indexOf("<RecordContextRail"));
    expect(page).toMatch(/min-w-0 w-full max-w-full" data-ff-deal-quick-comms/);
    const comms = source("src/components/comms/quick-comms-board.tsx");
    expect(comms).toMatch(/data-ff-quick-comms-kinds/);
    expect(comms).toMatch(/flex-nowrap/);
    expect(comms).not.toMatch(/flex-wrap items-center gap-1\.5" data-ff-quick-comms-kinds/);
    const css = source("src/app/globals.css");
    expect(css).toMatch(/\[data-ff-quick-comms-kinds\]/);
    expect(css).toMatch(/flex-wrap: nowrap !important;/);
  });
});
