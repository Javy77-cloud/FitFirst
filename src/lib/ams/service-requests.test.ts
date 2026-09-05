import { describe, expect, it } from "vitest";
import type { PolicySnapshot } from "@/lib/policy/workflow";
import {
  applyServiceRequestAction,
  missingServiceRequestFields,
  nextServiceRequestStatus,
  validateServiceRequestFields,
  type ServiceRequestDraft,
} from "./service-requests";

const policy: PolicySnapshot = {
  id: "p1",
  status: "active",
  coverageA: 275000,
  premium: "2184.00",
  endedAt: null,
  endReason: null,
};

function request(
  overrides: Partial<ServiceRequestDraft> = {},
): ServiceRequestDraft {
  return {
    id: "r1",
    policyId: "p1",
    kind: "endorsement",
    status: "requested",
    reason: "coverage_change",
    summary: "Raise Coverage A after rebuild.",
    effectiveDate: new Date("2026-09-15T12:00:00.000Z"),
    coverageA: 290000,
    premium: "2290.00",
    ...overrides,
  };
}

describe("service request pipeline", () => {
  it("moves requested → in progress → filed and updates the Policy snapshot", () => {
    expect(nextServiceRequestStatus("requested", "start")).toBe("in_progress");
    const started = applyServiceRequestAction(request(), policy, "start");
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.status).toBe("in_progress");
    expect(started.policy.status).toBe("active");

    const filed = applyServiceRequestAction(
      request({ status: "in_progress" }),
      policy,
      "file",
    );
    expect(filed.ok).toBe(true);
    if (!filed.ok) return;
    expect(filed.status).toBe("filed");
    expect(filed.policy.coverageA).toBe(290000);
    expect(filed.policy.premium).toBe("2290.00");
    expect(filed.policy.status).toBe("active");
  });

  it("files a cancellation from requested and takes the policy off the book", () => {
    const filed = applyServiceRequestAction(
      request({ kind: "cancellation", reason: "insured_request", coverageA: null, premium: null }),
      policy,
      "file",
    );
    expect(filed.ok).toBe(true);
    if (!filed.ok) return;
    expect(filed.policy.status).toBe("cancellation");
    expect(filed.policy.endReason).toBe("insured_request");
  });

  it("withdraws an open request without touching the Policy", () => {
    const withdrawn = applyServiceRequestAction(request(), policy, "withdraw");
    expect(withdrawn.ok).toBe(true);
    if (!withdrawn.ok) return;
    expect(withdrawn.status).toBe("withdrawn");
    expect(withdrawn.policy).toEqual(policy);
  });

  it("requires summary and a reason that matches the kind", () => {
    expect(
      missingServiceRequestFields({
        kind: "endorsement",
        reason: "additional_interest",
        summary: "Lender mortgagee",
        effectiveDate: new Date("2026-09-10"),
        coverageA: null,
      }),
    ).toEqual([]);
    expect(
      missingServiceRequestFields({
        kind: "endorsement",
        reason: "coverage_change",
        summary: "Raise Cov A",
        effectiveDate: new Date("2026-09-20"),
        coverageA: 285000,
      }),
    ).toEqual([]);
    expect(
      missingServiceRequestFields({
        kind: "cancellation",
        reason: "coverage_change",
        summary: "Flat cancel",
        effectiveDate: new Date("2026-09-20"),
        coverageA: null,
      }),
    ).toContain("Reason that matches Cancellation");
    const blank = validateServiceRequestFields({
      kind: "non_renewal",
      reason: "",
      summary: "",
      effectiveDate: null,
      coverageA: null,
    });
    expect(blank.ok).toBe(false);
  });

  it("refuses to file a second time or endorse an already cancelled policy", () => {
    expect(applyServiceRequestAction(request({ status: "filed" }), policy, "file").ok).toBe(
      false,
    );
    const cancelled: PolicySnapshot = { ...policy, status: "cancellation" };
    const again = applyServiceRequestAction(request(), cancelled, "file");
    expect(again.ok).toBe(false);
  });
});
