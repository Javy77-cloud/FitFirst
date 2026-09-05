import type { PolicyChangeKind } from "@/lib/policy/status";
import { applyPolicyChange, type PolicySnapshot } from "@/lib/policy/workflow";
import {
  CANCELLATION_REASONS,
  ENDORSEMENT_REASONS,
  NON_RENEWAL_REASONS,
} from "@/lib/policy/reasons";
import {
  isServiceRequestStatus,
  SERVICE_REQUEST_NEXT_STEPS,
  SERVICE_REQUEST_TASK_KIND,
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

export function reasonsForKind(kind: PolicyChangeKind) {
  if (kind === "endorsement") return ENDORSEMENT_REASONS;
  if (kind === "cancellation") return CANCELLATION_REASONS;
  return NON_RENEWAL_REASONS;
}

export function isReasonForKind(kind: PolicyChangeKind, reason: string): boolean {
  return reasonsForKind(kind).some((row) => row.value === reason);
}

export type ServiceRequestFieldInput = {
  kind: PolicyChangeKind;
  reason: string;
  summary: string | null | undefined;
  effectiveDate: Date | null;
  coverageA: number | null;
};

export function missingServiceRequestFields(input: ServiceRequestFieldInput): string[] {
  const missing: string[] = [];
  if (!input.reason.trim()) missing.push("Reason");
  else if (!isReasonForKind(input.kind, input.reason)) {
    missing.push(`Reason that matches ${serviceKindLabel(input.kind)}`);
  }
  if (!input.effectiveDate || Number.isNaN(input.effectiveDate.getTime())) {
    missing.push("Effective date");
  }
  if (!input.summary?.trim()) missing.push("What the insured asked for");
  if (input.kind === "endorsement" && input.reason === "coverage_change") {
    if (input.coverageA == null || !Number.isFinite(input.coverageA) || input.coverageA <= 0) {
      missing.push("Coverage A");
    }
  }
  return missing;
}

export function validateServiceRequestFields(
  input: ServiceRequestFieldInput,
): { ok: true } | { ok: false; error: string } {
  const missing = missingServiceRequestFields(input);
  if (missing.length === 0) return { ok: true };
  return { ok: false, error: `Required: ${missing.join(", ")}.` };
}

export function serviceRequestNextStepCopy(status: ServiceRequestStatus): string {
  return SERVICE_REQUEST_NEXT_STEPS[status];
}

export function serviceRequestTaskTitle(kind: string, policyNumber: string): string {
  return `${serviceKindLabel(kind)} · ${policyNumber}`;
}

export function serviceRequestTaskKind(): string {
  return SERVICE_REQUEST_TASK_KIND;
}
