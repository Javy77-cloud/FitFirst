import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("desk click-lag fixes", () => {
  it("does not block AppShell paint on follow-up release writes", () => {
    const shell = source("src/components/app-shell.tsx");
    expect(shell).toMatch(/scheduleDueLeadFollowUpRelease\(/);
    expect(shell).not.toMatch(/await releaseDueLeadFollowUps/);
    expect(shell).toMatch(/Suspense fallback=\{<aside/);
    expect(shell).toMatch(/loadHeaderNotificationState\(/);
    expect(source("src/lib/leads/schedule-follow-up-release.ts")).toMatch(/after\(/);
  });

  it("dedupes session and chrome queries for the same request", () => {
    expect(source("src/lib/auth/session.ts")).toMatch(/export const currentDeskSession = cache\(/);
    expect(source("src/lib/auth/session.ts")).toMatch(/export const getActor = cache\(/);
    expect(source("src/lib/db/queries.ts")).toMatch(/export const listUsers = cache\(/);
    expect(source("src/lib/db/queries.ts")).toMatch(/export const listAlerts = cache\(/);
    expect(source("src/lib/db/nav-prefs.ts")).toMatch(/cache\(async function readStoredNavLayout/);
    expect(source("src/app/layout.tsx")).toMatch(/preloadDeskShell\(/);
  });

  it("loads deal workspace related rows in parallel instead of a Neon waterfall", () => {
    const queries = source("src/lib/db/queries.ts");
    const start = queries.indexOf("export async function getDealWorkspace");
    const fn = queries.slice(start, start + 4500);
    expect(fn).toMatch(/await Promise\.all\(/);
    expect(fn).toMatch(/commsFromTimeline\(timeline\)/);
    expect(fn).not.toMatch(/timeline: await listActivityTimeline/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/loadRecordContext\(/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/agencySettings/);
  });

  it("paints pending feedback before the server round-trip returns", () => {
    expect(source("src/components/desk/form-actions.tsx")).toMatch(/useFormStatus/);
    expect(source("src/components/desk/pending-tab-list.tsx")).toMatch(/setOptimistic/);
    expect(source("src/components/desk-sidebar.tsx")).toMatch(/PendingLink/);
    expect(source("src/app/layout.tsx")).toMatch(/NavigationProgress/);
    expect(source("src/app/loading.tsx")).toMatch(/DeskRouteLoading/);
    expect(source("src/app/deals/[id]/loading.tsx")).toMatch(/DeskRouteLoading/);
    expect(source("src/app/leads/loading.tsx")).toMatch(/DeskRouteLoading/);
  });
});
