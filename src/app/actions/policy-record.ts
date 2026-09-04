"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, commissions, contacts, policies, policyAutomations, reviewTasks } from "@/lib/db/schema";
import { addUtcDays, DESK_AS_OF } from "@/lib/home/as-of";
import { inferLineFamily, isOepLine, previewCommission, type LineFamily } from "@/lib/desk/commission-line";
import {
  commissionFamilyFromInsurance,
  expirationFromTerm,
  insuranceFamilyFromPolicy,
  lineOfBusinessForFamily,
  type InsuranceFamily,
} from "@/lib/desk/policy-family";
import { loadCommissionRates } from "@/lib/desk/load-rates";
import { partyLabel } from "@/lib/desk/policy-name";
import { toNumber } from "@/lib/commissions/math";
import { writeEoAuditSafe } from "@/lib/eo-audit/write";
import { currentDeskSession } from "@/lib/auth/session";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function dateOrNull(raw: string) {
  if (!raw) return null;
  const d = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function updatePolicyRecord(formData: FormData) {
  const id = str(formData, "policyId");
  if (!id) return;
  const [existing] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, id)));
  if (!existing) return;

  const effectiveDate = dateOrNull(str(formData, "effectiveDate")) ?? existing.effectiveDate;
  const insuranceType = (str(formData, "insuranceType") ||
    insuranceFamilyFromPolicy(existing)) as InsuranceFamily;
  const subType = str(formData, "policySubType") || existing.policySubType;
  const policyType = str(formData, "policyType") || existing.policyType;
  const policyTerm = str(formData, "policyTerm") || existing.policyTerm;
  const fromTerm = expirationFromTerm(effectiveDate, policyTerm, existing.expirationDate);
  const expirationDate = dateOrNull(str(formData, "expirationDate")) ?? fromTerm ?? existing.expirationDate;
  const renewalDate = dateOrNull(str(formData, "renewalDate"));
  const oepStart = dateOrNull(str(formData, "oepStart"));
  const premium = str(formData, "premium");
  const family = (str(formData, "commissionFamily") ||
    commissionFamilyFromInsurance(insuranceType, subType) ||
    inferLineFamily(existing.lineOfBusiness, existing.commissionFamily, subType)) as LineFamily;
  const insuredCount = Math.max(1, Number(str(formData, "insuredCount") || existing.insuredCount || "1") || 1);
  const commission4 = str(formData, "commission4Pct") || str(formData, "ratePct") || existing.commission4Pct;
  const faceAmount = str(formData, "faceAmount");
  const sameAsMailing = str(formData, "insuredSameAsMailing") === "on" || str(formData, "insuredSameAsMailing") === "true";

  await db
    .update(policies)
    .set({
      status: str(formData, "status") || existing.status,
      lineOfBusiness:
        str(formData, "lineOfBusiness") ||
        lineOfBusinessForFamily(insuranceType, policyType, subType) ||
        existing.lineOfBusiness,
      policyNumber: str(formData, "policyNumber") || existing.policyNumber,
      premium: premium === "" ? existing.premium : premium,
      billingFrequency: str(formData, "billingFrequency") || existing.billingFrequency,
      effectiveDate,
      expirationDate,
      renewalDate,
      oepStart,
      commissionFamily: family,
      sellingAgency: str(formData, "sellingAgency") || existing.sellingAgency,
      policySubType: subType,
      insuranceType,
      policyType,
      policyTerm,
      faceAmount: faceAmount === "" ? existing.faceAmount : faceAmount,
      insuredSameAsMailing: sameAsMailing,
      insuredCount,
      commission4Pct: commission4 || null,
      producer: str(formData, "producer") || null,
      formType: str(formData, "formType") || policyType || existing.formType,
      premisesAddress: str(formData, "premisesAddress") || existing.premisesAddress,
      premisesCity: str(formData, "premisesCity") || existing.premisesCity,
      premisesState: str(formData, "premisesState") || existing.premisesState,
      premisesZip: str(formData, "premisesZip") || existing.premisesZip,
      updatedAt: new Date(),
    })
    .where(eq(policies.id, id));

  const session = await currentDeskSession();
  await writeEoAuditSafe({
    action: "policy_change",
    summary: `Updated ${str(formData, "policyNumber") || existing.policyNumber} on the desk`,
    actorId: session.userId,
    actorName: session.name,
    entityType: "policy",
    entityId: id,
    contactId: existing.contactId,
    accountId: existing.accountId,
    policyId: id,
    dealId: existing.dealId,
    meta: {
      status: { from: existing.status, to: str(formData, "status") || existing.status },
      policyNumber: str(formData, "policyNumber") || existing.policyNumber,
    },
  });

  await syncPolicyDateAutomations(id);
  await upsertPolicyCommission(id, family, toNumber(premium || existing.premium), formData);
  revalidatePath(`/policies/${id}`);
  revalidatePath("/policies");
  revalidatePath("/tasks");
}

export async function syncPolicyDateAutomations(policyId: string) {
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return;

  const [contact] = policy.contactId
    ? await db.select().from(contacts).where(eq(contacts.id, policy.contactId))
    : [];
  const [account] = policy.accountId
    ? await db.select().from(accounts).where(eq(accounts.id, policy.accountId))
    : [];
  const party = `${partyLabel(contact ?? null, account ?? null)}`.replace(/\s+/g, " ").trim();
  const policyType = policy.policySubType || policy.formType || policy.lineOfBusiness;
  const xDate = policy.expirationDate;
  const asOf = DESK_AS_OF;
  const family = inferLineFamily(policy.lineOfBusiness, policy.commissionFamily, policy.policySubType);

  const jobs: { kind: string; fireOn: Date; title: string; body: string }[] = [];

  for (const days of [30, 60] as const) {
    const window = addUtcDays(asOf, days);
    if (xDate > asOf && xDate <= window) {
      jobs.push({
        kind: `renewal_${days}`,
        fireOn: addUtcDays(xDate, -days),
        title: `Policy renewal coming up - ${party} - ${policyType}`,
        body: `${policy.policyNumber} X-Date ${xDate.toISOString().slice(0, 10)}. ${days}-day renewal (90-day is off). High. Not Started.`,
      });
    }
  }

  if (policy.oepStart && isOepLine(family, policy.policySubType)) {
    const fireOn = addUtcDays(policy.oepStart, -30);
    jobs.push({
      kind: "oep_stay_put",
      fireOn,
      title: `OEP stay-put — ${party} — ${policyType}`,
      body: `Internal stay-put 30 days before OEP start ${policy.oepStart.toISOString().slice(0, 10)}. No client email. No new policy.`,
    });
  }

  // TODO(zoho-deluge): remaining Zoho master legal/compliance policy rules are unknown
  // on this desk. Do not invent extra Deluge branches. 90-day renewal stays off.

  for (const job of jobs) {
    const [existing] = await db
      .select()
      .from(policyAutomations)
      .where(
        and(
          eq(policyAutomations.tenantId, DEFAULT_TENANT_ID),
          eq(policyAutomations.policyId, policyId),
          eq(policyAutomations.kind, job.kind),
        ),
      );
    if (existing) {
      await db
        .update(policyAutomations)
        .set({ fireOn: job.fireOn, body: job.body, status: "open", updatedAt: new Date() })
        .where(eq(policyAutomations.id, existing.id));
    } else {
      await db.insert(policyAutomations).values({
        tenantId: DEFAULT_TENANT_ID,
        policyId,
        kind: job.kind,
        fireOn: job.fireOn,
        body: job.body,
        status: "open",
      });
    }
    const [task] = await db
      .select()
      .from(reviewTasks)
      .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.policyId, policyId), eq(reviewTasks.kind, job.kind)));
    if (task) {
      await db
        .update(reviewTasks)
        .set({ title: job.title, dueDate: job.fireOn, status: "open" })
        .where(eq(reviewTasks.id, task.id));
    } else {
      await db.insert(reviewTasks).values({
        tenantId: DEFAULT_TENANT_ID,
        policyId,
        contactId: policy.contactId,
        accountId: policy.accountId,
        dealId: policy.dealId,
        kind: job.kind,
        title: job.title,
        dueDate: job.fireOn,
        status: "open",
      });
    }
  }
}

async function upsertPolicyCommission(
  policyId: string,
  family: LineFamily,
  premium: number,
  form: FormData,
) {
  const rates = await loadCommissionRates();
  const insuredCount = Math.max(1, Number(str(form, "insuredCount") || "1") || 1);
  const existingRate = str(form, "commission4Pct") || str(form, "ratePct");
  const preview = previewCommission({
    family,
    gwp: premium,
    rates,
    commission4: existingRate ? toNumber(existingRate) : null,
    frequency: str(form, "billingFrequency"),
    insuredCount,
  });
  if (preview.amount == null) return;

  const [row] = await db
    .select()
    .from(commissions)
    .where(and(eq(commissions.tenantId, DEFAULT_TENANT_ID), eq(commissions.policyId, policyId)));
  const values = {
    premium: premium.toFixed(2),
    ratePct: preview.commission4 != null ? String(preview.commission4) : null,
    amount: preview.totalAnnualCommission.toFixed(2),
    lineOfBusiness: family,
    updatedAt: new Date(),
  };
  if (row) {
    await db.update(commissions).set(values).where(eq(commissions.id, row.id));
  } else {
    await db.insert(commissions).values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      status: "pending",
      ...values,
    });
  }
}
