import type { PolicyChangeKind } from "@/lib/policy/status";
import { applyPolicyChange, type PolicySnapshot } from "@/lib/policy/workflow";
import {
  isServiceRequestStatus,
  type ServiceRequestStatus,
} from "@/lib/domain-ams";

export const SERVICE_PIPELINE_STATUSES: ServiceRequestStatus[] = [
  "requested",
  "in_progress",
  "filed",
  "withdrawn",
];

export type ServiceRequestDraft = {
  id: string;
  policyId: string;
  kind: PolicyChangeKind;
  status: ServiceRequestStatus;
  reason: string;
  summary: string | null;
  effectiveDate: Date;
  coverageA: number | null;
  premium: string | null;
};

export type ServiceRequestAction = "start" | "file" | "withdraw";

export function nextServiceRequestStatus(
  status: ServiceRequestStatus,
  action: ServiceRequestAction,
): ServiceRequestStatus | null {
  if (action === "start" && status === "requested") return "in_progress";
  if (action === "withdraw" && (status === "requested" || status === "in_progress")) {
    return "withdrawn";
  }
  if (action === "file" && (status === "requested" || status === "in_progress")) {
    return "filed";
  }
  return null;
}

export function applyServiceRequestAction(
  request: ServiceRequestDraft,
  policy: PolicySnapshot,
  action: ServiceRequestAction,
):
  | { ok: true; status: ServiceRequestStatus; policy: PolicySnapshot }
  | { ok: false; error: string } {
  if (!isServiceRequestStatus(request.status)) {
    return { ok: false, error: "Unknown service request status." };
  }
  const next = nextServiceRequestStatus(request.status, action);
  if (!next) {
    return { ok: false, error: `Cannot ${action} a ${request.status} request.` };
  }
  if (action !== "file") {
    return { ok: true, status: next, policy };
  }
  const filed = applyPolicyChange(policy, {
    kind: request.kind,
    effectiveDate: request.effectiveDate,
    reason: request.reason,
    summary: request.summary ?? undefined,
    coverageA: request.coverageA,
    premium: request.premium,
  });
  if (!filed.ok) return filed;
  return { ok: true, status: "filed", policy: filed.policy };
}

export function serviceKindLabel(kind: string): string {
  if (kind === "endorsement") return "Endorsement";
  if (kind === "cancellation") return "Cancellation";
  if (kind === "non_renewal") return "Non-renewal";
  return kind.replaceAll("_", " ");
}
