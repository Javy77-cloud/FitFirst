import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  busySlotsFromFreeBusy,
  displayBusySyncError,
  formatBusySyncedAt,
  googleCalendarHttpError,
  isByoBusyConnection,
  shouldAutoSyncBusy,
  shouldAutoSyncEvents,
} from "./calendar-sync";

describe("calendar busy auto-sync", () => {
  const asOf = new Date("2026-09-19T17:00:00.000Z");

  it("syncs when never stamped or older than 15 minutes", () => {
    expect(shouldAutoSyncBusy(null, asOf)).toBe(true);
    expect(shouldAutoSyncBusy(new Date("2026-09-19T16:40:00.000Z"), asOf)).toBe(true);
    expect(shouldAutoSyncBusy(new Date("2026-09-19T16:50:00.000Z"), asOf)).toBe(false);
  });

  it("refreshes titled events sooner, and always if none are stored yet", () => {
    expect(shouldAutoSyncEvents(new Date("2026-09-19T16:59:00.000Z"), false, asOf)).toBe(true);
    expect(shouldAutoSyncEvents(new Date("2026-09-19T16:59:00.000Z"), true, asOf)).toBe(false);
    expect(shouldAutoSyncEvents(new Date("2026-09-19T16:50:00.000Z"), true, asOf)).toBe(true);
  });

  it("formats last synced for the desk", () => {
    expect(formatBusySyncedAt(null)).toBe("Never synced");
    expect(formatBusySyncedAt(new Date("2026-09-19T16:50:00.000Z"))).toMatch(/Sep/);
  });

  it("treats only BYO-connected calendar rows as busy sources", () => {
    expect(isByoBusyConnection({ connected: true, connectMode: "byo" })).toBe(true);
    expect(isByoBusyConnection({ connected: true, connectMode: "credentials" })).toBe(false);
    expect(isByoBusyConnection({ connected: true, connectMode: null })).toBe(false);
    expect(isByoBusyConnection({ connected: false, connectMode: "byo" })).toBe(false);
  });

  it("reads FreeBusy slots from primary or email-keyed calendars", () => {
    expect(
      busySlotsFromFreeBusy({
        "javierconsulting77@gmail.com": {
          busy: [{ start: "2026-09-21T16:00:00Z", end: "2026-09-21T17:00:00Z" }],
        },
      }),
    ).toHaveLength(1);
    expect(busySlotsFromFreeBusy({ primary: { busy: [] } })).toEqual([]);
    expect(busySlotsFromFreeBusy(undefined)).toEqual([]);
  });

  it("turns Google Calendar HTTP errors into actionable copy", () => {
    expect(
      googleCalendarHttpError(
        { error: { message: "Google Calendar API has not been used in project 1 before or it is disabled." } },
        403,
      ),
    ).toMatch(/Enable Calendar API/);
    expect(
      googleCalendarHttpError({ error: { status: "PERMISSION_DENIED", message: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" } }, 403),
    ).toMatch(/Reconnect Google Calendar/);
    expect(googleCalendarHttpError({ error: { message: "Rate Limit Exceeded" } }, 429)).toBe("Rate Limit Exceeded");
    expect(displayBusySyncError("NEXT_REDIRECT;replace;/calendar?notice=busy-synced;307")).toBeNull();
    expect(displayBusySyncError("Google Calendar is not connected.")).toBe("Google Calendar is not connected.");
    expect(readFileSync("src/lib/flash.ts", "utf8")).toMatch(/"busy-sync-failed":/);
  });

  it("does not treat Sync Now redirect() as a busy-sync failure", () => {
    const action = readFileSync("src/app/actions/calendar-sync.ts", "utf8");
    expect(action).toMatch(/if \(isRedirectError\(error\)\) throw error/);
    expect(action).toMatch(/syncConnectedCalendarsBothWays/);
    expect(action).toMatch(/flashAction\("\/calendar", "busy-synced"\)/);
    expect(action).toMatch(/flashAction\("\/calendar", "busy-sync-failed", "error"\)/);
    const smoke = readFileSync("src/app/actions/byo-oauth.ts", "utf8");
    const start = smoke.indexOf("export async function smokeTestByoProvider");
    expect(smoke.slice(start)).toMatch(/if \(isRedirectError\(error\)\) throw error/);
    expect(readFileSync("src/components/calendar/calendar-sync-bar.tsx", "utf8")).toMatch(/data-ff-calendar-busy-error/);
    expect(readFileSync("src/lib/integrations/calendar-busy.ts", "utf8")).toMatch(/isByoBusyConnection/);
    expect(readFileSync("src/lib/integrations/calendar-busy.ts", "utf8")).toMatch(/lastOauthError: null/);
  });

  it("keeps last-sync in compact chrome, not a permanent ribbon", () => {
    const bar = readFileSync("src/components/calendar/calendar-sync-bar.tsx", "utf8");
    const page = readFileSync("src/app/calendar/page.tsx", "utf8");
    const calendar = readFileSync("src/components/calendar/desk-calendar.tsx", "utf8");
    const chrome = readFileSync("src/app/globals.css", "utf8");
    expect(bar).toMatch(/data-ff-calendar-sync-trigger=/);
    expect(bar).toMatch(/data-ff-calendar-last-synced=/);
    expect(bar).toMatch(/data-ff-calendar-sync-now=/);
    expect(bar).toMatch(/DropdownMenu/);
    expect(bar).not.toMatch(/className="ff-calendar-sync"/);
    expect(bar).not.toMatch(/busy last synced/);
    expect(page).toMatch(/syncControl=/);
    expect(page).toMatch(/<CalendarSyncBar/);
    expect(page).toMatch(/overlayCount=\{externalEvents\.length\}/);
    expect(page).toMatch(/importConnectedEvents/);
    expect(page).toMatch(/listSyncedEvents/);
    expect(calendar).toMatch(/data-calendar-toolbar="sync"/);
    expect(calendar).toMatch(/syncControl/);
    expect(chrome).not.toMatch(/\.ff-calendar-sync \{[\s\S]*margin-bottom: 0\.75rem;/);
  });
});
