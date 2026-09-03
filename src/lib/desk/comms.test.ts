import { describe, expect, it } from "vitest";
import { commsThreadKey, groupCommsByStoredKey, normalizeEmailSubject } from "./comms";

describe("comms threading", () => {
  it("strips Re/Fwd so inbound and outbound share a thread", () => {
    expect(normalizeEmailSubject("Re: HO3 bind confirmation")).toBe("ho3 bind confirmation");
    expect(normalizeEmailSubject("FWD: HO3 bind confirmation")).toBe("ho3 bind confirmation");
    const outbound = commsThreadKey({
      channel: "email",
      subject: "HO3 bind confirmation",
      related: { contactId: "c1" },
    });
    const inbound = commsThreadKey({
      channel: "email",
      subject: "Re: HO3 bind confirmation",
      related: { contactId: "c1" },
    });
    expect(outbound).toBe(inbound);
  });

  it("keeps SMS on one thread per record", () => {
    expect(commsThreadKey({ channel: "sms", related: { contactId: "c1" } })).toBe("sms:c1");
  });

  it("groups stored keys into a conversation, oldest first inside the thread", () => {
    const threads = groupCommsByStoredKey(
      [
        {
          id: "2",
          kind: "email",
          direction: "inbound",
          eventType: "received",
          subject: "Re: HO3 bind confirmation",
          body: "Thanks",
          fromAddress: "elena@example.com",
          toAddress: "desk@agency.local",
          occurredAt: new Date("2026-09-02T12:00:00Z"),
          activityId: "a2",
          activityStatus: "completed",
          contactId: "c1",
          accountId: null,
          policyId: null,
          dealId: null,
          leadId: null,
        },
        {
          id: "1",
          kind: "email",
          direction: "outbound",
          eventType: "sent",
          subject: "HO3 bind confirmation",
          body: "Thank you for binding",
          fromAddress: "desk@agency.local",
          toAddress: "elena@example.com",
          occurredAt: new Date("2026-09-01T12:00:00Z"),
          activityId: "a1",
          activityStatus: "completed",
          contactId: "c1",
          accountId: null,
          policyId: null,
          dealId: null,
          leadId: null,
        },
      ],
      ["email:c1:ho3 bind confirmation", "email:c1:ho3 bind confirmation"],
    );
    expect(threads).toHaveLength(1);
    expect(threads[0].messages[0].direction).toBe("outbound");
    expect(threads[0].messages[1].direction).toBe("inbound");
    expect(threads[0].messages[0].body).toContain("Thank you");
  });
});
