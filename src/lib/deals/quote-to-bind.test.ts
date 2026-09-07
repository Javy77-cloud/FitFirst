import { describe, expect, it } from "vitest";
import { DEAL_ID, ELENA_DEAL_ID } from "@/lib/fixtures/ids";
import {
  quoteToBindFields,
  quoteToBindNotes,
  shouldAutoBindOnEsign,
  stubBoundPolicyNumber,
} from "./quote-to-bind";

describe("quote-to-bind on e-sign", () => {
  it("advances a signed shop to Bound with a stub policy number", () => {
    const now = new Date("2026-09-07T15:00:00.000Z");
    expect(quoteToBindFields(now)).toEqual({
      pipelineStage: "bound",
      pipelineStageSlug: "closed_won",
      boundAt: now,
      wonAt: now,
      updatedAt: now,
    });
    expect(stubBoundPolicyNumber("Gonzalez HO3", 1757250000000)).toMatch(/^FF-GONZALEZ-HO3-/);
    expect(quoteToBindNotes(null, "FF-GONZ-1")).toBe("Policy FF-GONZ-1 attached on e-sign.");
    expect(quoteToBindNotes("Keep the wind mit.", "FF-GONZ-1")).toContain("FF-GONZ-1");
  });

  it("never auto-binds Ana and still binds Elena's shop", () => {
    expect(shouldAutoBindOnEsign({ id: DEAL_ID, pipelineStage: "quote_sent" })).toBe(false);
    expect(shouldAutoBindOnEsign({ id: ELENA_DEAL_ID, pipelineStage: "quote_sent" })).toBe(true);
  });
});
