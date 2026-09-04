import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "@/lib/home/as-of";
import {
  findEoGaps,
  hasFollowUpTask,
  hasSignedApp,
  isBoundForSignedApp,
  isQuoteSentStage,
  renewalWindowOpen,
  type EoDealSnap,
  type EoPolicySnap,
} from "./gaps";

const hale: EoPolicySnap = {
  id: "policy-hale",
  policyNumber: "HO3-HALE-2026",
  status: "active",
  expirationDate: new Date("2026-10-01T05:00:00.000Z"),
  renewalDate: null,
  contactId: "contact-hale",
  accountId: null,
  dealId: "deal-hale",
  partyLabel: "Hale, Priya",
};

const bound: EoPolicySnap = {
  id: "policy-bound",
  policyNumber: "TR-GL-22019",
  status: "bound",
  expirationDate: new Date("2027-09-01T00:00:00.000Z"),
  renewalDate: null,
  contactId: "contact-harbor",
  accountId: "account-harbor",
  dealId: "deal-harbor",
  partyLabel: "Keystone Holdings",
};

const anaDeal: EoDealSnap = {
  id: "deal-ana",
  title: "Dib · Palm Bay HO3",
  pipelineStage: "quote_sent",
  pipelineStageSlug: "quote_sent",
  contactId: "contact-ana",
  leadId: "lead-ana",
};

describe("E&O gap flags", () => {
  it("opens the 90-day renewal window and stays closed after the date", () => {
    expect(renewalWindowOpen(new Date("2026-10-01T05:00:00.000Z"), DESK_AS_OF)).toBe(true);
    expect(renewalWindowOpen(new Date("2027-09-01T05:00:00.000Z"), DESK_AS_OF)).toBe(false);
    expect(renewalWindowOpen(new Date("2026-06-01T05:00:00.000Z"), DESK_AS_OF)).toBe(false);
  });

  it("treats Bound and Pending as needing a signed app", () => {
    expect(isBoundForSignedApp("bound")).toBe(true);
    expect(isBoundForSignedApp("Pending")).toBe(true);
    expect(isBoundForSignedApp("active")).toBe(false);
  });

  it("matches signed apps on the policy or its deal", () => {
    expect(hasSignedApp([{ slot: "signed_app", docType: "signed_app", dealId: "deal-harbor" }], bound)).toBe(
      true,
    );
    expect(hasSignedApp([{ slot: "quote_pdf", docType: "quote_pdf", dealId: "deal-harbor" }], bound)).toBe(
      false,
    );
  });

  it("counts a desk task on the deal, contact, or lead as follow-up", () => {
    expect(hasFollowUpTask([{ kind: "task", dealId: "deal-ana" }], anaDeal)).toBe(true);
    expect(hasFollowUpTask([{ kind: "email", dealId: "deal-ana" }], anaDeal)).toBe(false);
    expect(hasFollowUpTask([{ kind: "task", contactId: "someone-else" }], anaDeal)).toBe(false);
    expect(isQuoteSentStage("quote_sent")).toBe(true);
  });

  it("flags silent renewal, bound without signed app, and quote sent with no task", () => {
    const flags = findEoGaps({
      asOf: DESK_AS_OF,
      policies: [hale, bound],
      deals: [anaDeal],
      docs: [],
      tasks: [],
      stamps: [],
    });
    expect(flags.map((row) => row.kind)).toEqual([
      "bound_missing_signed_app",
      "renewal_silent_90",
      "quote_sent_no_followup",
    ]);
    expect(flags.find((row) => row.kind === "quote_sent_no_followup")?.entityId).toBe("deal-ana");
  });

  it("clears a silent-renewal flag when a call lands in the window", () => {
    const flags = findEoGaps({
      asOf: DESK_AS_OF,
      policies: [hale],
      deals: [],
      docs: [],
      tasks: [],
      stamps: [
        {
          occurredAt: new Date("2026-08-15T16:00:00.000Z"),
          action: "call",
          policyId: hale.id,
        },
      ],
    });
    expect(flags.some((row) => row.kind === "renewal_silent_90")).toBe(false);
  });

  it("does not treat a review-style email as a follow-up task, and does not bind Ana", () => {
    const flags = findEoGaps({
      asOf: DESK_AS_OF,
      policies: [],
      deals: [anaDeal],
      docs: [],
      tasks: [{ kind: "email", dealId: "deal-ana" }],
      stamps: [],
    });
    expect(flags).toHaveLength(1);
    expect(flags[0]?.kind).toBe("quote_sent_no_followup");
    expect(flags[0]?.body).not.toMatch(/bound/i);
  });
});
