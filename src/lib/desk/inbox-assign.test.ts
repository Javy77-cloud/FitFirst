import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  INBOX_ASSIGNED_KIND,
  encodePanelHref,
  inboxAssignConfirmCopy,
  inboxAssignNotification,
  inboxAssignedKey,
  inboxMailDeepLink,
  parsePanelHref,
  suggestedInboxAssignee,
  threadIdFromPanelKey,
} from "./inbox-assign";
import { displayNoticeBody } from "@/lib/coverage/notices";

describe("inbox assign / forward", () => {
  it("prefers deal owner, then policy, then contact", () => {
    expect(
      suggestedInboxAssignee({
        dealOwnerId: "d-owner",
        policyOwnerId: "p-owner",
        contactOwnerId: "c-owner",
      }),
    ).toBe("d-owner");
    expect(suggestedInboxAssignee({ policyOwnerId: "p-owner", contactOwnerId: "c-owner" })).toBe(
      "p-owner",
    );
    expect(suggestedInboxAssignee({ contactOwnerId: "c-owner" })).toBe("c-owner");
    expect(suggestedInboxAssignee({})).toBeNull();
  });

  it("builds an Inbox ping with thread deep link", () => {
    const ping = inboxAssignNotification({
      subject: "Quote docs",
      fromLabel: "Elena Ruiz",
      assignerName: "Javy",
      threadId: "thr-1",
    });
    expect(ping.href).toBe("/inbox?thread=thr-1");
    expect(ping.why).toMatch(/Javy assigned agency mail from Elena Ruiz/);
    expect(ping.title).toBe("Quote docs");
    expect(ping.urgency).toBe("high");
    expect(inboxAssignedKey("thr-1", "agent-9")).toBe(`${INBOX_ASSIGNED_KIND}:thr-1:agent-9`);
    expect(inboxAssignConfirmCopy("Maya Chen")).toMatch(/Maya Chen/);
  });

  it("hides href meta in display copy and recovers the thread link", () => {
    const key = inboxAssignedKey("abc123", "u1");
    const body = `<!--ff-panel:${key}-->\n${encodePanelHref("/inbox?thread=abc123")}\n\nJavy assigned agency mail from Elena`;
    expect(parsePanelHref(body)).toBe("/inbox?thread=abc123");
    expect(displayNoticeBody(body)).toBe("Javy assigned agency mail from Elena");
    expect(threadIdFromPanelKey(key)).toBe("abc123");
    expect(threadIdFromPanelKey("inbox_mail:g-thread")).toBe("g-thread");
    expect(
      inboxMailDeepLink({
        body,
        entityType: "deal",
        entityId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      }),
    ).toBe("/inbox?thread=abc123");
  });

  it("wires Assign on the Inbox desk and Inbox-lane kind", () => {
    const desk = readFileSync("src/components/inbox/inbox-desk.tsx", "utf8");
    const actions = readFileSync("src/app/actions/inbox.ts", "utf8");
    const lanes = readFileSync("src/lib/notifications/lanes.ts", "utf8");
    const panel = readFileSync("src/lib/notifications/panel.ts", "utf8");
    expect(desk).toMatch(/InboxAssignDialog/);
    expect(actions).toMatch(/assignInboxThread/);
    expect(lanes).toMatch(/inbox_assigned/);
    expect(panel).toMatch(/inbox_assigned/);
  });
});
