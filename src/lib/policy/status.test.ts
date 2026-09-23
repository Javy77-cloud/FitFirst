import { describe, expect, it } from "vitest";
import {
  isEndedStatus,
  isInForceStatus,
  isOffBookStatus,
  normalizePolicyStatus,
  POLICY_STATUSES,
  policyStatusLabel,
} from "./status";

describe("policy status model", () => {
  it("exposes the post-issue palette agents can pick", () => {
    expect(POLICY_STATUSES).toEqual([
      "unpublished",
      "bound",
      "pending",
      "active",
      "lapsed",
      "cancelled",
      "non_renewed",
      "expired",
    ]);
  });

  it("normalizes legacy aliases onto the canonical statuses", () => {
    expect(normalizePolicyStatus("lapse")).toBe("lapsed");
    expect(normalizePolicyStatus("cancellation")).toBe("cancelled");
    expect(normalizePolicyStatus("canceled")).toBe("cancelled");
    expect(normalizePolicyStatus("non_renewal")).toBe("non_renewed");
    expect(normalizePolicyStatus("Non-Renewed")).toBe("non_renewed");
  });

  it("labels ended statuses for the desk", () => {
    expect(policyStatusLabel("lapsed")).toBe("Lapsed");
    expect(policyStatusLabel("cancelled")).toBe("Cancelled");
    expect(policyStatusLabel("non_renewed")).toBe("Non-renewed");
    expect(policyStatusLabel("expired")).toBe("Expired");
    expect(policyStatusLabel("lapse")).toBe("Lapsed");
    expect(policyStatusLabel("non_renewal")).toBe("Non-renewed");
  });

  it("treats all terminal aliases as off-book / ended, not in force", () => {
    for (const status of [
      "lapsed",
      "lapse",
      "cancelled",
      "canceled",
      "cancellation",
      "non_renewed",
      "non_renewal",
      "expired",
    ]) {
      expect(isOffBookStatus(status), status).toBe(true);
      expect(isEndedStatus(status), status).toBe(true);
      expect(isInForceStatus(status), status).toBe(false);
    }
    expect(isInForceStatus("active")).toBe(true);
    expect(isOffBookStatus("active")).toBe(false);
  });
});
