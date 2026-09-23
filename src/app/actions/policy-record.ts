"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, carriers, clientHistory, commissions, contacts, policies, policyAutomations, reviewTasks } from "@/lib/db/schema";
import { addUtcDays, deskNow } from "@/lib/home/as-of";
import { inferLineFamily, isOepLine, previewCommission, type LineFamily } from "@/lib/desk/commission-line";
import {
  commissionFamilyFromInsurance,
  defaultTermForFamily,
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
import { withHistoryDefaults } from "@/lib/policy/change-log";
import { recordPolicyFieldChanges } from "@/lib/policy/record-changes";
import { flashAction } from "@/lib/flash-action";
import { scheduleContactCoverageNotices } from "@/lib/coverage/schedule-notices";
import { isPolicySensitiveInlineKey, sensitiveFieldConfirmCopy } from "@/lib/policy/sensitive-fields";
import { getAllowPolicyLabelOverride } from "@/lib/policy/auto-label-prefs";
import { splitPremisesAddress, streetOnlyPremises } from "@/lib/policy/premises";
import { requireStoredLobCode } from "@/lib/db/line-settings";
import {
  buildTermOverridePatch,
  termOverrideSummary,
} from "@/lib/policy/term-override";

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

  const next = {
    status: str(formData, "status") || existing.status,
    lineOfBusiness: await requireStoredLobCode(
      str(formData, "lineOfBusiness") ||
        lineOfBusinessForFamily(insuranceType, policyType, subType) ||
        existing.lineOfBusiness,
      existing.lineOfBusiness,
    ),
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
    premisesAddress: streetOnlyPremises(
      str(formData, "premisesAddress") || existing.premisesAddress,
      {
        city: str(formData, "premisesCity") || existing.premisesCity,
        state: str(formData, "premisesState") || existing.premisesState,
        zip: str(formData, "premisesZip") || existing.premisesZip,
      },
    ) || existing.premisesAddress,
    premisesCity: str(formData, "premisesCity") || existing.premisesCity,
    premisesState: str(formData, "premisesState") || existing.premisesState,
    premisesZip: str(formData, "premisesZip") || existing.premisesZip,
  };

  await db
    .update(policies)
    .set({
      ...next,
      updatedAt: new Date(),
    })
    .where(eq(policies.id, id));

  const shownFamily = insuranceFamilyFromPolicy(existing);
  await recordPolicyFieldChanges({
    policyId: id,
    before: withHistoryDefaults(existing, {
      insuranceType: shownFamily,
      commissionFamily:
        existing.commissionFamily ||
        commissionFamilyFromInsurance(shownFamily, existing.policySubType) ||
        inferLineFamily(existing.lineOfBusiness, existing.commissionFamily, existing.policySubType),
      insuredCount: existing.insuredCount ?? 1,
      billingFrequency: existing.billingFrequency || "annual",
      policyTerm: existing.policyTerm || defaultTermForFamily(shownFamily),
    }),
    after: { ...existing, ...next },
    source: "record_edit",
  });

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
  scheduleContactCoverageNotices(existing.contactId);
  flashAction(`/policies/${id}`, "policy-saved");
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
  const asOf = deskNow();
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


/** Fields agents/admins may inline-edit on Overview (commission % is locked for everyone). */
const POLICY_INLINE_KEYS = new Set([
  "policyNumber",
  "status",
  "lineOfBusiness",
  "policyType",
  "policySubType",
  "insuranceType",
  "premium",
  "billingFrequency",
  "producer",
  "sellingAgency",
  "formType",
  "premisesAddress",
  "premisesCity",
  "premisesState",
  "premisesZip",
  "faceAmount",
  "policyTerm",
  "carrierId",
]);

/** Term dates are agency-only via correctPolicyTermDates (reason + audit). */
const TERM_DATE_INLINE_KEYS = new Set([
  "effectiveDate",
  "expirationDate",
  "renewalDate",
]);

const LOCKED_COMPUTED_KEYS = new Set(["commission4Pct", "labelOverride"]);

function parsePolicyDateInput(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(`${t}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Click-to-edit blur-save for policy detail fields. Admin-only; agents get read-only Overview. */
export async function updatePolicyField(input: {
  policyId: string;
  fieldKey: string;
  value: string;
  /** Required true for sensitive fields after UI confirm dialog. */
  confirmed?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string; needsConfirm?: boolean }> {
  const session = await currentDeskSession();
  if (!session.isAdmin) {
    return { ok: false, error: "Only admins can edit policy fields." };
  }

  const id = input.policyId?.trim();
  const fieldKey = input.fieldKey?.trim();
  if (!id || !fieldKey) {
    return { ok: false, error: "Unknown field." };
  }
  if (LOCKED_COMPUTED_KEYS.has(fieldKey)) {
    return { ok: false, error: "That field is locked." };
  }
  if (TERM_DATE_INLINE_KEYS.has(fieldKey)) {
    return {
      ok: false,
      error: "Term dates are locked. Use Correct term dates (agency) with a reason.",
    };
  }
  if (!POLICY_INLINE_KEYS.has(fieldKey)) {
    return { ok: false, error: "Unknown field." };
  }

  if (isPolicySensitiveInlineKey(fieldKey) && !input.confirmed) {
    return {
      ok: false,
      needsConfirm: true,
      error: sensitiveFieldConfirmCopy(fieldKey),
    };
  }

  const [existing] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, id)));
  if (!existing) return { ok: false, error: "Policy not found." };

  const raw = (input.value ?? "").trim();
  let patch: Record<string, unknown> = {};
  if (fieldKey === "carrierId") {
    patch = { carrierId: raw || null };
  } else if (fieldKey === "premium" || fieldKey === "faceAmount") {
    patch = { [fieldKey]: raw === "" ? null : raw };
  } else if (
    fieldKey === "effectiveDate" ||
    fieldKey === "expirationDate" ||
    fieldKey === "renewalDate"
  ) {
    if (fieldKey === "renewalDate" && raw === "") {
      patch = { renewalDate: null };
    } else {
      const d = parsePolicyDateInput(raw);
      if (!d && fieldKey !== "renewalDate") {
        return { ok: false, error: "Enter a valid date (YYYY-MM-DD)." };
      }
      if (!d && fieldKey === "renewalDate") {
        patch = { renewalDate: null };
      } else {
        patch = { [fieldKey]: d };
      }
    }
  } else if (fieldKey === "premisesAddress") {
    const parts = splitPremisesAddress(raw, {
      city: existing.premisesCity,
      state: existing.premisesState,
      zip: existing.premisesZip,
    });
    patch = {
      premisesAddress: parts.street || null,
      premisesCity: parts.city || existing.premisesCity,
      premisesState: parts.state || existing.premisesState,
      premisesZip: parts.zip || existing.premisesZip,
    };
  } else if (fieldKey === "lineOfBusiness") {
    patch = { lineOfBusiness: await requireStoredLobCode(raw, existing.lineOfBusiness) };
  } else {
    patch = { [fieldKey]: raw || null };
  }

  await db
    .update(policies)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(policies.id, id));

  await recordPolicyFieldChanges({
    policyId: id,
    before: withHistoryDefaults(existing as unknown as Record<string, unknown>, {}),
    after: { ...(existing as unknown as Record<string, unknown>), ...patch },
    source: "record_edit",
  });

  if (fieldKey === "effectiveDate" || fieldKey === "expirationDate" || fieldKey === "renewalDate") {
    await syncPolicyDateAutomations(id);
  }

  revalidatePath(`/policies/${id}`);
  revalidatePath("/policies");
  return { ok: true };
}

/** Admin-only manual display-name override. Empty clears override (back to auto-label). Logs Activity. */
export async function updatePolicyLabelOverride(input: {
  policyId: string;
  labelOverride: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!session.isAdmin) {
    return { ok: false, error: "Only admins can rename policies." };
  }
  const id = input.policyId?.trim();
  if (!id) return { ok: false, error: "Policy not found." };

  const [existing] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, id)));
  if (!existing) return { ok: false, error: "Policy not found." };

  const next = (input.labelOverride ?? "").trim() || null;
  // Setting a new override requires the Settings toggle; clearing is always allowed for admins.
  if (next) {
    const allowed = await getAllowPolicyLabelOverride();
    if (!allowed) {
      return {
        ok: false,
        error: "Manual label overrides are locked. Enable them in Settings → Policy labels.",
      };
    }
  }
  const before = (existing as { labelOverride?: string | null }).labelOverride ?? null;
  if ((before ?? "") === (next ?? "")) {
    return { ok: true };
  }

  await db
    .update(policies)
    .set({ labelOverride: next, updatedAt: new Date() })
    .where(eq(policies.id, id));

  await recordPolicyFieldChanges({
    policyId: id,
    before: withHistoryDefaults(existing as unknown as Record<string, unknown>, {}),
    after: {
      ...(existing as unknown as Record<string, unknown>),
      labelOverride: next,
    },
    source: "record_edit",
  });

  await db.insert(clientHistory).values({
    tenantId: DEFAULT_TENANT_ID,
    contactId: existing.contactId,
    accountId: existing.accountId,
    dealId: existing.dealId,
    policyId: id,
    eventType: "policy_label_override",
    body: next
      ? `Display name overridden to "${next}" (was auto-label${before ? `: "${before}"` : ""}).`
      : `Display name override cleared${before ? ` (was "${before}")` : ""}; auto-label restored.`,
    occurredAt: new Date(),
  });

  revalidatePath(`/policies/${id}`);
  revalidatePath("/policies");
  return { ok: true };
}

/** Agent-safe carrier name lookup for policy carrier field (not merge). */
export async function searchCarriersForPolicyLink(
  q: string,
): Promise<{ id: string; name: string }[]> {
  const needle = q.trim().toLowerCase();
  if (needle.length < 1) return [];
  const rows = await db
    .select({ id: carriers.id, name: carriers.name })
    .from(carriers)
    .where(
      and(
        eq(carriers.tenantId, DEFAULT_TENANT_ID),
        sql`lower(${carriers.name}) like ${"%" + needle + "%"}`,
      ),
    )
    .limit(12);
  return rows;
}

/** Agency (admin/owner) corrects book term dates with mandatory reason + full audit. */
export async function correctPolicyTermDates(input: {
  policyId: string;
  effectiveDate: string;
  expirationDate: string;
  renewalDate: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!session.isAdmin) {
    return { ok: false, error: "Only agency admins can correct term dates." };
  }

  const id = input.policyId?.trim();
  if (!id) return { ok: false, error: "Policy not found." };

  const [existing] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, id)));
  if (!existing) return { ok: false, error: "Policy not found." };

  const built = buildTermOverridePatch(
    {
      effectiveDate: input.effectiveDate ?? "",
      expirationDate: input.expirationDate ?? "",
      renewalDate: input.renewalDate ?? "",
      reason: input.reason ?? "",
    },
    existing,
  );
  if (!built.ok) return { ok: false, error: built.error };
  if (!built.changed) {
    return { ok: false, error: "No date changes to save." };
  }

  const { patch, meta } = built;
  await db
    .update(policies)
    .set({
      effectiveDate: patch.effectiveDate,
      expirationDate: patch.expirationDate,
      renewalDate: patch.renewalDate,
      updatedAt: new Date(),
    })
    .where(eq(policies.id, id));

  const before = withHistoryDefaults(existing as unknown as Record<string, unknown>, {});
  const after = {
    ...before,
    effectiveDate: patch.effectiveDate,
    expirationDate: patch.expirationDate,
    renewalDate: patch.renewalDate,
    termOverrideReason: meta.reason,
  };
  await recordPolicyFieldChanges({
    policyId: id,
    before,
    after,
    source: "term_override",
  });

  await writeEoAuditSafe({
    action: "policy_change",
    summary: termOverrideSummary(meta, existing.policyNumber),
    actorId: session.userId,
    actorName: session.name,
    entityType: "policy",
    entityId: id,
    contactId: existing.contactId,
    accountId: existing.accountId,
    policyId: id,
    dealId: existing.dealId,
    meta,
  });

  await syncPolicyDateAutomations(id);
  revalidatePath(`/policies/${id}`);
  revalidatePath("/policies");
  revalidatePath("/renewals");
  revalidatePath("/tasks");
  scheduleContactCoverageNotices(existing.contactId);
  return { ok: true };
}

