import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { flattenInboxBands, groupInboxThreads, inboxCuesFromThreads, presentInboxThread } from "./inbox-desk";
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

const index = {
  agencyEmail: "desk@fitfirst.agency",
  contacts: [{ id: "c1", name: "Ruiz, Elena", email: "elena@x.com" }],
  deals: [{ id: "d1", title: "Ruiz HO3", contactId: "c1", closed: false }],
  renewals: [],
};

describe("inbox desk presentation", () => {
  it("bands unread vs read and still matches the book", () => {
    const unread = presentInboxThread(preview({ id: "t1", unread: true, inboundLast: true }), index);
    expect(unread.attention).toBe("unread");
    expect(unread.match.contact?.id).toBe("c1");
    expect(unread.match.deal?.id).toBe("d1");
    expect(unread.href).toBe("/inbox?thread=t1");

    const readInbound = presentInboxThread(
      preview({ id: "t2", unread: false, inboundLast: true, lastInternalDate: 1 }),
      index,
    );
    expect(readInbound.attention).toBe("read");

    const groups = groupInboxThreads([unread, readInbound]);
    expect(groups.unread.map((row) => row.id)).toEqual(["t1"]);
    expect(groups.read.map((row) => row.id)).toEqual(["t2"]);
    expect(flattenInboxBands([readInbound, unread]).map((row) => row.id)).toEqual(["t1", "t2"]);
  });

  it("keeps FitFirst mail cues for read inbound that is still in INBOX", () => {
    const readInbound = presentInboxThread(preview({ id: "t2", unread: false, inboundLast: true }), index);
    const cues = inboxCuesFromThreads([readInbound]);
    expect(cues).toHaveLength(1);
    expect(cues[0]?.dealId).toBe("d1");
    expect(cues[0]?.why).toMatch(/Mail/);
  });

  it("inbox page is a live Gmail desk with Unread/Read rows, not a dead mailbox stub", () => {
    const page = readFileSync("src/app/inbox/page.tsx", "utf8");
    const desk = readFileSync("src/components/inbox/inbox-desk.tsx", "utf8");
    const chrome = readFileSync("src/app/globals.css", "utf8");
    expect(page).toMatch(/loadLiveInboxThreads/);
    expect(page).toMatch(/mailProvider="gmail"/);
    expect(desk).toMatch(/Connect Gmail/);
    expect(desk).toMatch(/startByoOauth/);
    expect(desk).toMatch(/messages\.map/);
    expect(desk).toMatch(/replyInboxThread/);
    expect(desk).toMatch(/sendInboxMessage/);
    expect(desk).toMatch(/logInboxThread/);
    expect(desk).toMatch(/createContactFromInbox/);
    expect(desk).toMatch(/ff-inbox-row/);
    expect(desk).toMatch(/is-selected/);
    expect(desk).toMatch(/data-ff-inbox-skin/);
    expect(desk).toMatch(/data-ff-inbox-band=\{band\}/);
    expect(desk).not.toMatch(/does not host a mailbox/);
    expect(desk).not.toMatch(/Needs reply/);
    expect(desk).not.toMatch(/Needs you/);
    expect(desk).not.toMatch(/yahoo/i);
    expect(chrome).toMatch(/ff-inbox-row\.is-selected/);
    expect(chrome).not.toMatch(/ff-inbox-card/);
    expect(chrome).not.toMatch(/ff-inbox-skin-yahoo|data-ff-inbox-skin=.yahoo/);
    expect(readFileSync("src/lib/desk/nav-catalog.ts", "utf8")).toMatch(/id: "inbox"/);
    expect(readFileSync("src/app/calendar/page.tsx", "utf8")).toMatch(/CalendarSyncBar/);
    expect(readFileSync("src/app/calendar/page.tsx", "utf8")).toMatch(/importConnectedEvents/);
    expect(readFileSync("src/app/calendar/page.tsx", "utf8")).toMatch(/syncConnectedBusy/);
    expect(readFileSync("src/lib/integrations/google-calendar.ts", "utf8")).not.toMatch(/notImplemented/);
  });
});
