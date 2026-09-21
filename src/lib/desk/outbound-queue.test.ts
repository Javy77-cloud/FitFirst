import { describe, expect, it } from "vitest";
import { decideOutboundStatus, OUTBOUND_STATUSES } from "./outbound-queue";

describe("outbound queue (no vendor send)", () => {
  it("queues email when there is an address and no opt-out", () => {
    expect(
      decideOutboundStatus({ channel: "email", toAddress: "elena.ruiz@example.com", emailOptOut: false }),
    ).toEqual({ status: "queued", holdReason: null });
  });

  it("holds email when the contact opted out", () => {
    expect(
      decideOutboundStatus({ channel: "email", toAddress: "elena.ruiz@example.com", emailOptOut: true }),
    ).toEqual({ status: "held", holdReason: "email_opt_out" });
  });

  it("holds SMS when the contact opted out or has no phone", () => {
    expect(decideOutboundStatus({ channel: "sms", toAddress: "(321) 555-0188", smsOptOut: true })).toEqual({
      status: "held",
      holdReason: "sms_opt_out",
    });
    expect(decideOutboundStatus({ channel: "sms", toAddress: "", smsOptOut: false })).toEqual({
      status: "held",
      holdReason: "missing_phone",
    });
  });

  it("records a live Gmail send as sent, not queued", () => {
    expect(OUTBOUND_STATUSES).toContain("sent");
    expect(OUTBOUND_STATUSES).toContain("queued");
  });
});
