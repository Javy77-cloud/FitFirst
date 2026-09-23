import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  busyCoveredByTitledEvent,
  calendarProviderLabel,
  eventSyncWindow,
  googleEventWriteBody,
  mapGoogleEventItem,
  mapOutlookEventItem,
  OUTLOOK_FITFIRST_PROP_ID,
  outlookEventWriteBody,
  privacySafeTitle,
  shouldImportAsOverlay,
  shouldPushDeskActivity,
} from "./calendar-event-map";
import { listCalendarProviders } from "./calendar-provider";

describe("calendar event mapping", () => {
  it("maps a titled Google event onto the desk overlay shape", () => {
    const mapped = mapGoogleEventItem({
      id: "g1",
      summary: "Dentist",
      htmlLink: "https://calendar.google.com/event?eid=g1",
      start: { dateTime: "2026-09-19T16:00:00-04:00" },
      end: { dateTime: "2026-09-19T17:00:00-04:00" },
    });
    expect(mapped?.title).toBe("Dentist");
    expect(mapped?.provider).toBe("google_calendar");
    expect(mapped?.busy).toBe(true);
    expect(mapped?.allDay).toBe(false);
    expect(mapped?.fitfirstActivityId).toBeNull();
  });

  it("uses a privacy-safe label when Google only returns busy/private", () => {
    expect(privacySafeTitle({ summary: "", visibility: "private", busy: true })).toBe("Private event");
    expect(privacySafeTitle({ summary: "Busy", visibility: "private", busy: true })).toBe("Private event");
    expect(privacySafeTitle({ summary: "", visibility: "default", busy: true })).toBe("Busy");
    expect(mapGoogleEventItem({
      id: "g-private",
      visibility: "private",
      start: { dateTime: "2026-09-19T12:00:00Z" },
      end: { dateTime: "2026-09-19T13:00:00Z" },
    })?.title).toBe("Private event");
  });

  it("skips cancelled Google events and FitFirst-owned mirrors", () => {
    expect(mapGoogleEventItem({ id: "x", status: "cancelled", summary: "Gone" })).toBeNull();
    const owned = mapGoogleEventItem({
      id: "pushed-1",
      summary: "Market review",
      start: { dateTime: "2026-09-21T14:00:00Z" },
      end: { dateTime: "2026-09-21T15:00:00Z" },
      extendedProperties: { private: { fitfirstActivityId: "act-1" } },
    });
    expect(owned?.fitfirstActivityId).toBe("act-1");
    expect(shouldImportAsOverlay(owned!, new Set())).toBe(false);
    expect(shouldImportAsOverlay({ ...owned!, fitfirstActivityId: null }, new Set(["pushed-1"]))).toBe(false);
    expect(shouldImportAsOverlay({ ...owned!, fitfirstActivityId: null }, new Set())).toBe(true);
  });

  it("parses Google all-day dates with an exclusive end", () => {
    const mapped = mapGoogleEventItem({
      id: "all-day",
      summary: "Labor Day",
      start: { date: "2026-09-07" },
      end: { date: "2026-09-08" },
    });
    expect(mapped?.allDay).toBe(true);
    expect(mapped?.startAt.getDate()).toBe(7);
    expect(mapped?.endAt.getTime()).toBeGreaterThan(mapped!.startAt.getTime());
  });

  it("maps Outlook calendarView items through the same contract", () => {
    const mapped = mapOutlookEventItem({
      id: "o1",
      subject: "Carrier lunch",
      showAs: "busy",
      sensitivity: "normal",
      start: { dateTime: "2026-09-21T15:00:00.0000000", timeZone: "UTC" },
      end: { dateTime: "2026-09-21T16:00:00.0000000", timeZone: "UTC" },
      webLink: "https://outlook.office.com/calendar/item/o1",
    });
    expect(mapped?.provider).toBe("outlook_calendar");
    expect(mapped?.title).toBe("Carrier lunch");
    expect(calendarProviderLabel(mapped?.provider)).toBe("Outlook");
  });

  it("writes FitFirst activity id on both Google and Outlook payloads", () => {
    const draft = {
      activityId: "act-77",
      title: "HO3 review",
      startAt: new Date("2026-09-22T14:00:00.000Z"),
      endAt: new Date("2026-09-22T14:30:00.000Z"),
      notes: "Bring roof year",
    };
    expect(googleEventWriteBody(draft).extendedProperties.private.fitfirstActivityId).toBe("act-77");
    expect(outlookEventWriteBody(draft).singleValueExtendedProperties[0]).toEqual({
      id: OUTLOOK_FITFIRST_PROP_ID,
      value: "act-77",
    });
  });

  it("only pushes timed desk events and looks back far enough for last Saturday", () => {
    expect(shouldPushDeskActivity({ startAt: "2026-09-21T14:00:00Z", endAt: "2026-09-21T15:00:00Z" })).toBe(true);
    expect(shouldPushDeskActivity({ startAt: null, endAt: null })).toBe(false);
    const asOf = new Date("2026-09-21T16:00:00.000Z");
    const window = eventSyncWindow(asOf, asOf, asOf);
    expect(window.from.getTime()).toBeLessThan(new Date("2026-09-19T00:00:00.000Z").getTime());
    expect(window.to.getTime()).toBeGreaterThan(asOf.getTime());
  });


  it("does not push completed email/sms/call logs to connected calendars", () => {
    expect(
      shouldPushDeskActivity({
        startAt: "2026-09-23T14:00:00Z",
        endAt: "2026-09-23T14:15:00Z",
        kind: "email",
        status: "completed",
      }),
    ).toBe(false);
    expect(
      shouldPushDeskActivity({
        startAt: "2026-09-23T15:00:00Z",
        endAt: "2026-09-23T15:15:00Z",
        kind: "sms",
        status: "completed",
      }),
    ).toBe(false);
    expect(
      shouldPushDeskActivity({
        startAt: "2026-09-23T16:00:00Z",
        endAt: "2026-09-23T16:30:00Z",
        kind: "meeting",
        status: "completed",
      }),
    ).toBe(true);
    expect(
      shouldPushDeskActivity({
        startAt: "2026-09-24T14:00:00Z",
        endAt: "2026-09-24T14:15:00Z",
        kind: "email",
        status: "open",
      }),
    ).toBe(true);
  });

  it("hides a busy overlay when a titled external event already covers the slot", () => {
    const covered = busyCoveredByTitledEvent(
      { provider: "google_calendar", startAt: "2026-09-19T16:00:00.000Z", endAt: "2026-09-19T17:00:00.000Z" },
      [{
        origin: "external",
        calendarProvider: "google_calendar",
        startAt: "2026-09-19T16:00:00.000Z",
        endAt: "2026-09-19T17:00:00.000Z",
      }],
    );
    expect(covered).toBe(true);
    expect(
      busyCoveredByTitledEvent(
        { provider: "google_calendar", startAt: "2026-09-19T18:00:00.000Z", endAt: "2026-09-19T19:00:00.000Z" },
        [{
          origin: "external",
          calendarProvider: "google_calendar",
          startAt: "2026-09-19T16:00:00.000Z",
          endAt: "2026-09-19T17:00:00.000Z",
        }],
      ),
    ).toBe(false);
  });

  it("hides Busy when a FitFirst desk event covers the same FreeBusy window", () => {
    // Google FreeBusy returns a Busy twin for every FF-pushed event; suppress it.
    expect(
      busyCoveredByTitledEvent(
        { provider: "google_calendar", startAt: "2026-09-24T21:25:00.000Z", endAt: "2026-09-24T21:55:00.000Z" },
        [{
          origin: "fitfirst",
          startAt: "2026-09-24T21:25:00.000Z",
          endAt: "2026-09-24T21:55:00.000Z",
        }],
      ),
    ).toBe(true);
    expect(
      busyCoveredByTitledEvent(
        { provider: "google_calendar", startAt: "2026-09-24T21:25:00.000Z", endAt: "2026-09-24T21:55:00.000Z" },
        [{
          origin: "fitfirst",
          startAt: "2026-09-24T11:00:00.000Z",
          endAt: "2026-09-24T11:30:00.000Z",
        }],
      ),
    ).toBe(false);
  });

  it("registers Google and Outlook on the same provider contract", () => {
    expect(listCalendarProviders().map((row) => row.id)).toEqual(["google_calendar", "outlook_calendar"]);
    const google = readFileSync("src/lib/integrations/calendar-providers/google.ts", "utf8");
    const outlook = readFileSync("src/lib/integrations/calendar-providers/outlook.ts", "utf8");
    expect(google).toMatch(/listEvents/);
    expect(google).toMatch(/createEvent/);
    expect(outlook).toMatch(/listEvents/);
    expect(outlook).toMatch(/createEvent/);
    expect(readFileSync("src/lib/integrations/google-calendar.ts", "utf8")).not.toMatch(
      /Two-way event push is not in this wave/,
    );
  });
});
