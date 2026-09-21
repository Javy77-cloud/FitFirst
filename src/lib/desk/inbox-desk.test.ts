import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { groupInboxThreads, presentInboxThread, type InboxDeskThread } from "./inbox-desk";
import type { GmailThreadPreview } from "@/lib/integrations/gmail";

function preview(partial: Partial<GmailThreadPreview> & Pick<GmailThreadPreview, "id">): GmailThreadPreview {
  return {
    subject: "HO3 bind",
    from: "Elena Ruiz <elena@x.com>",
    to: "desk@fitfirst.agency",
    date: "Fri, 19 Sep 2026 12:00:00 -0400",
    snippet: "Please keep the dec.",
    unread: true,
    inboundLast: true,
    messageCount: 2,
    lastMessageId: "m1",
    lastInternalDate: Date.parse("2026-09-19T16:00:00.000Z"),
    messageIdHeader: "<m1@x.com>",
    references: "<m1@x.com>",
    ...partial,
  };
}

describe("inbox desk presentation", () => {
  it("bands needs-reply first and matches the book", () => {
    const thread = presentInboxThread(preview({ id: "t1" }), {
      agencyEmail: "desk@fitfirst.agency",
      contacts: [{ id: "c1", name: "Ruiz, Elena", email: "elena@x.com" }],
      deals: [{ id: "d1", title: "Ruiz HO3", contactId: "c1", closed: false }],
      renewals: [],
    });
    expect(thread.attention).toBe("needs_reply");
    expect(thread.match.contact?.id).toBe("c1");
    expect(thread.match.deal?.id).toBe("d1");
    expect(thread.href).toBe("/inbox?thread=t1");
    const groups = groupInboxThreads([
      thread,
      { ...thread, id: "t2", attention: "rest", lastInternalDate: 1 } as InboxDeskThread,
    ]);
    expect(groups.needs_reply.map((row) => row.id)).toEqual(["t1"]);
  });

  it("inbox page is a live desk with Connect, not a dead mailbox stub", () => {
    const page = readFileSync("src/app/inbox/page.tsx", "utf8");
    const desk = readFileSync("src/components/inbox/inbox-desk.tsx", "utf8");
    expect(page).toMatch(/loadLiveInboxThreads/);
    expect(desk).toMatch(/Connect Gmail/);
    expect(desk).toMatch(/startByoOauth/);
    expect(desk).toMatch(/messages\.map/);
    expect(desk).not.toMatch(/does not host a mailbox/);
    expect(readFileSync("src/lib/desk/nav-catalog.ts", "utf8")).toMatch(/id: "inbox"/);
    expect(readFileSync("src/app/calendar/page.tsx", "utf8")).toMatch(/CalendarSyncBar/);
    expect(readFileSync("src/app/calendar/page.tsx", "utf8")).toMatch(/importConnectedEvents/);
    expect(readFileSync("src/app/calendar/page.tsx", "utf8")).toMatch(/syncConnectedBusy/);
    expect(readFileSync("src/lib/integrations/google-calendar.ts", "utf8")).not.toMatch(/notImplemented/);
  });
});
