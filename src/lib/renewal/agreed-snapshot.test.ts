import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  latestRenewalAgreedSnapshot,
  renewalAgreedCompareValues,
} from "@/lib/renewal/agreed-snapshot";

const oldTerm = {
  id: "old-term",
  premium: "1000.00",
  termEffective: "2025-10-10T12:00:00.000Z",
  termExpiration: "2026-10-10T12:00:00.000Z",
  aopDeductible: "1000",
  hurricaneDeductible: "2%",
  comprehensiveDeductible: null,
  collisionDeductible: null,
  coverages: [{ key: "dwelling", label: "Dwelling", value: "300000" }],
};

const newTerm = {
  id: "new-term",
  premium: "1200",
  termEffective: "2026-10-10T12:00:00.000Z",
  termExpiration: "2027-10-10T12:00:00.000Z",
  aopDeductible: "2500",
  hurricaneDeductible: "2%",
  comprehensiveDeductible: null,
  collisionDeductible: null,
  coverages: [{ key: "dwelling", label: "Dwelling", value: "325000" }],
};

describe("renewal-agreed compare snapshot", () => {
  it("freezes old limits, deductibles, and premiums before roles flip", () => {
    const frozen = renewalAgreedCompareValues({
      policyId: "policy-1",
      oldTerm,
      newTerm,
    });
    expect(frozen).not.toBeNull();
    expect(frozen?.eventType).toBe("renewal_agreed");
    expect(frozen?.snapshot.currentPremium).toBe("1000.00");
    expect(frozen?.snapshot.proposedPremium).toBe("1200.00");
    expect(frozen?.snapshot.currentDeductibles.aopDeductible).toBe("1000");
    expect(frozen?.snapshot.proposedDeductibles.aopDeductible).toBe("2500");
    expect(frozen?.snapshot.coverageRows[0]?.currentValue).toBe("300000");
    expect(frozen?.snapshot.coverageRows[0]?.proposedValue).toBe("325000");
    expect(frozen?.snapshot.baselineLabel).toBe("Old term");
    expect(frozen?.snapshot.renewalLabel).toBe("New term");
  });

  it("reopens the frozen snapshot after the old term moves to prior", () => {
    const frozen = renewalAgreedCompareValues({
      policyId: "policy-1",
      oldTerm,
      newTerm,
    });
    const opened = latestRenewalAgreedSnapshot([
      {
        eventType: "recorded",
        createdAt: "2026-09-24T12:00:00.000Z",
        snapshot: {
          currentPremium: "9999.00",
          proposedPremium: "1.00",
          premiumDelta: "0",
          premiumDeltaPct: null,
          currentDeductibles: {},
          proposedDeductibles: {},
          coverageRows: [],
        },
      },
      {
        eventType: "renewal_agreed",
        createdAt: "2026-09-23T12:00:00.000Z",
        snapshot: frozen?.snapshot,
      },
    ]);
    expect(opened?.currentPremium).toBe("1000.00");
    expect(opened?.proposedPremium).toBe("1200.00");
    expect(opened?.coverageRows[0]?.currentValue).toBe("300000");
  });

  it("skips the log when a premium is missing and still writes the stamp before advance", () => {
    expect(
      renewalAgreedCompareValues({
        policyId: "policy-1",
        oldTerm: { ...oldTerm, premium: null },
        newTerm,
      }),
    ).toBeNull();

    const action = readFileSync("src/app/actions/renewals-board.ts", "utf8");
    const mark = action.slice(action.indexOf("export async function markClientStaying"));
    expect(mark.indexOf("renewalAgreedCompareValues")).toBeGreaterThan(
      mark.indexOf("if (early) return early"),
    );
    expect(mark.indexOf("renewalAgreedCompareValues")).toBeLessThan(
      mark.indexOf("advancePolicyCurrentTerm"),
    );

    expect(readFileSync("src/app/policies/[id]/compare/page.tsx", "utf8")).toMatch(
      /latestRenewalAgreedSnapshot/,
    );
    expect(readFileSync("src/components/policy/compare-panel.tsx", "utf8")).toMatch(
      /data-ff-compare-frozen/,
    );
    expect(readFileSync("src/app/actions/renewals-wedge.ts", "utf8")).toMatch(
      /latestRenewalAgreedSnapshot/,
    );
    const drawer = readFileSync("src/components/renewals/renewal-compare-drawer.tsx", "utf8");
    expect(drawer).toMatch(/chaseOff \? null/);
    expect(drawer).toMatch(/data-ff-compare-frozen/);
    expect(drawer).toMatch(/ClientStayingButton/);
  });
});
