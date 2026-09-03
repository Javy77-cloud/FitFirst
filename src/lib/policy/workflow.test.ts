import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { CONTACT_ID, DEMO_POLICY_ID, DEMO_PRIOR_POLICY_NUMBER } from "@/lib/fixtures/ids";
import {
  matchReplacementPolicies,
  normalizePremises,
  resolvePolicyNumberForNotice,
} from "./premises";
import { account360Counts, isEndedStatus, isInForceStatus } from "./status";
import { applyPolicyChange, type PolicySnapshot } from "./workflow";

const ruizPremises = {
  address1: "412 Oak Grove Ln",
  city: "Winter Garden",
  state: "FL",
  zip: "34787",
};

const active: PolicySnapshot = {
  id: DEMO_POLICY_ID,
  status: "active",
  coverageA: 385000,
  premium: "2840.00",
  endedAt: null,
  endReason: null,
};

describe("Ana fixture stays unbound", () => {
  it("keeps the broker-tested $321k rebuild and zero bindable quotes", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.outcome.bindableAt321k).toBe(0);
    expect(fixture.risk.address1).toBe("1098 Adige Ct SE");
  });

  it("does not treat Ana's contact as a written policy key", () => {
    expect(CONTACT_ID).toBe("22222222-2222-4222-8222-222222222224");
  });
});

describe("policy change workflow", () => {
  it("endorses the same policy record and writes a dated log draft", () => {
    const filed = applyPolicyChange(active, {
      kind: "endorsement",
      effectiveDate: new Date("2026-06-15T12:00:00.000Z"),
      reason: "coverage_change",
      summary: "Increase Coverage A after rebuild review",
      coverageA: 410000,
      premium: "3012.00",
    });
    expect(filed.ok).toBe(true);
    if (!filed.ok) return;
    expect(filed.policy.id).toBe(active.id);
    expect(filed.policy.status).toBe("active");
    expect(filed.policy.coverageA).toBe(410000);
    expect(filed.policy.premium).toBe("3012.00");
    expect(filed.event.kind).toBe("endorsement");
    expect(filed.event.effectiveDate.toISOString()).toBe("2026-06-15T12:00:00.000Z");
  });

  it("cancels in force with reason and date, then blocks a second end", () => {
    const filed = applyPolicyChange(active, {
      kind: "cancellation",
      effectiveDate: new Date("2026-09-01T12:00:00.000Z"),
      reason: "insured_request",
    });
    expect(filed.ok).toBe(true);
    if (!filed.ok) return;
    expect(filed.policy.id).toBe(active.id);
    expect(filed.policy.status).toBe("cancellation");
    expect(filed.policy.endedAt?.toISOString()).toBe("2026-09-01T12:00:00.000Z");
    expect(filed.policy.endReason).toBe("insured_request");

    const again = applyPolicyChange(filed.policy, {
      kind: "cancellation",
      effectiveDate: new Date("2026-09-02T12:00:00.000Z"),
      reason: "nonpay",
    });
    expect(again.ok).toBe(false);
  });

  it("non-renews with a different reason list but the same end", () => {
    const filed = applyPolicyChange(active, {
      kind: "non_renewal",
      effectiveDate: new Date("2027-03-01T12:00:00.000Z"),
      reason: "carrier_nonrenew",
    });
    expect(filed.ok).toBe(true);
    if (!filed.ok) return;
    expect(filed.policy.status).toBe("non_renewal");
    expect(isEndedStatus(filed.policy.status)).toBe(true);
    expect(filed.event.kind).toBe("non_renewal");
  });

  it("refuses an endorsement on a cancelled policy", () => {
    const filed = applyPolicyChange(
      { ...active, status: "cancellation" },
      {
        kind: "endorsement",
        effectiveDate: new Date("2026-06-15T12:00:00.000Z"),
        reason: "coverage_change",
        coverageA: 400000,
      },
    );
    expect(filed.ok).toBe(false);
  });
});

describe("account 360 counts", () => {
  it("drops cancelled and non-renewed policies from Active and keeps them in lifetime", () => {
    const counts = account360Counts([
      { status: "active" },
      { status: "cancellation" },
      { status: "non_renewal" },
      { status: "bound" },
    ]);
    expect(counts.active).toBe(2);
    expect(counts.lifetime).toBe(4);
  });

  it("counts a book that is only off-force as lifetime history", () => {
    expect(account360Counts([{ status: "cancellation" }])).toEqual({
      active: 0,
      lifetime: 1,
    });
  });
});

describe("replacement matching by premises", () => {
  const cancelled = {
    id: "prior",
    policyNumber: DEMO_PRIOR_POLICY_NUMBER,
    status: "cancellation",
    premisesKey: normalizePremises(ruizPremises),
  };
  const written = {
    id: DEMO_POLICY_ID,
    policyNumber: "AIC-HO3-44118",
    status: "active",
    premisesKey: normalizePremises(ruizPremises),
  };

  it("matches the in-force policy at the insured location", () => {
    const hits = matchReplacementPolicies([cancelled, written], ruizPremises);
    expect(hits.map((row) => row.policyNumber)).toEqual(["AIC-HO3-44118"]);
    expect(hits.every((row) => isInForceStatus(row.status))).toBe(true);
  });

  it("never resolves a cancelled policy number as a replacement key", () => {
    const byNumber = resolvePolicyNumberForNotice(
      [cancelled, written],
      DEMO_PRIOR_POLICY_NUMBER,
    );
    expect(byNumber.policy).toBeNull();
    expect(byNumber.ignoredCancelledNumber).toBe(DEMO_PRIOR_POLICY_NUMBER);

    const stillByPremises = matchReplacementPolicies([cancelled, written], {
      ...ruizPremises,
      policyNumber: DEMO_PRIOR_POLICY_NUMBER,
    });
    expect(stillByPremises).toHaveLength(1);
    expect(stillByPremises[0]?.id).toBe(DEMO_POLICY_ID);
  });

  it("does not match Ana's Palm Bay house to the Ruiz book", () => {
    const hits = matchReplacementPolicies([cancelled, written], {
      address1: "1098 Adige Ct SE",
      city: "Palm Bay",
      state: "FL",
      zip: "32909",
    });
    expect(hits).toHaveLength(0);
  });
});
