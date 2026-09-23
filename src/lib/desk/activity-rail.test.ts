import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACTIVITY_RAIL_LOCK, ACTIVITY_RAIL_PX, ACTIVITY_RAIL_WIDTH } from "./activity-rail";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("shared Activity rail", () => {
  it("is one width, wider than the clipped 320px rail", () => {
    expect(ACTIVITY_RAIL_PX).toBeGreaterThan(320);
    expect(ACTIVITY_RAIL_PX).toBeLessThan(448);
    expect(ACTIVITY_RAIL_WIDTH).toBe(`${ACTIVITY_RAIL_PX}px`);
    expect(ACTIVITY_RAIL_LOCK).toBe(String(ACTIVITY_RAIL_PX));
    const css = source("src/app/globals.css");
    expect(css).toMatch(new RegExp(`--ff-activity-rail: ${ACTIVITY_RAIL_PX}px`));
    expect(css).toMatch(/width: var\(--ff-activity-rail\) !important/);
    expect(css).toMatch(/\.ff-activity-desk\.is-open \{[^}]*var\(--ff-activity-rail\)/);
  });

  it("reserves the list and stack columns without auto-picking the first row", () => {
    const panel = source("src/components/desk/standard-activity-panel.tsx");
    expect(panel).toMatch(/initialId = null/);
    expect(panel).toMatch(/never auto-pick rows\[0\]/);
    expect(panel).not.toMatch(/initialId=\{rows\[0\]\?\.id/);
    expect(panel).not.toMatch(/\?\? rows\[0\]/);
    expect(panel).toMatch(/showRail && "is-open"/);
    expect(panel).toMatch(/data-ff-activity-empty/);
    expect(panel).toMatch(/surface="deals-list"|deals-list/);
    expect(source("src/components/deals/deals-command-workspace.tsx")).toMatch(/surface="deals-stack"/);
    expect(source("src/components/deals/deals-command-workspace.tsx")).toMatch(/initialId=\{activityId\}/);
    expect(source("src/components/renewals/renewals-filtered-views.tsx")).toMatch(/surface="renewals-stack"/);
    expect(source("src/app/leads/page.tsx")).toMatch(/ff-leads-banner-row/);
    expect(source("src/app/leads/page.tsx")).toMatch(/ACTIVITY_RAIL_COLUMNS/);
  });

  it("shrinks Radar charts without removing the heat banner, and matches inbox edges", () => {
    const css = source("src/app/globals.css");
    expect(css).toMatch(/\.ff-radar-banner/);
    expect(css).toMatch(/\.ff-radar-chart-body \{[^}]*min-height: 5\.2rem/);
    expect(css).not.toMatch(/min-height: calc\(100dvh - 12rem\)/);
    expect(css).toMatch(/--ff-inbox-open-edge: var\(--ff-red\)/);
    expect(css).toMatch(/\.ff-inbox-row\.is-selected \{[^}]*#dae8fb/);
    expect(css).toMatch(/\.ff-inbox-row\.is-selected \{[^}]*var\(--ff-inbox-open-edge\)/);
    expect(css).toMatch(/\.ff-inbox-msg\.is-in \{ border-left: 4px solid var\(--ff-inbox-open-edge\)/);
  });
});
