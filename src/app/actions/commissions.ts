"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { COMMISSION_STATUSES, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissionEvents, commissions, policies } from "@/lib/db/schema";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import { computePolicyCommission } from "@/lib/commissions/policy-math";
import { flashAction } from "@/lib/flash-action";
import { commissionFamilyFromInsurance, insuranceFamilyFromPolicy } from "@/lib/desk/policy-family";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function writeStatus(commissionId: string, status: string, actorId: string, note: string) {
  const [current] = await db
    .select({
      id: commissions.id,
      status: commissions.status,
    })
    .from(commissions)
    .where(and(eq(commissions.id, commissionId), eq(commissions.tenantId, DEFAULT_TENANT_ID)));
  if (!current) return;

  const paid = status === "paid";
  await db
    .update(commissions)
    .set({
      status,
      paidDate: paid ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(commissions.id, commissionId), eq(commissions.tenantId, DEFAULT_TENANT_ID)));

  await db.insert(commissionEvents).values({
    tenantId: DEFAULT_TENANT_ID,
    commissionId,
    actorId,
    fromStatus: current.status,
    toStatus: status,
    note,
  });
}

export async function markCommissionStatus(formData: FormData) {
  const id = str(formData, "commissionId");
  const status = str(formData, "status");
  if (!id || !COMMISSION_STATUSES.includes(status as (typeof COMMISSION_STATUSES)[number])) {
    return;
  }
  const session = await currentDeskSession();
  await writeStatus(id, status, session.userId || ADMIN_USER_ID, `Status set to ${status}`);
  revalidatePath("/commissions");
  revalidatePath("/");
}

export async function savePolicyCommission(formData: FormData) {
  const policyId = str(formData, "policyId");
  if (!policyId) return;
  const [existing] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!existing) return;

  const insuranceType = str(formData, "insuranceType") || insuranceFamilyFromPolicy(existing);
  const policyType = str(formData, "policyType") || existing.policyType;
  const policySubType = str(formData, "policySubType") || existing.policySubType;
  const gwp = str(formData, "gwp");
  const commission4 = str(formData, "commission4");
  const frequency = str(formData, "premiumFrequency");
  const insuredCount = Math.max(1, Number(str(formData, "numberOfInsured") || existing.insuredCount || "1") || 1);
  const computed = computePolicyCommission({
    insuranceType,
    policyType,
    policySubType,
    sellingAgency: str(formData, "sellingAgency") || existing.sellingAgency,
    gwp,
    commission4,
    premiumFrequency: frequency,
    numberOfInsured: insuredCount,
  });

  await db
    .update(policies)
    .set({
      insuranceType,
      policyType,
      policySubType,
      premium: gwp === "" ? existing.premium : gwp,
      commission4Pct: commission4 || existing.commission4Pct,
      billingFrequency: frequency || existing.billingFrequency,
      insuredCount,
      commissionFamily: commissionFamilyFromInsurance(
        insuranceType as "Life" | "Health" | "P&C",
        policySubType,
      ),
      updatedAt: new Date(),
    })
    .where(eq(policies.id, policyId));

  const [row] = await db
    .select()
    .from(commissions)
    .where(and(eq(commissions.tenantId, DEFAULT_TENANT_ID), eq(commissions.policyId, policyId)));
  const values = {
    premium: (gwp || existing.premium || "0").toString(),
    ratePct: commission4 || null,
    amount: computed.totalAnnualCommission.toFixed(2),
    lineOfBusiness: insuranceType,
    status: str(formData, "paymentStatus") === "Paid" ? "paid" : row?.status ?? "pending",
    dueDate: str(formData, "dueDate") ? new Date(`${str(formData, "dueDate")}T12:00:00.000Z`) : row?.dueDate,
    paidDate: str(formData, "paidDate") ? new Date(`${str(formData, "paidDate")}T12:00:00.000Z`) : row?.paidDate,
    updatedAt: new Date(),
  };
  if (row) {
    await db.update(commissions).set(values).where(eq(commissions.id, row.id));
  } else {
    await db.insert(commissions).values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      status: values.status,
      premium: values.premium,
      ratePct: values.ratePct,
      amount: values.amount,
      lineOfBusiness: values.lineOfBusiness,
      dueDate: values.dueDate,
      paidDate: values.paidDate,
    });
  }

  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/commissions");
  flashAction(`/policies/${policyId}`, "commission-saved");
}

export async function markCommissionPaid(formData: FormData) {
  const id = str(formData, "commissionId");
  if (!id) return;
  const session = await currentDeskSession();
  await writeStatus(id, "paid", session.userId || ADMIN_USER_ID, "Marked paid — policy status unchanged");
  revalidatePath("/commissions");
  revalidatePath("/");
}
