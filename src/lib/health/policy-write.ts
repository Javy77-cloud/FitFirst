import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, healthPolicyMergeAudit, policies } from "@/lib/db/schema";
import {
  planHealthPolicyWrite,
  resolvedHealthProduct,
  type HealthIntakeSource,
  type HealthPolicyIdentity,
} from "@/lib/health/policy-dedup";

type PolicyRow = typeof policies.$inferSelect;

function textField(policy: PolicyRow, key: string): string | null {
  const fields = policy.mintPayload?.fields;
  const hit = fields?.find((field) => field.key === key);
  const value = hit?.value?.trim();
  return value || null;
}

export function healthIdentityFromPolicy(
  policy: PolicyRow,
  contact: { firstName?: string | null; lastName?: string | null; dateOfBirth?: string | null } | null,
): HealthPolicyIdentity {
  const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim();
  return {
    id: policy.id,
    contactId: policy.contactId,
    clientName: name || null,
    dateOfBirth: contact?.dateOfBirth ?? null,
    policyNumber: policy.policyNumber,
    carrierName: textField(policy, "carrier_name"),
    planType: textField(policy, "plan_name") || policy.policySubType,
    productType: resolvedHealthProduct({
      lineOfBusiness: policy.lineOfBusiness,
      insuranceType: policy.insuranceType,
      policyType: policy.policyType,
      policySubType: policy.policySubType,
      sourceProduct: policy.sourceProduct,
      planType: textField(policy, "plan_name"),
    }),
    lineOfBusiness: policy.lineOfBusiness,
    insuranceType: policy.insuranceType,
    policyType: policy.policyType,
    policySubType: policy.policySubType,
    sourceProduct: policy.sourceProduct,
    sourceId: policy.sourceId,
    intakeSource: (policy.intakeSource as HealthIntakeSource | null) ?? null,
    status: policy.status,
    premium: policy.premium,
    effectiveDate: policy.effectiveDate ? policy.effectiveDate.toISOString() : null,
    bound: policy.status === "bound" || policy.status === "active",
  };
}

export async function loadHealthPoliciesForContact(contactId: string): Promise<PolicyRow[]> {
  return db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.contactId, contactId)));
}

async function writeMergeAudit(input: {
  policyId: string;
  contactId: string | null;
  source: HealthIntakeSource;
  matchReason: string;
  productType: string;
  filledGaps: string[];
  setBound: boolean;
  actorId?: string | null;
}) {
  await db.insert(healthPolicyMergeAudit).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId: input.policyId,
    contactId: input.contactId,
    source: input.source,
    matchReason: input.matchReason,
    productType: input.productType,
    filledGaps: input.filledGaps,
    setBound: input.setBound,
    actorId: input.actorId ?? null,
  });
}

function dateOrUndefined(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export type HealthPolicyWriteResult =
  | { action: "create"; policyId: string }
  | { action: "merge"; policyId: string }
  | { action: "prefill"; policyId: string }
  | { action: "unchanged"; policyId: string };

/**
 * Create or enrich one health policy. Inbound merges. Manual against an
 * existing row prefills until confirmed. Product types stay separate.
 */
export async function commitHealthPolicyWrite(input: {
  incoming: HealthPolicyIdentity;
  source: HealthIntakeSource;
  confirmed?: boolean;
  actorId?: string | null;
  insert: Omit<typeof policies.$inferInsert, "id" | "tenantId">;
}): Promise<HealthPolicyWriteResult> {
  const contactId = input.incoming.contactId;
  if (!contactId) {
    const [created] = await db
      .insert(policies)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        ...input.insert,
        intakeSource: input.source,
        status: input.incoming.bound ? "bound" : input.insert.status,
      })
      .returning({ id: policies.id });
    return { action: "create", policyId: created!.id };
  }

  const [contact] = await db
    .select({
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      dateOfBirth: contacts.dateOfBirth,
    })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  const rows = await loadHealthPoliciesForContact(contactId);
  const existing = rows.map((row) => healthIdentityFromPolicy(row, contact ?? null));
  const clientName =
    input.incoming.clientName?.trim() ||
    [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim() ||
    null;
  const plan = planHealthPolicyWrite({
    existing,
    incoming: {
      ...input.incoming,
      clientName,
      dateOfBirth: input.incoming.dateOfBirth || contact?.dateOfBirth || null,
      contactId,
      intakeSource: input.source,
    },
    source: input.source,
    confirmed: input.confirmed,
  });

  if (plan.action === "create") {
    const [created] = await db
      .insert(policies)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        ...input.insert,
        intakeSource: input.source,
        contactId,
        status: input.incoming.bound ? "bound" : input.insert.status,
      })
      .returning({ id: policies.id });
    return { action: "create", policyId: created!.id };
  }

  if (plan.action === "prefill") {
    return { action: "prefill", policyId: plan.targetId };
  }

  const patch = plan.patch;
  await db
    .update(policies)
    .set({
      ...(patch.policyNumber ? { policyNumber: patch.policyNumber } : {}),
      ...(patch.premium ? { premium: patch.premium } : {}),
      ...(patch.policySubType ? { policySubType: patch.policySubType } : {}),
      ...(patch.sourceProduct ? { sourceProduct: patch.sourceProduct } : {}),
      ...(patch.sourceId ? { sourceId: patch.sourceId } : {}),
      ...(patch.effectiveDate ? { effectiveDate: dateOrUndefined(patch.effectiveDate) } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.intakeSource ? { intakeSource: patch.intakeSource } : {}),
      updatedAt: new Date(),
    })
    .where(eq(policies.id, plan.targetId));

  const product = resolvedHealthProduct(input.incoming) ?? "medical";
  await writeMergeAudit({
    policyId: plan.targetId,
    contactId,
    source: input.source,
    matchReason: plan.matchReason,
    productType: product,
    filledGaps: plan.filledGaps,
    setBound: plan.setBound,
    actorId: input.actorId,
  });
  return { action: "merge", policyId: plan.targetId };
}

/** Manual edit of a known policy. A colliding sibling is enriched, not cloned. */
export async function reconcileHealthPolicyUpdate(input: {
  policyId: string;
  source?: HealthIntakeSource;
  actorId?: string | null;
  incoming: HealthPolicyIdentity;
}): Promise<HealthPolicyWriteResult> {
  const contactId = input.incoming.contactId;
  if (!contactId) return { action: "unchanged", policyId: input.policyId };
  const [contact] = await db
    .select({
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      dateOfBirth: contacts.dateOfBirth,
    })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  const rows = await loadHealthPoliciesForContact(contactId);
  const existing = rows
    .filter((row) => row.id !== input.policyId)
    .map((row) => healthIdentityFromPolicy(row, contact ?? null));
  const plan = planHealthPolicyWrite({
    existing,
    incoming: { ...input.incoming, id: input.policyId, contactId },
    source: input.source ?? "manual",
    confirmed: true,
  });
  if (plan.action !== "merge") return { action: "unchanged", policyId: input.policyId };
  await db
    .update(policies)
    .set({
      ...(plan.patch.policyNumber ? { policyNumber: plan.patch.policyNumber } : {}),
      ...(plan.patch.premium ? { premium: plan.patch.premium } : {}),
      ...(plan.patch.policySubType ? { policySubType: plan.patch.policySubType } : {}),
      ...(plan.patch.sourceProduct ? { sourceProduct: plan.patch.sourceProduct } : {}),
      ...(plan.patch.sourceId ? { sourceId: plan.patch.sourceId } : {}),
      ...(plan.patch.status ? { status: plan.patch.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(policies.id, plan.targetId));
  await writeMergeAudit({
    policyId: plan.targetId,
    contactId,
    source: input.source ?? "manual",
    matchReason: plan.matchReason,
    productType: resolvedHealthProduct(input.incoming) ?? "medical",
    filledGaps: plan.filledGaps,
    setBound: plan.setBound,
    actorId: input.actorId,
  });
  return { action: "merge", policyId: plan.targetId };
}
