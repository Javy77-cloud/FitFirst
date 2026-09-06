import { describe, expect, it } from "vitest";
import { canTransferDeal, dealTransferConfirmCopy, dealTransferNotification } from "./transfer";

describe("deal owner transfer", () => {
  it("names the target agent in the confirm copy", () => {
    expect(dealTransferConfirmCopy("Maya Chen")).toBe(
      "Transfer this deal to Maya Chen? They'll own all follow-ups from now on.",
    );
  });

  it("notifies the receiving agent with deal name and who handed it over", () => {
    expect(dealTransferNotification({ dealTitle: "Dib · Palm Bay HO3", fromName: "Javy Rivera" })).toEqual({
      title: "Dib · Palm Bay HO3",
      body: "Javy Rivera handed this deal to you.",
    });
  });

  it("lets agents transfer — not admin-only", () => {
    expect(canTransferDeal({ id: "agent-1" })).toBe(true);
    expect(canTransferDeal({ id: "" })).toBe(false);
    expect(canTransferDeal(null)).toBe(false);
  });
});
