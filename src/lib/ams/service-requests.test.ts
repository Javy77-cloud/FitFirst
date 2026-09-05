import { describe, expect, it } from "vitest";
import type { PolicySnapshot } from "@/lib/policy/workflow";
import {
  applyServiceRequestAction,
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

  it("requires a summary to queue cancel or non-renew and never invents a Hale cancel", () => {
    expect(
      validateServiceRequestFields({
        kind: "cancellation",
        reason: "insured_request",
        effectiveDate: new Date("2026-09-15"),
        summary: null,
        coverageA: null,
        premium: null,
      }).ok,
    ).toBe(false);
    expect(
      validateServiceRequestFields({
        kind: "non_renewal",
        reason: "carrier_nonrenew",
        effectiveDate: new Date("2026-10-01"),
        summary: "Carrier exit — file only when the desk is ready. Hale stays active.",
        coverageA: null,
        premium: null,
      }).ok,
    ).toBe(true);
    expect(
      validateServiceRequestFields({
        kind: "endorsement",
        reason: "coverage_change",
        effectiveDate: new Date("2026-09-20"),
        summary: "Raise Coverage A",
        coverageA: null,
        premium: "2547.00",
      }).ok,
    ).toBe(false);
    const hale = applyServiceRequestAction(
      request({ status: "requested", kind: "endorsement" }),
      policy,
      "start",
    );
    expect(hale.ok).toBe(true);
    if (!hale.ok) return;
    expect(hale.policy.status).toBe("active");
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
