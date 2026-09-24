import { describe, expect, it } from "vitest";
import { lateStageSendBlocked, hasProviderMessageId } from "./client-send-gate";

describe("client quote send gate", () => {
  it("blocks late stages until a provider message id exists", () => {
    for (const stage of ["quote_sent", "bound", "policy_issued", "closed_won"]) {
      expect(lateStageSendBlocked({ stage, messageId: null })).toBe(true);
      expect(lateStageSendBlocked({ stage, messageId: "" })).toBe(true);
      expect(lateStageSendBlocked({ stage, messageId: "sent" })).toBe(true);
      expect(lateStageSendBlocked({ stage, messageId: "gmail-msg-1" })).toBe(false);
    }
  });

  it("does not let an outside reason skip the send", () => {
    expect(
      lateStageSendBlocked({
        stage: "quote_sent",
        messageId: null,
        outsideOverride: { reason: "Quoted in the carrier portal" },
      }),
    ).toBe(true);
    expect(
      lateStageSendBlocked({
        stage: "policy_issued",
        messageId: "msg-9",
        outsideOverride: { reason: "portal" },
      }),
    ).toBe(false);
  });

  it("leaves early stages and closed lost alone", () => {
    expect(lateStageSendBlocked({ stage: "quote_review", messageId: null })).toBe(false);
    expect(lateStageSendBlocked({ stage: "closed_lost", messageId: null })).toBe(false);
    expect(hasProviderMessageId("  abc  ")).toBe(true);
  });
});
