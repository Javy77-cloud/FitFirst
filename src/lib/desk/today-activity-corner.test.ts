import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Shared Today Activity floating bubble", () => {
  it("uses one corner FAB on Deals and Renewals, not a centered strip", () => {
    const deals = source("src/app/deals/page.tsx");
    const renewals = source("src/components/renewals/renewals-desk.tsx");
    const corner = source("src/components/desk/today-activity-corner.tsx");
    const strip = source("src/components/deals/today-activity-strip.tsx");
    const chrome = source("src/app/globals.css");

    expect(deals).toMatch(/from "@\/components\/desk\/today-activity-corner"/);
    expect(renewals).toMatch(/from "@\/components\/desk\/today-activity-corner"/);
    expect(deals).toMatch(/<TodayActivityCorner/);
    expect(renewals).toMatch(/<TodayActivityCorner/);
    expect(deals).toMatch(/basePath="\/deals"/);
    expect(renewals).toMatch(/basePath="\/renewals"/);
    expect(deals).not.toMatch(/<TodayActivityStrip/);
    expect(renewals).not.toMatch(/TodayActivityStrip/);
    expect(deals).not.toMatch(/deal-upload-activity|deal-today-slot|deal-activity-list-spacer/);
    expect(renewals).not.toMatch(/deal-upload-activity|deal-today-slot|deal-activity-list-spacer/);

    expect(corner).toMatch(/data-ff-today-activity-corner/);
    expect(corner).toMatch(/data-ff-today-activity-toggle/);
    expect(corner).toMatch(/data-ff-today-activity-label/);
    expect(corner).toMatch(/Open Today Activity/);
    expect(corner).toMatch(/Collapse Today Activity/);
    expect(corner).toMatch(/Today Activity/);
    expect(corner).toMatch(/createPortal/);
    expect(corner).toMatch(/mousedown/);
    expect(corner).toMatch(/Escape/);
    expect(corner).toMatch(/TodayActivityStrip/);
    expect(corner).toMatch(/formatTodayActivityDate/);
    expect(corner).toMatch(/ff-today-activity-corner:pos:v1/);
    expect(corner).toMatch(/onPointerDown/);
    expect(corner).toMatch(/onDoubleClick/);
    expect(corner).toMatch(/data-ff-drag-pos/);
    expect(corner).toMatch(/clampPos|EDGE_PAD/);
    expect(corner).toMatch(/todayActivityCalendarHref/);
    expect(corner).not.toMatch(/Today['’]s Activity/);
    expect(corner).not.toMatch(/>Today</);

    expect(strip).toMatch(/deal-today-chips/);
    expect(strip).toMatch(/todayActivityWorkHref/);
    expect(strip).toMatch(/deal-today-chip-count/);
    expect(strip).toMatch(/deal-today-chip-word/);
    expect(strip).not.toMatch(/deal-today-heading/);
    expect(strip).not.toMatch(/Today['’]s Activity/);
    expect(strip).not.toMatch(/minWidth:\s*84/);
    expect(strip).not.toMatch(/minHeight:\s*84/);

    const cornerBlock = chrome.match(/\.ff-today-activity-corner \{[^}]+\}/s)?.[0] ?? "";
    expect(cornerBlock).toContain("position: fixed;");
    expect(cornerBlock).toContain("bottom: 1rem;");
    expect(cornerBlock).toContain("right: 1rem;");
    expect(cornerBlock).toContain("left: auto;");
    expect(cornerBlock).toContain("z-index: 70;");
    expect(cornerBlock).toContain("display: flex;");
    expect(cornerBlock).not.toContain("left: 1rem;");
    expect(chrome).toMatch(/data-ff-drag-pos/);
    expect(chrome).not.toMatch(/\.deal-upload-activity/);
    expect(chrome).not.toMatch(/\.deal-today-slot/);
    expect(chrome).not.toMatch(/\.deal-activity-list-spacer/);
    expect(chrome).not.toMatch(/deal-today-heading/);
    expect(chrome).not.toMatch(/min-width: 84px/);
    expect(chrome).not.toMatch(/min-height: 84px/);
  });
});
