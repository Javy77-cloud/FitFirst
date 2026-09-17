import { describe, expect, it } from "vitest";
import {
  dealProductForCoverageLine,
  dismissedRuleIdsForHousehold,
  filterActiveFindings,
  gapDismissParty,
  householdGapCount,
  householdGapItems,
  indexHouseholdPolicies,
  isGapDismissReason,
  partyGapKey,
  policiesForHousehold,
  sliceRenewalGapStrip,
} from "./renewal-gaps";

function policy(partial: { id: string; status?: string; lineOfBusiness?: string }) {
  return {
    id: partial.id,
    status: partial.status ?? "active",
    lineOfBusiness: partial.lineOfBusiness ?? "HO",
    policyNumber: partial.id.toUpperCase(),
  };
}

describe("renewal coverage-gap intelligence", () => {
  it("reuses Contact / GapPanel rules — home without auto, flood, or umbrella", () => {
    const items = householdGapItems({
      policies: [policy({ id: "ho3-elena", lineOfBusiness: "HO3" })],
      partyName: "Elena Ruiz",
    });
    expect(items.map((row) => row.id)).toEqual(["home-no-auto", "home-no-flood", "no-umbrella"]);
    expect(items.find((row) => row.id === "home-no-auto")?.productId).toBe("auto");
    expect(items.find((row) => row.id === "home-no-flood")?.productId).toBe("flood");
    expect(items.find((row) => row.id === "no-umbrella")?.productId).toBe("umbrella");
    expect(items.every((row) => row.why.length > 0)).toBe(true);
  });

  it("does not invent gaps from quotes or cancelled rows", () => {
    expect(
      householdGapCount({
        policies: [
          policy({ id: "q", status: "quoted", lineOfBusiness: "HO" }),
          policy({ id: "x", status: "cancelled", lineOfBusiness: "AUTO" }),
        ],
        partyName: "Shop only",
      }),
    ).toBe(0);
  });

  it("counts a badge only after dismissals are filtered out", () => {
    const policies = [policy({ id: "ho", lineOfBusiness: "HO" })];
    expect(householdGapCount({ policies, partyName: "Elena Ruiz" })).toBe(3);
    expect(
      householdGapCount({
        policies,
        partyName: "Elena Ruiz",
        dismissedRuleIds: ["home-no-flood", "no-umbrella"],
      }),
    ).toBe(1);
    expect(
      filterActiveFindings([{ id: "home-no-auto" }, { id: "home-no-flood" }], ["home-no-flood"]).map(
        (row) => row.id,
      ),
    ).toEqual(["home-no-auto"]);
  });

  it("keeps the strip to three visible findings and an overflow count", () => {
    const items = householdGapItems({
      policies: [policy({ id: "ho", lineOfBusiness: "HO" }), policy({ id: "gl", lineOfBusiness: "GL" })],
      partyName: "Mixed book",
    });
    expect(items.length).toBeGreaterThan(3);
    const sliced = sliceRenewalGapStrip(items, 3);
    expect(sliced.visible).toHaveLength(3);
    expect(sliced.overflowCount).toBe(items.length - 3);
  });

  it("returns an honest empty count when companion lines are already in force", () => {
    expect(
      householdGapCount({
        policies: [
          policy({ id: "ho", lineOfBusiness: "HO" }),
          policy({ id: "fl", lineOfBusiness: "FLOOD" }),
          policy({ id: "au", lineOfBusiness: "AUTO" }),
          policy({ id: "um", lineOfBusiness: "UMBRELLA" }),
        ],
        partyName: "Full book",
      }),
    ).toBe(0);
  });

  it("maps missing lines onto the multi-product deal catalog", () => {
    expect(dealProductForCoverageLine("HO")).toBe("homeowners");
    expect(dealProductForCoverageLine("AUTO")).toBe("auto");
    expect(dealProductForCoverageLine("FLOOD")).toBe("flood");
    expect(dealProductForCoverageLine("UMBRELLA")).toBe("umbrella");
    expect(dealProductForCoverageLine("WC")).toBe("workers_comp");
    expect(dealProductForCoverageLine("GL")).toBe("gl");
  });

  it("scopes dismissals to the household contact first", () => {
    expect(gapDismissParty({ contactId: "c1", accountId: "a1" })).toEqual({
      partyKind: "contact",
      partyId: "c1",
    });
    expect(gapDismissParty({ accountId: "a1" })).toEqual({
      partyKind: "account",
      partyId: "a1",
    });
    expect(gapDismissParty({})).toBeNull();
    expect(isGapDismissReason("not_interested")).toBe(true);
    expect(isGapDismissReason("too_expensive")).toBe(false);

    const dismissed = new Map<string, Set<string>>([
      [partyGapKey("contact", "c1"), new Set(["home-no-flood"])],
      [partyGapKey("account", "a1"), new Set(["no-umbrella"])],
    ]);
    expect([...dismissedRuleIdsForHousehold(dismissed, { contactId: "c1", accountId: "a1" })]).toEqual(
      expect.arrayContaining(["home-no-flood", "no-umbrella"]),
    );
  });

  it("indexes household policies by contact without inventing rows", () => {
    const index = indexHouseholdPolicies([
      { ...policy({ id: "ho", lineOfBusiness: "HO" }), contactId: "c1" },
      { ...policy({ id: "au", lineOfBusiness: "AUTO" }), contactId: "c1", accountId: "a1" },
    ]);
    expect(policiesForHousehold(index, { contactId: "c1" }).map((row) => row.id)).toEqual(["ho", "au"]);
    expect(policiesForHousehold(index, { accountId: "missing" })).toEqual([]);
    expect(policiesForHousehold(index, { contactId: "missing", fallback: [policy({ id: "self" })] }).map((row) => row.id)).toEqual([
      "self",
    ]);
  });
});
