import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  flattenInboxBands,
  groupInboxThreads,
  inboxCuesFromThreads,
  inboxThreadRecency,
  presentInboxThread,
} from "./inbox-desk";
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

  it("puts Unread above Read and newest first inside each band", () => {
    const olderUnread = presentInboxThread(
      preview({ id: "u-old", unread: true, lastInternalDate: 200, subject: "Older unread" }),
      index,
    );
    const newerUnread = presentInboxThread(
      preview({ id: "u-new", unread: true, lastInternalDate: 400, subject: "Newer unread" }),
      index,
    );
    const newerRead = presentInboxThread(
      preview({ id: "r-new", unread: false, lastInternalDate: 900, subject: "Newest read" }),
      index,
    );
    const olderRead = presentInboxThread(
      preview({ id: "r-old", unread: false, lastInternalDate: 50, subject: "Older read" }),
      index,
    );
    const datedOnly = presentInboxThread(
      preview({
        id: "u-dated",
        unread: true,
        lastInternalDate: 0,
        date: "Tue, 22 Sep 2026 09:00:00 -0400",
        subject: "Header date",
      }),
      index,
    );
    expect(inboxThreadRecency(datedOnly)).toBe(Date.parse("Tue, 22 Sep 2026 09:00:00 -0400"));
    const flat = flattenInboxBands([olderRead, newerRead, olderUnread, datedOnly, newerUnread]);
    expect(flat.map((row) => row.id)).toEqual(["u-dated", "u-new", "u-old", "r-new", "r-old"]);
    const groups = groupInboxThreads([olderRead, newerUnread, newerRead, olderUnread]);
    expect(Object.keys(groups)).toEqual(["unread", "read"]);
    expect(groups.unread.map((row) => row.id)).toEqual(["u-new", "u-old"]);
    expect(groups.read.map((row) => row.id)).toEqual(["r-new", "r-old"]);
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
    expect(desk).toMatch(/InboxSplit/);
    expect(readFileSync("src/components/inbox/inbox-split.tsx", "utf8")).toMatch(/role="separator"/);
    expect(readFileSync("src/components/inbox/inbox-split.tsx", "utf8")).toMatch(/ff-inbox-list-width:v1|INBOX_LIST_WIDTH_STORAGE_KEY/);
    expect(readFileSync("src/lib/desk/inbox-split.ts", "utf8")).toMatch(/ff-inbox-list-width:v1/);
    expect(chrome).toMatch(/ff-inbox-splitter/);
    expect(chrome).toMatch(/--ff-inbox-list-width/);
    expect(desk).toMatch(/data-ff-inbox-band-label=\{band\}/);
    expect(desk).toMatch(/ff-inbox-body-html/);
    expect(chrome).toMatch(/\.ff-inbox-bands \{[\s\S]*flex: 0 0 auto;/);
    expect(chrome).toMatch(/\.ff-inbox-detail-pane \{[\s\S]*overflow-x: hidden;/);
    expect(chrome).toMatch(/\.ff-inbox-body \{[\s\S]*overflow-wrap: anywhere;/);
    expect(chrome).toMatch(/ff-heat-still/);
    expect(chrome).toMatch(/\.ff-heat-cooling \.ff-stack-glyph,[\s\S]*ff-heat-pulse/);
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
