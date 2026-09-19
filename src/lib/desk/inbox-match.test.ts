import { describe, expect, it } from "vitest";
import {
  chasedRecently,
  counterpartEmails,
  emailsFromHeader,
  inboxAttentionFor,
  inboxMailWhy,
  inboxThreadHref,
  matchInboxParty,
  normalizeInboxEmail,
  shouldSilenceInboxSignal,
  unambiguousOpenDeal,
} from "./inbox-match";

describe("inbox address matching", () => {
  it("pulls emails from angled and bare headers", () => {
    expect(normalizeInboxEmail("Elena Ruiz <elena.ruiz@example.com>")).toBe("elena.ruiz@example.com");
    expect(emailsFromHeader("Elena Ruiz <elena@x.com>, Maya <maya@x.com>")).toEqual([
      "elena@x.com",
      "maya@x.com",
    ]);
    expect(
      counterpartEmails({
        from: "Elena Ruiz <elena@x.com>",
        to: "Agency <desk@fitfirst.agency>",
        agencyEmail: "desk@fitfirst.agency",
      }),
    ).toEqual(["elena@x.com"]);
  });

  it("links a contact and only an unambiguous open deal", () => {
    const contacts = [{ id: "c1", name: "Ruiz, Elena", email: "elena@x.com" }];
    const deals = [
      { id: "d1", title: "Ruiz HO3", contactId: "c1", closed: false },
      { id: "d2", title: "Other", contactId: "c2", closed: false },
    ];
    const match = matchInboxParty(["elena@x.com"], {
      contacts,
      deals,
      renewals: [{ policyId: "p1", contactId: "c1", clientName: "Elena", daysUntil: 40 }],
    });
    expect(match.contact?.id).toBe("c1");
    expect(match.deal?.id).toBe("d1");
    expect(match.renewal?.policyId).toBe("p1");
    expect(match.unmatched).toBe(false);

    const twoShops = unambiguousOpenDeal(
      [
        { id: "a", title: "HO", contactId: "c1", closed: false },
        { id: "b", title: "Auto", contactId: "c1", closed: false },
      ],
      "c1",
    );
    expect(twoShops).toBeNull();
  });

  it("ranks needs-reply over unread and silences our own chase", () => {
    expect(inboxAttentionFor({ unread: true, inboundLast: true, dealId: "d1" })).toBe("needs_reply");
    expect(inboxAttentionFor({ unread: true, inboundLast: false, dealId: null })).toBe("unread");
    expect(inboxAttentionFor({ unread: false, inboundLast: false, dealId: "d1" })).toBe("open_deal");
    expect(shouldSilenceInboxSignal({ inboundLast: false, quoteChasedRecently: true, renewalChasedRecently: false })).toBe(
      true,
    );
    expect(shouldSilenceInboxSignal({ inboundLast: true, quoteChasedRecently: true, renewalChasedRecently: true })).toBe(
      false,
    );
    expect(chasedRecently(new Date("2026-09-18T13:00:00.000Z"), new Date("2026-09-19T13:00:00.000Z"))).toBe(true);
    expect(inboxMailWhy({
      subject: "HO3 quote",
      from: "elena@x.com",
      inboundLast: true,
      unread: true,
      contactName: "Elena Ruiz",
      dealTitle: "Ruiz HO3",
    })).toMatch(/Elena Ruiz wrote/);
    expect(inboxThreadHref("abc")).toBe("/inbox?thread=abc");
  });
});
