import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, SELLING_AGENCIES } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissions, policies } from "@/lib/db/schema";
import { periodKey } from "./math";
import { suggestMasterDefaults } from "./master-defaults";
import {
  computePolicyCommission,
  normalizeSellingAgency,
  nullableNumber,
  type PolicyCommissionInput,
} from "./policy-math";
import { lineOfBusinessFromZoho } from "./zoho-fields";

export type PolicyCommissionFields = PolicyCommissionInput & {
  paymentStatus: string | null;
  paymentReferenceBatch: string | null;
  dueDate: string | null;
  paidDate: string | null;
};

function money(value: number): string {
  return value.toFixed(2);
}

function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T16:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sellingAgencyKey(value: string | null | undefined): string {
  const key = normalizeSellingAgency(value);
  return (SELLING_AGENCIES as readonly string[]).some((row) => normalizeSellingAgency(row) === key)
    ? key
    : "afa";
}

export async function savePolicyCommissionFields(
  policyId: string,
  fields: PolicyCommissionFields,
  actorId: string,
) {
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.id, policyId), eq(policies.tenantId, DEFAULT_TENANT_ID)));
  if (!policy) return null;

  const sellingAgency = sellingAgencyKey(fields.sellingAgency);
  const suggested = suggestMasterDefaults({ ...fields, sellingAgency });
  const insuranceType = fields.insuranceType || suggested.insuranceType;
  const policyType = fields.policyType || suggested.policyType;
  const commission4 = nullableNumber(fields.commission4) ?? suggested.commission4;
  const premiumFrequency = fields.premiumFrequency || suggested.premiumFrequency;
  const gwp = nullableNumber(fields.gwp) ?? nullableNumber(policy.gwp) ?? nullableNumber(policy.premium);
  const computed = computePolicyCommission({
    ...fields,
    sellingAgency,
    insuranceType,
    policyType,
    commission4,
    premiumFrequency,
    gwp,
  });
  const insured = nullableNumber(fields.numberOfInsured);
  const gwpStr = gwp == null ? null : money(gwp);
  const c4Str = commission4 == null ? null : money(commission4);
  const line = lineOfBusinessFromZoho(
    insuranceType,
    policyType,
    fields.policySubType,
  );
  const tac = money(computed.totalAnnualCommission);
  const dueDate = parseDay(fields.dueDate);
  const paidDate = parseDay(fields.paidDate);
  const now = new Date();

  await db
    .update(policies)
    .set({
      insuranceType: insuranceType || null,
      policyType: policyType || null,
      policySubType: fields.policySubType || null,
      premiumFrequency: premiumFrequency || null,
      numberOfInsured: insured == null ? null : Math.trunc(insured),
      gwp: gwpStr,
      commission4: c4Str,
      premium: gwpStr ?? policy.premium,
      lineOfBusiness: insuranceType ? line : policy.lineOfBusiness,
      updatedAt: now,
    })
    .where(and(eq(policies.id, policyId), eq(policies.tenantId, DEFAULT_TENANT_ID)));

  const [existing] = await db
    .select()
    .from(commissions)
    .where(and(eq(commissions.tenantId, DEFAULT_TENANT_ID), eq(commissions.policyId, policyId)))
    .orderBy(desc(commissions.updatedAt));

  const payload = {
    lineOfBusiness: insuranceType ? line : (existing?.lineOfBusiness ?? policy.lineOfBusiness),
    premium: gwpStr ?? existing?.premium ?? "0.00",
    ratePct: c4Str ?? existing?.ratePct ?? "0.00",
    amount: tac,
    agencyAmount: tac,
    producerAmount: tac,
    sellingAgency,
    dueDate,
    paidDate,
    insuranceType: insuranceType || null,
    policyType: policyType || null,
    policySubType: fields.policySubType || null,
    premiumFrequency: premiumFrequency || null,
    numberOfInsured: insured == null ? null : Math.trunc(insured),
    gwp: gwpStr,
    commission4: c4Str,
    initialCommission: money(computed.initialCommission),
    deferredCommission: money(computed.deferredCommission),
    monthlyCommission: money(computed.monthlyCommission),
    totalAnnualCommission: tac,
    paymentStatus: fields.paymentStatus || null,
    paymentReferenceBatch: fields.paymentReferenceBatch || null,
    updatedAt: now,
  };

  if (existing) {
    await db
      .update(commissions)
      .set(payload)
      .where(and(eq(commissions.id, existing.id), eq(commissions.tenantId, DEFAULT_TENANT_ID)));
    return { commissionId: existing.id, computed };
  }

  const [created] = await db
    .insert(commissions)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      agentId: policy.ownerId ?? actorId,
      policyId,
      carrierId: policy.carrierId,
      status: "pending",
      period: periodKey(policy.effectiveDate ?? now),
      ...payload,
    })
    .returning({ id: commissions.id });

  return { commissionId: created?.id ?? null, computed };
}

export function fieldsFromForm(form: FormData): PolicyCommissionFields {
  const num = (key: string) => {
    const raw = String(form.get(key) ?? "").trim();
    return raw === "" ? null : raw;
  };
  return {
    insuranceType: String(form.get("insuranceType") ?? "").trim() || null,
    policyType: String(form.get("policyType") ?? "").trim() || null,
    policySubType: String(form.get("policySubType") ?? "").trim() || null,
    sellingAgency: String(form.get("sellingAgency") ?? "").trim() || null,
    gwp: num("gwp"),
    commission4: num("commission4"),
    premiumFrequency: String(form.get("premiumFrequency") ?? "").trim() || null,
    numberOfInsured: num("numberOfInsured"),
    paymentStatus: String(form.get("paymentStatus") ?? "").trim() || null,
    paymentReferenceBatch: String(form.get("paymentReferenceBatch") ?? "").trim() || null,
    dueDate: String(form.get("dueDate") ?? "").trim() || null,
    paidDate: String(form.get("paidDate") ?? "").trim() || null,
  };
}
