import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  busySlotsFromFreeBusy,
  displayBusySyncError,
  formatBusySyncedAt,
  googleCalendarHttpError,
  isByoBusyConnection,
  shouldAutoSyncBusy,
} from "./calendar-sync";

describe("calendar busy auto-sync", () => {
  const asOf = new Date("2026-09-19T17:00:00.000Z");

  it("syncs when never stamped or older than 15 minutes", () => {
    expect(shouldAutoSyncBusy(null, asOf)).toBe(true);
    expect(shouldAutoSyncBusy(new Date("2026-09-19T16:40:00.000Z"), asOf)).toBe(true);
    expect(shouldAutoSyncBusy(new Date("2026-09-19T16:50:00.000Z"), asOf)).toBe(false);
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
  });

  it("does not treat Sync Now redirect() as a busy-sync failure", () => {
    const action = readFileSync("src/app/actions/calendar-sync.ts", "utf8");
    expect(action).toMatch(/if \(isRedirectError\(error\)\) throw error/);
    expect(action).toMatch(/redirect\("\/calendar\?notice=busy-synced"\)/);
    expect(action).toMatch(/redirect\("\/calendar\?notice=busy-sync-failed"\)/);
    const smoke = readFileSync("src/app/actions/byo-oauth.ts", "utf8");
    const start = smoke.indexOf("export async function smokeTestByoProvider");
    expect(smoke.slice(start)).toMatch(/if \(isRedirectError\(error\)\) throw error/);
    expect(readFileSync("src/components/calendar/calendar-sync-bar.tsx", "utf8")).toMatch(/data-ff-calendar-busy-error/);
    expect(readFileSync("src/lib/integrations/calendar-busy.ts", "utf8")).toMatch(/isByoBusyConnection/);
    expect(readFileSync("src/lib/integrations/calendar-busy.ts", "utf8")).toMatch(/lastOauthError: null/);
  });
});
