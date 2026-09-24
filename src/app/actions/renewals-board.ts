"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import {
  activities,
  activityLogs,
  alerts,
  emailTemplates,
  policies,
  policyTerms,
  renewalQueue,
} from "@/lib/db/schema";
import {
  normalizeRenewalQueueStage,
} from "@/lib/domain-ams";
import { renewalQueueLine } from "@/lib/ams/renewal-queue";
import { sendDeskEmail } from "@/app/actions/comms";
import { createDeal } from "@/app/actions/crm";
import type { HomeLineKey } from "@/lib/home/lines";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshBoard(policyId?: string | null) {
  revalidatePath("/renewals");
  revalidatePath("/renewals/queue");
  revalidatePath("/deals");
  revalidatePath("/tasks");
  if (policyId) revalidatePath(`/policies/${policyId}`);
}

/** Drag-and-drop stage set (deals-style). Does not bind. */
export async function moveRenewalBoardCard(input: {
  queueId: string;
  stageSlug: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, error: "Sign in required." };
  if (!session.isAdmin) {
    const { getAgentPolicyAccess } = await import("@/lib/policy/agent-policy-access-prefs");
    const { resolvePolicyViewerAccess } = await import("@/lib/policy/agent-policy-access");
    const viewer = resolvePolicyViewerAccess(false, await getAgentPolicyAccess());
    if (!viewer.renewalPipelineDrag.write) {
      return { ok: false, error: "Renewal drag is off for agents. Ask an admin to enable write." };
    }
  }
  if (!isUuid(input.queueId)) return { ok: false, error: "Queue row required." };
  const known = normalizeRenewalQueueStage(input.stageSlug);
  let nextStage: string;
  if (known) {
    nextStage = known;
  } else {
    const { getRenewalsPipeline } = await import("@/lib/wire/ensure-pipelines");
    const board = await getRenewalsPipeline();
    const custom = board?.stages.find((row) => row.slug === input.stageSlug);
    if (!custom) return { ok: false, error: "Unknown renewals stage." };
    nextStage = custom.slug;
  }
  const [row] = await db
    .select()
    .from(renewalQueue)
    .where(and(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID), eq(renewalQueue.id, input.queueId)));
  if (!row) return { ok: false, error: "Renewal card not found." };
  await db
    .update(renewalQueue)
    .set({ stage: nextStage, updatedAt: new Date() })
    .where(eq(renewalQueue.id, row.id));
  const [policy] = await db
    .select({ policyNumber: policies.policyNumber })
    .from(policies)
    .where(eq(policies.id, row.policyId));
  void renewalQueueLine(policy?.policyNumber ?? "policy", nextStage);
  refreshBoard(row.policyId);
  return { ok: true };
}

export async function createRenewalCrossSellReminder(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const policyId = str(formData, "policyId");
  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  const line = str(formData, "line") || "coverage";
  const dueRaw = str(formData, "dueAt");
  const dueAt = dueRaw ? new Date(`${dueRaw}T12:00:00.000Z`) : null;
  if (!isUuid(policyId)) throw new Error("Policy required.");
  const title = `Cross-sell reminder · ${line} · policy follow-up`;
  const [activity] = await db
    .insert(activities)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "task",
      title,
      notes: `Set from renewals cross-sell. Suggested line: ${line}. Nothing emailed.`,
      status: "open",
      dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
      startAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
      assignee: session.userId,
      policyId,
      contactId: isUuid(contactId) ? contactId : null,
      accountId: isUuid(accountId) ? accountId : null,
    })
    .returning();
  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity.id,
    kind: "task",
    eventType: "created",
    body: title,
    policyId,
    contactId: isUuid(contactId) ? contactId : null,
    accountId: isUuid(accountId) ? accountId : null,
  });
  if (dueAt && !Number.isNaN(dueAt.getTime())) {
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "task_reminder",
      title,
      body: "In-app cross-sell reminder from renewals. Nothing emailed.",
      severity: "info",
      entityType: "activity",
      entityId: activity.id,
      userId: session.userId,
      recipientUserId: session.userId,
      createdAt: dueAt.getTime() > Date.now() ? dueAt : new Date(),
    });
  }
  refreshBoard(policyId);
  revalidatePath("/alerts");
  redirect("/renewals?notice=reminder_set");
}

export async function queueRenewalCrossSellTemplate(formData: FormData) {
  const policyId = str(formData, "policyId");
  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  const templateId = str(formData, "templateId");
  const email = str(formData, "email");
  const schedule = str(formData, "schedule") || "tomorrow";
  const customDate = str(formData, "customDate");
  if (!templateId) {
    redirect("/renewals?error=" + encodeURIComponent("Pick an email template."));
  }
  let dueAt: Date;
  if (schedule === "custom" && customDate) {
    dueAt = new Date(`${customDate}T12:00:00.000Z`);
  } else {
    dueAt = new Date();
    dueAt.setUTCDate(dueAt.getUTCDate() + 1);
  }
  const fd = new FormData();
  fd.set("templateId", templateId);
  fd.set("policyId", policyId);
  if (contactId) fd.set("contactId", contactId);
  if (accountId) fd.set("accountId", accountId);
  if (email) fd.set("toAddress", email);
  fd.set("dueAt", dueAt.toISOString());
  fd.set("subject", "");
  fd.set("body", "");
  // Confirm template exists so we can give an honest empty-state message.
  const [tpl] = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(and(eq(emailTemplates.tenantId, DEFAULT_TENANT_ID), eq(emailTemplates.id, templateId)));
  if (!tpl) {
    redirect(
      "/renewals?error=" +
        encodeURIComponent("Template not found. Add one under Settings → Email templates."),
    );
  }
  await sendDeskEmail(fd);
  refreshBoard(policyId);
  redirect("/renewals?notice=template_queued");
}

export async function createRenewalCrossSellDeal(formData: FormData) {
  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  const line = str(formData, "line") as HomeLineKey | string;
  const clientName = str(formData, "clientName");
  const fd = new FormData();
  if (isUuid(contactId)) fd.set("contactId", contactId);
  if (isUuid(accountId)) fd.set("accountId", accountId);
  if (clientName) fd.set("dealName", clientName);
  const lob =
    line === "HO"
      ? "HO3"
      : line === "AUTO"
        ? "AUTO"
        : line === "FLOOD"
          ? "FLOOD"
          : line || "HO3";
  fd.set("line", lob);
  fd.set("source", "cross-sell");
  // createDeal redirects to the new deal
  await createDeal(fd);
}

/** Client staying — leave active chase, land in quiet Handled filter (not archive). */
export async function markClientStaying(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const policyId = str(formData, "policyId");
  if (!isUuid(policyId)) throw new Error("Policy required.");

  const [policy] = await db
    .select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      status: policies.status,
      lineOfBusiness: policies.lineOfBusiness,
      effectiveDate: policies.effectiveDate,
      expirationDate: policies.expirationDate,
      renewalDate: policies.renewalDate,
      premium: policies.premium,
    })
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) throw new Error("Policy not found.");

  const terms = await db
    .select({
      id: policyTerms.id,
      role: policyTerms.role,
      effective: policyTerms.termEffective,
      expiration: policyTerms.termExpiration,
      premium: policyTerms.premium,
    })
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.policyId, policyId)));

  const {
    RENEWAL_HANDLED_STAGE,
    RENEWAL_HANDLED_EVENT,
    RENEWAL_HANDLED_CLEAR_KINDS,
    assertClientStayingAvailable,
  } = await import("@/lib/renewal/handled");
  const { deskNow } = await import("@/lib/home/as-of");
  const { resolveCurrentTerm } = await import("@/lib/policies/current-term");
  const resolved = resolveCurrentTerm({ ...policy, terms }, deskNow());
  assertClientStayingAvailable(resolved.renewalAnchor ?? policy.renewalDate, deskNow());

  const [existing] = await db
    .select()
    .from(renewalQueue)
    .where(and(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID), eq(renewalQueue.policyId, policyId)));

  if (existing) {
    if (existing.stage !== RENEWAL_HANDLED_STAGE) {
      await db
        .update(renewalQueue)
        .set({ stage: RENEWAL_HANDLED_STAGE, updatedAt: new Date() })
        .where(eq(renewalQueue.id, existing.id));
    }
  } else {
    await db.insert(renewalQueue).values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      stage: RENEWAL_HANDLED_STAGE,
    });
  }

  await db
    .update(alerts)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.entityType, "policy"),
        eq(alerts.entityId, policyId),
        inArray(alerts.kind, [...RENEWAL_HANDLED_CLEAR_KINDS]),
      ),
    );

  await db.insert(activities).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "note",
    title: "Client staying",
    notes:
      "Renewal handled. Policy stays live; Work-lane chase cleared. Day-of term start will flip document roles and leave Handled.",
    status: "completed",
    policyId,
    assignee: session.userId,
    outcome: RENEWAL_HANDLED_EVENT,
  });

  // When a Current-term DEC is already on the policy, advance book dates + term history
  // so Policies → Current shows days left (not the expired prior term).
  const { advancePolicyCurrentTerm } = await import("@/lib/policy/advance-current-term-apply");
  await advancePolicyCurrentTerm({
    policyId,
    requireCurrentDec: true,
    trigger: "client_staying",
    actorName: session.name,
  });
  const { syncPolicyDateAutomations } = await import("@/app/actions/policy-record");
  await syncPolicyDateAutomations(policyId);

  void renewalQueueLine(policy.policyNumber ?? "policy", RENEWAL_HANDLED_STAGE);
  refreshBoard(policyId);
  revalidatePath("/notifications");
  revalidatePath("/");
  revalidatePath("/policies");
}
