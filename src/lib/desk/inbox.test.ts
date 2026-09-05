import { describe, expect, it } from "vitest";
import {
  inboxStubFromActivity,
  inboxStubFromLeadOffer,
  inboxWorkEmailConnected,
  recordHrefForInbox,
  snippetOf,
  sortInboxStubs,
} from "./inbox";

describe("inbox / Envoys stubs", () => {
  it("maps seeded inbound activity mail onto the queue", () => {
    const row = inboxStubFromActivity({
      id: "act-1",
      kind: "email",
      fromAddress: "elena.ruiz@example.com",
      subject: "Re: HO3 bind confirmation",
      body: "Received — please keep the dec on the policy.",
      occurredAt: "2026-09-02T14:30:00.000Z",
      contactId: "contact-elena",
    });
    expect(row.status).toBe("received");
    expect(row.from).toBe("elena.ruiz@example.com");
    expect(row.href).toBe("/contacts/contact-elena");
  });

  it("keeps unassigned inbound-email offers as queued", () => {
    const row = inboxStubFromLeadOffer({
      id: "offer-1",
      title: "Unassigned HO inquiry — who owns this?",
      emailFrom: "Renee Colbert <renee.colbert@inbox.local>",
      emailSubject: "HO quote for a Palm Bay rental",
      emailSnippet: "Can someone call me this week?",
      leadId: null,
      createdAt: "2026-09-01T12:00:00.000Z",
    });
    expect(row.kind).toBe("inbound_email");
    expect(row.status).toBe("queued");
    expect(row.href).toBe("/");
    expect(row.subject).toContain("Palm Bay");
  });

  it("sorts newest first and treats work email as disconnected by default", () => {
    const sorted = sortInboxStubs([
      inboxStubFromActivity({
        id: "old",
        kind: "sms",
        fromAddress: "321-555-0144",
        body: "Got it.",
        occurredAt: "2026-08-20T15:12:00.000Z",
        accountId: "harbor",
      }),
      inboxStubFromLeadOffer({
        id: "new",
        title: "Newer offer",
        createdAt: "2026-09-04T10:00:00.000Z",
      }),
    ]);
    expect(sorted.map((row) => row.id)).toEqual(["new", "old"]);
    expect(recordHrefForInbox({ accountId: "harbor" })).toBe("/accounts/harbor");
    expect(snippetOf("  a   b  ")).toBe("a b");
    expect(inboxWorkEmailConnected([])).toBe(false);
    expect(inboxWorkEmailConnected([{ status: "disconnected" }])).toBe(false);
    expect(inboxWorkEmailConnected([{ connected: true }])).toBe(true);
  });
});
