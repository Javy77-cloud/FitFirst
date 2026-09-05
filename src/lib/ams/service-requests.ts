import type { PolicyChangeKind } from "@/lib/policy/status";
import { applyPolicyChange, type PolicySnapshot } from "@/lib/policy/workflow";
import {
  CANCELLATION_REASONS,
  ENDORSEMENT_REASONS,
  NON_RENEWAL_REASONS,
} from "@/lib/policy/reasons";
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

export type ServiceRequestFields = {
  kind: PolicyChangeKind;
  reason: string;
  effectiveDate: Date | null;
  summary: string | null;
  coverageA: number | null;
  premium: string | null;
};

export function reasonsForKind(kind: PolicyChangeKind) {
  if (kind === "endorsement") return ENDORSEMENT_REASONS;
  if (kind === "cancellation") return CANCELLATION_REASONS;
  return NON_RENEWAL_REASONS;
}

export function requiredFieldsForKind(kind: PolicyChangeKind): string[] {
  const fields = ["kind", "reason", "effectiveDate"];
  if (kind === "cancellation" || kind === "non_renewal") fields.push("summary");
  if (kind === "endorsement") fields.push("reason_match");
  return fields;
}

export function validateServiceRequestFields(
  input: ServiceRequestFields,
): { ok: true } | { ok: false; error: string } {
  if (!input.kind) return { ok: false, error: "Choose a change type." };
  if (!input.effectiveDate) return { ok: false, error: "A valid effective date is required." };
  const allowed = new Set<string>(reasonsForKind(input.kind).map((row) => row.value));
  if (!input.reason) return { ok: false, error: "Reason is required." };
  if (!allowed.has(input.reason)) {
    return { ok: false, error: `Reason is not valid for a ${serviceKindLabel(input.kind).toLowerCase()}.` };
  }
  if ((input.kind === "cancellation" || input.kind === "non_renewal") && !input.summary?.trim()) {
    return {
      ok: false,
      error:
        "Cancellation and non-renewal need a summary. Filing is manual — Hale stays in force until you file.",
    };
  }
  if (input.kind === "endorsement" && input.reason === "coverage_change" && input.coverageA == null) {
    return { ok: false, error: "Coverage A is required for a coverage-change endorsement." };
  }
  return { ok: true };
}

export function workStatusForKind(kind: PolicyChangeKind): "endorsement_pending" | "waiting_on_carrier" {
  return kind === "endorsement" ? "endorsement_pending" : "waiting_on_carrier";
}

export function workFlagForKind(kind: PolicyChangeKind): "endorsement_required" | "lapse_warning" {
  return kind === "endorsement" ? "endorsement_required" : "lapse_warning";
}
