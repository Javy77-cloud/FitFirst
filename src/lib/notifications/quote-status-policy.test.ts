import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { panelAlertBody, parsePanelKey } from "./sync-panel";
import { formatNotificationBody, formatNotificationTitle, formatPanelEntityLine } from "./copy";
import { loadQuoteDeclinedSignals } from "./load-panel";
import {
  isQuoteStatusNotificationKind,
  shouldEnqueueUserNotification,
} from "./quote-status-policy";

describe("quote status does not enqueue a user notification", () => {
  it("treats decline, approval, and returned as quote status", () => {
    for (const kind of [
      "quote_declined",
      "quote_approved",
      "quote_returned",
      "declined",
      "approved",
      "returned",
      "quote_status",
    ]) {
      expect(isQuoteStatusNotificationKind(kind)).toBe(true);
      expect(shouldEnqueueUserNotification(kind)).toBe(false);
    }
  });

  it("still notifies for a bound policy, a new lead, and an exception that needs a person", () => {
    for (const kind of ["bind", "lead_follow_up", "lead_routed", "quote_correction", "renewal_silence", "inbox_mail"]) {
      expect(shouldEnqueueUserNotification(kind)).toBe(true);
    }
  });

  it("does not build overnight decline cards", async () => {
    await expect(loadQuoteDeclinedSignals()).resolves.toEqual([]);
    const loader = readFileSync("src/lib/notifications/load-panel.ts", "utf8");
    expect(loader).toMatch(/loadQuoteDeclinedSignals/);
    expect(loader).not.toMatch(/riskOutcome,\s*"declined"/);
    const sync = readFileSync("src/lib/notifications/sync-panel.ts", "utf8");
    expect(sync).toMatch(/shouldEnqueueUserNotification\(card\.kind\)/);
    expect(readFileSync("src/lib/db/header-alerts.ts", "utf8")).toMatch(/quoteStatusAlertsHiddenWhere/);
    expect(readFileSync("src/lib/db/queries.ts", "utf8")).toMatch(/quoteStatusUnreadCountExclusion/);
  });
});

describe("notification title and body formatting", () => {
  it("turns the Gloria decline ping into a form label", () => {
    const title = formatNotificationTitle("Gloria Martinez · home~homeowners~88uvyj");
    const stored = panelAlertBody("Declined by Stand at 2:14 AM · home~homeowners~88uvyj", "quote_declined:q1");
    expect(title).toBe("Gloria Martinez · HO3");
    expect(title).not.toMatch(/~|88uvyj/);
    expect(parsePanelKey(stored)).toBe("quote_declined:q1");
    expect(formatNotificationBody(stored)).toBe("Declined by Stand at 2:14 AM · HO3");
    expect(formatNotificationBody(stored)).not.toMatch(/home~/);
    expect(formatPanelEntityLine("Gloria Martinez", "home~homeowners~88uvyj")).toBe("Gloria Martinez · HO3");
    expect(formatPanelEntityLine("Gloria Martinez", "HO")).toBe("Gloria Martinez · HO");
  });
});
