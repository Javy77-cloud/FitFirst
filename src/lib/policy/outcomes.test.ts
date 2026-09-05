import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { CONTACT_ID, DEMO_POLICY_ID } from "@/lib/fixtures/ids";
import { filedChangeOutcome, policyRecordOutcome } from "./outcomes";

describe("policy change outcomes", () => {
  it("keeps an endorsement on the same in-force Policy", () => {
    const outcome = filedChangeOutcome("endorsement", {
      status: "active",
      coverageA: 410000,
    });
    expect(outcome.tone).toBe("in_force");
    expect(outcome.title).toMatch(/same policy/i);
    expect(outcome.body).toMatch(/stays in force/i);
    expect(outcome.body).not.toMatch(/off the book/i);
  });

  it("states cancel and non-renew drop in-force but keep lifetime", () => {
    const cancel = filedChangeOutcome("cancellation", {
      status: "cancellation",
      endReason: "insured_request",
      endedAt: new Date("2026-09-01T12:00:00.000Z"),
    });
    expect(cancel.tone).toBe("ended");
    expect(cancel.body).toMatch(/Insured request/);
    expect(cancel.body).toMatch(/Lifetime count/);
    expect(cancel.body).toMatch(/In-force count drops/);

    const nonRenew = filedChangeOutcome("non_renewal", {
      status: "non_renewal",
      endReason: "carrier_nonrenew",
      endedAt: new Date("2027-03-01T12:00:00.000Z"),
    });
    expect(nonRenew.tone).toBe("ended");
    expect(nonRenew.body).toMatch(/Carrier non-renewal/);
    expect(nonRenew.body).toMatch(/replacement/);
  });

  it("reads an ended Policy the same way without inventing a new number", () => {
    const outcome = policyRecordOutcome({
      status: "cancellation",
      endReason: "nonpay",
      endedAt: new Date("2026-08-15T12:00:00.000Z"),
    });
    expect(outcome.tone).toBe("ended");
    expect(outcome.body).toMatch(/Non-pay/);
    expect(DEMO_POLICY_ID).not.toBe(CONTACT_ID);
  });

  it("does not attach outcomes to Ana", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.outcome.bindableAt321k).toBe(0);
  });
});
