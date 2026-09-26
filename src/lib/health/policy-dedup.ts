/**
 * Health policy dedup. Same contact, same product type, then any of
 * name+DOB, policy number, or carrier+plan. Never merge medical into dental
 * on name+DOB alone. Match fills gaps and can set Bound. It does not clone.
 */

import {
  healthProductType,
  healthProductsAreDistinct,
  type HealthProductInput,
  type HealthProductType,
} from "@/lib/health/product-type";

export const HEALTH_INTAKE_SOURCES = ["manual", "healthsherpa", "connector"] as const;
export type HealthIntakeSource = (typeof HEALTH_INTAKE_SOURCES)[number];

export const HEALTH_MATCH_REASONS = ["policy_number", "carrier_plan", "name_dob"] as const;
export type HealthMatchReason = (typeof HEALTH_MATCH_REASONS)[number];

export type HealthPolicyIdentity = {
  id?: string | null;
  contactId?: string | null;
  clientName?: string | null;
  dateOfBirth?: string | null;
  policyNumber?: string | null;
  carrierName?: string | null;
  planType?: string | null;
  productType?: HealthProductType | null;
  intakeSource?: HealthIntakeSource | null;
  status?: string | null;
  premium?: string | null;
  policySubType?: string | null;
  sourceProduct?: string | null;
  sourceId?: string | null;
  effectiveDate?: string | null;
  bound?: boolean;
} & HealthProductInput;

export type HealthPolicyGapPatch = {
  policyNumber?: string;
  premium?: string;
  policySubType?: string;
  sourceProduct?: string;
  sourceId?: string;
  effectiveDate?: string;
  status?: "bound";
  intakeSource?: HealthIntakeSource;
};

export type HealthDedupPlan =
  | { action: "create" }
  | {
      action: "prefill";
      targetId: string;
      matchReason: HealthMatchReason;
      patch: HealthPolicyGapPatch;
      filledGaps: string[];
      setBound: boolean;
    }
  | {
      action: "merge";
      targetId: string;
      matchReason: HealthMatchReason;
      patch: HealthPolicyGapPatch;
      filledGaps: string[];
      setBound: boolean;
    };

const BOUND_STATUSES = new Set(["bound", "active"]);

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normPolicyNumber(value: string | null | undefined): string {
  return norm(value).replace(/[^a-z0-9]/g, "");
}

/** Calendar date only, so 01/02/1980 and 1980-01-02 compare equal. */
export function normDob(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (us) {
    const month = us[1]!.padStart(2, "0");
    const day = us[2]!.padStart(2, "0");
    return `${us[3]}-${month}-${day}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return norm(raw);
}

export function resolvedHealthProduct(row: HealthPolicyIdentity): HealthProductType | null {
  return row.productType && isStoredProduct(row.productType)
    ? row.productType
    : healthProductType(row);
}

function isStoredProduct(value: string): value is HealthProductType {
  return value === "medical" || value === "dental" || value === "vision";
}

function sameContact(left: HealthPolicyIdentity, right: HealthPolicyIdentity): boolean {
  const a = left.contactId ?? "";
  const b = right.contactId ?? "";
  if (!a || !b) return false;
  return a === b;
}

function sameProduct(left: HealthPolicyIdentity, right: HealthPolicyIdentity): boolean {
  const a = resolvedHealthProduct(left);
  const b = resolvedHealthProduct(right);
  if (!a || !b) return false;
  return !healthProductsAreDistinct(a, b) && a === b;
}

export function healthMatchReason(
  existing: HealthPolicyIdentity,
  incoming: HealthPolicyIdentity,
): HealthMatchReason | null {
  if (!sameContact(existing, incoming) || !sameProduct(existing, incoming)) return null;

  const existingNumber = normPolicyNumber(existing.policyNumber);
  const incomingNumber = normPolicyNumber(incoming.policyNumber);
  if (existingNumber && incomingNumber && existingNumber === incomingNumber) return "policy_number";

  const existingCarrier = norm(existing.carrierName);
  const incomingCarrier = norm(incoming.carrierName);
  const existingPlan = norm(existing.planType || existing.policySubType);
  const incomingPlan = norm(incoming.planType || incoming.policySubType);
  if (
    existingCarrier &&
    incomingCarrier &&
    existingPlan &&
    incomingPlan &&
    existingCarrier === incomingCarrier &&
    existingPlan === incomingPlan
  ) {
    return "carrier_plan";
  }

  const existingName = norm(existing.clientName);
  const incomingName = norm(incoming.clientName);
  const existingDob = normDob(existing.dateOfBirth);
  const incomingDob = normDob(incoming.dateOfBirth);
  if (
    existingName &&
    incomingName &&
    existingDob &&
    incomingDob &&
    existingName === incomingName &&
    existingDob === incomingDob
  ) {
    return "name_dob";
  }

  return null;
}

function blank(value: string | null | undefined): boolean {
  return !String(value ?? "").trim();
}

function incomingBound(row: HealthPolicyIdentity): boolean {
  if (row.bound === true) return true;
  return BOUND_STATUSES.has(norm(row.status));
}

/** Fill empty fields only. Bound is the one status inbound/manual may set. */
export function mergeHealthPolicyGaps(
  existing: HealthPolicyIdentity,
  incoming: HealthPolicyIdentity,
): { patch: HealthPolicyGapPatch; filledGaps: string[]; setBound: boolean } {
  const patch: HealthPolicyGapPatch = {};
  const filledGaps: string[] = [];
  const take = (key: keyof HealthPolicyGapPatch, current: string | null | undefined, next: string | null | undefined) => {
    if (!blank(current) || blank(next)) return;
    patch[key] = next!.trim() as never;
    filledGaps.push(key);
  };
  take("policyNumber", existing.policyNumber, incoming.policyNumber);
  take("premium", existing.premium, incoming.premium);
  take("policySubType", existing.policySubType, incoming.policySubType);
  take("sourceProduct", existing.sourceProduct, incoming.sourceProduct);
  take("sourceId", existing.sourceId, incoming.sourceId);
  take("effectiveDate", existing.effectiveDate, incoming.effectiveDate);
  if (!existing.intakeSource && incoming.intakeSource) {
    patch.intakeSource = incoming.intakeSource;
    filledGaps.push("intakeSource");
  }
  const setBound = incomingBound(incoming) && !BOUND_STATUSES.has(norm(existing.status));
  if (setBound) {
    patch.status = "bound";
    filledGaps.push("status");
  }
  return { patch, filledGaps, setBound };
}

function rank(reason: HealthMatchReason): number {
  if (reason === "policy_number") return 0;
  if (reason === "carrier_plan") return 1;
  return 2;
}

/**
 * Inbound always merges into the matched row.
 * Manual against an inbound-first row prefills until the agent confirms.
 * Manual against a manual-first row also prefills until confirm, then merges.
 */
export function planHealthPolicyWrite(input: {
  existing: readonly HealthPolicyIdentity[];
  incoming: HealthPolicyIdentity;
  source: HealthIntakeSource;
  confirmed?: boolean;
}): HealthDedupPlan {
  let best: { row: HealthPolicyIdentity; reason: HealthMatchReason } | null = null;
  for (const row of input.existing) {
    if (!row.id) continue;
    if (input.incoming.id && row.id === input.incoming.id) continue;
    const reason = healthMatchReason(row, input.incoming);
    if (!reason) continue;
    if (!best || rank(reason) < rank(best.reason)) best = { row, reason };
  }
  if (!best?.row.id) return { action: "create" };

  const { patch, filledGaps, setBound } = mergeHealthPolicyGaps(best.row, {
    ...input.incoming,
    intakeSource: input.incoming.intakeSource ?? input.source,
    bound: input.incoming.bound,
  });
  const shared = {
    targetId: best.row.id,
    matchReason: best.reason,
    patch,
    filledGaps,
    setBound,
  };
  const inbound = input.source === "healthsherpa" || input.source === "connector";
  if (inbound || input.confirmed) return { action: "merge", ...shared };
  return { action: "prefill", ...shared };
}
