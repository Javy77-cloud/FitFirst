"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { flashAction } from "@/lib/flash-action";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import {
  activities,
  activityLogs,
  alerts,
  carrierDownloadConnections,
  certificateHolderContacts,
  certificateRequests,
  issuedCertificates,
  endorsementDrafts,
  policyAdditionalInterests,
  policyServiceRequestEvents,
  policyInspections,
  policyInstallments,
  policyNotices,
  policyServiceRequests,
  policyServicingChecks,
  renewalQueue,
  reviewTasks,
  tenants,
} from "@/lib/db/schema";
import { getAccountWorkspace } from "@/lib/db/queries";
import { filePolicyChange } from "@/lib/policy/service";
import { parseIsoDate } from "@/lib/policy/workflow";
import {
  applyServiceRequestAction,
  serviceKindLabel,
  serviceRequestTaskKind,
  serviceRequestTaskTitle,
  validateServiceRequestFields,
  workFlagForKind,
  workStatusForKind,
  type ServiceRequestAction,
} from "@/lib/ams/service-requests";
import {
  allowedInterestKinds,
  canHoldInterests,
  validateInterestDraft,
} from "@/lib/ams/additional-interests";
import { additionalInsuredFromInterest } from "@/lib/ams/coi-requests";
import { parseCertificateFlags } from "@/lib/ams/certificate-holders";
import { nextNoticeStatus, noticeKindLine, validateNoticeDraft } from "@/lib/ams/notices";
import {
  endorsementDraftLine,
  nextEndorsementDraftStatus,
  validateEndorsementDraft,
  type EndorsementDraftAction,
} from "@/lib/ams/endorsement-drafts";
import {
  isServicingCheckKey,
  isWorkDesk,
  SERVICING_DOC_KEYS,
  servicingTaskKind,
  type ServicingCheckKey,
  type ServicingDocKey,
} from "@/lib/domain-ams";
import { packetTaskTitle } from "@/lib/ams/packet-tasks";
import { servicingTaskBody, servicingTaskTitle } from "@/lib/ams/checklist";
import { ensureWorkItem, setWorkStatus, toggleWorkFlag } from "@/lib/work-queue/service";
import {
  getCertificateRequest,
  getEndorsementDraft,
  getHolderContact,
  getPolicyInspection,
  getPolicyInstallment,
  getPolicyNotice,
  getRenewalQueue,
  getRenewalQueueForPolicy,
  getServiceRequest,
  loadPolicyServicing,
} from "@/lib/ams/queries";
import {
  matchingIssuedCertificate,
  nextCertificateRequestStatus,
  validateCertificateRequest,
} from "@/lib/ams/coi-requests";
import { attemptCarrierDownload } from "@/lib/ams/carrier-download";
import { buildCertificateDraft, nextCertificateNumber } from "@/lib/certificates/issue";
import { renewalFollowupBody, renewalFollowupTitle } from "@/lib/ams/renewals";
import { serviceNoteTitle, validateServiceNote } from "@/lib/ams/service-timeline";
import { validateHolderContact } from "@/lib/ams/holder-contacts";
import {
  nextRenewalQueueStage,
  renewalQueueLine,
  type RenewalQueueAction,
} from "@/lib/ams/renewal-queue";
import {
  inspectionLine,
  nextInspectionStatus,
  validateInspectionDraft,
  type InspectionAction,
} from "@/lib/ams/inspections";
import {
  installmentLine,
  nextInstallmentStatus,
  validateInstallmentDraft,
  type InstallmentAction,
} from "@/lib/ams/installments";
import {
  isInspectionStatus,
  isInstallmentStatus,
  isRenewalQueueStage,
} from "@/lib/domain-ams";
import type { PolicyChangeKind } from "@/lib/policy/status";
import type { CarrierDownloadProvider } from "@/lib/domain-ams";


function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function asKind(value: string): PolicyChangeKind | null {
  if (value === "endorsement" || value === "cancellation" || value === "non_renewal") {
    return value;
  }
  return null;
}

function asAction(value: string): ServiceRequestAction | null {
  if (value === "start" || value === "file" || value === "withdraw") return value;
  return null;
}

function bounce(path: string, error?: string, notice?: string): never {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (notice) params.set("notice", notice);
  redirect(params.size ? `${path}?${params.toString()}` : path);
}

async function actorName() {
  const session = await currentDeskSession();
  return {
    id: session.userId,
    name: session.name || "Desk",
    isAdmin: session.isAdmin,
  };
}

async function writeRequestEvent(input: {
  requestId: string;
  policyId: string;
  action: string;
  body: string;
  actorId?: string | null;
  actorName?: string | null;
}) {
  await db.insert(policyServiceRequestEvents).values({
    tenantId: DEFAULT_TENANT_ID,
    requestId: input.requestId,
    policyId: input.policyId,
    action: input.action,
    body: input.body,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
  });
}

async function queueServiceWork(policyId: string, kind: PolicyChangeKind, actorId: string | null) {
  await ensureWorkItem(policyId);
  await setWorkStatus(policyId, workStatusForKind(kind));
  if (actorId) {
    await toggleWorkFlag({
      policyId,
      flag: workFlagForKind(kind),
      actorId,
      on: true,
    });
  }
}

async function writeServicingLog(input: {
  title: string;
  body: string;
  eventType: string;
  policyId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  dealId?: string | null;
}) {
  const [activity] = await db
    .insert(activities)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "task",
      title: input.title,
      notes: input.body,
      status: "completed",
      contactId: input.contactId ?? null,
      accountId: input.accountId ?? null,
      policyId: input.policyId ?? null,
      dealId: input.dealId ?? null,
    })
    .returning();
  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity.id,
    kind: "task",
    eventType: input.eventType,
    body: input.body,
    contactId: input.contactId ?? null,
    accountId: input.accountId ?? null,
    policyId: input.policyId ?? null,
    dealId: input.dealId ?? null,
  });
}

function refreshPolicy(policyId: string, extras: string[] = []) {
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  revalidatePath("/service-requests");
  revalidatePath("/book-health");
  revalidatePath("/renewals");
  revalidatePath("/suspense");
  revalidatePath("/notices");
  revalidatePath("/endorsements");
  revalidatePath("/claims/diary");
  revalidatePath("/certificates");
  revalidatePath("/certificates/holders");
  revalidatePath("/service-timeline");
  revalidatePath("/renewals/queue");
  revalidatePath("/inspections");
  revalidatePath("/installments");
  revalidatePath("/");
  for (const path of extras) revalidatePath(path);
}

export async function createServiceRequest(formData: FormData) {
  const policyId = str(formData, "policyId");
  const kind = asKind(str(formData, "kind"));
  if (!isUuid(policyId) || !kind) bounce(`/policies/${policyId || ""}`, "Choose a change type.");
  const effectiveDate = parseIsoDate(str(formData, "effectiveDate"));
  const reason = str(formData, "reason");
  const summary = str(formData, "summary");
  const coverageARaw = str(formData, "coverageA");
  const coverageA = coverageARaw ? Number(coverageARaw) : null;
  const premium = str(formData, "premium") || null;
  const parsed = validateServiceRequestFields({
    kind,
    reason,
    summary,
    effectiveDate,
    coverageA: coverageA != null && Number.isFinite(coverageA) ? coverageA : null,
    premium,
  });
  if (!parsed.ok) bounce(`/policies/${policyId}`, parsed.error);
  if (!effectiveDate) bounce(`/policies/${policyId}`, "A valid effective date is required.");
  const actor = await actorName();
  const [row] = await db
    .insert(policyServiceRequests)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      kind,
      status: "requested",
      reason,
      summary: summary || null,
      effectiveDate,
      coverageA: coverageA != null && Number.isFinite(coverageA) ? coverageA : null,
      premium,
      requestedBy: actor.id,
      requestedByName: actor.name,
      workDesk: isWorkDesk(str(formData, "workDesk")) ? str(formData, "workDesk") : "csr",
    })
    .returning();
  const loaded = await getServiceRequest(row.id);
  const due = new Date(effectiveDate);
  await db.insert(reviewTasks).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    contactId: loaded?.policy.contactId ?? null,
    accountId: loaded?.policy.accountId ?? null,
    dealId: loaded?.policy.dealId ?? null,
    kind: serviceRequestTaskKind(),
    title: serviceRequestTaskTitle(kind, loaded?.policy.policyNumber ?? policyId),
    dueDate: due,
    status: "open",
  });
  const body = `${serviceKindLabel(kind)} requested on this Policy. Status: requested. In-app task opened. Not filed yet. Filing is manual — policies stay in force until you file.`;
  await writeServicingLog({
    title: `${serviceKindLabel(kind)} requested`,
    body,
    eventType: "service_requested",
    policyId,
    contactId: loaded?.policy.contactId,
    accountId: loaded?.policy.accountId,
    dealId: loaded?.policy.dealId,
  });
  await writeRequestEvent({
    requestId: row.id,
    policyId,
    action: "requested",
    body,
    actorId: actor.id,
    actorName: actor.name,
  });
  await queueServiceWork(policyId, kind, actor.id);
  refreshPolicy(policyId, ["/tasks", "/work-queue"]);
  bounce(`/policies/${policyId}`, undefined, "requested");
}

export async function advanceServiceRequest(formData: FormData) {
  const requestId = str(formData, "requestId");
  const action = asAction(str(formData, "action"));
  const loaded = await getServiceRequest(requestId);
  if (!loaded || !action) {
    bounce("/service-requests", "Service request not found.");
  }
  const drafted = applyServiceRequestAction(
    {
      id: loaded.request.id,
      policyId: loaded.policy.id,
      kind: loaded.request.kind as PolicyChangeKind,
      status: loaded.request.status as "requested" | "in_progress" | "filed" | "withdrawn",
      reason: loaded.request.reason,
      summary: loaded.request.summary,
      effectiveDate: loaded.request.effectiveDate,
      coverageA: loaded.request.coverageA,
      premium: loaded.request.premium,
    },
    {
      id: loaded.policy.id,
      status: loaded.policy.status,
      coverageA: loaded.policy.coverageA,
      premium: loaded.policy.premium,
      endedAt: loaded.policy.endedAt,
      endReason: loaded.policy.endReason,
    },
    action,
  );
  if (!drafted.ok) bounce(`/policies/${loaded.policy.id}`, drafted.error);

  let filedEventId = loaded.request.filedEventId;
  let filedAt = loaded.request.filedAt;
  if (action === "file") {
    const filed = await filePolicyChange({
      policyId: loaded.policy.id,
      kind: loaded.request.kind as PolicyChangeKind,
      effectiveDate: loaded.request.effectiveDate.toISOString().slice(0, 10),
      reason: loaded.request.reason,
      summary: loaded.request.summary ?? undefined,
      coverageA: loaded.request.coverageA != null ? String(loaded.request.coverageA) : undefined,
      premium: loaded.request.premium ?? undefined,
      attachDeskCopy: true,
    });
    if (!filed.ok) bounce(`/policies/${loaded.policy.id}`, filed.error);
    filedEventId = filed.eventId;
    filedAt = new Date();
  }

  await db
    .update(policyServiceRequests)
    .set({
      status: drafted.status,
      filedEventId,
      filedAt,
      updatedAt: new Date(),
    })
    .where(eq(policyServiceRequests.id, loaded.request.id));

  if (action === "file" || action === "withdraw") {
    await db
      .update(reviewTasks)
      .set({ status: "done", completedAt: new Date() })
      .where(
        and(
          eq(reviewTasks.tenantId, DEFAULT_TENANT_ID),
          eq(reviewTasks.policyId, loaded.policy.id),
          eq(reviewTasks.kind, serviceRequestTaskKind()),
          eq(reviewTasks.status, "open"),
        ),
      );
  }

  const actor = await actorName();
  const body =
    action === "file"
      ? `${serviceKindLabel(loaded.request.kind)} filed. Policy ${loaded.policy.policyNumber} is now ${drafted.policy.status}.`
      : `${serviceKindLabel(loaded.request.kind)} moved to ${drafted.status.replaceAll("_", " ")}.`;
  await writeServicingLog({
    title: `${serviceKindLabel(loaded.request.kind)} ${drafted.status.replaceAll("_", " ")}`,
    body,
    eventType: `service_${action}`,
    policyId: loaded.policy.id,
    contactId: loaded.policy.contactId,
    accountId: loaded.policy.accountId,
    dealId: loaded.policy.dealId,
  });
  await writeRequestEvent({
    requestId: loaded.request.id,
    policyId: loaded.policy.id,
    action: action === "start" ? "started" : action === "file" ? "filed" : "withdrawn",
    body,
    actorId: actor.id,
    actorName: actor.name,
  });
  if (action === "file" || action === "withdraw") {
    await setWorkStatus(loaded.policy.id, "ready");
    if (actor.id) {
      await toggleWorkFlag({
        policyId: loaded.policy.id,
        flag: workFlagForKind(loaded.request.kind as PolicyChangeKind),
        actorId: actor.id,
        on: false,
      });
    }
  }

  refreshPolicy(loaded.policy.id, [
    "/work-queue",
    "/tasks",
    ...(loaded.policy.contactId ? [`/contacts/${loaded.policy.contactId}`] : []),
  ]);
  bounce(`/policies/${loaded.policy.id}`, undefined, drafted.status);
}

export async function createCertificateRequest(formData: FormData) {
  const accountId = str(formData, "accountId") || str(formData, "businessId");
  const parsed = validateCertificateRequest({
    holderName: str(formData, "holderName"),
    holderAddress: str(formData, "holderAddress"),
    jobLocation: str(formData, "jobLocation"),
    additionalInsured: str(formData, "additionalInsured"),
    specialWording: str(formData, "specialWording"),
  });
  const flags = parseCertificateFlags({
    waiverOfSubrogation: str(formData, "waiverOfSubrogation"),
    primaryNoncontributory: str(formData, "primaryNoncontributory"),
  });
  const returnTo = str(formData, "returnTo") || `/accounts/${accountId}`;
  if (!isUuid(accountId)) bounce("/certificates", "Business is required.");
  if (!parsed.ok) bounce(returnTo, parsed.error);
  const actor = await actorName();
  const policyId = isUuid(str(formData, "policyId")) ? str(formData, "policyId") : null;
  let interestId = isUuid(str(formData, "interestId")) ? str(formData, "interestId") : null;
  const holderContactId = isUuid(str(formData, "holderContactId"))
    ? str(formData, "holderContactId")
    : null;
  if (holderContactId) {
    const loadedHolder = await getHolderContact(holderContactId);
    if (!loadedHolder || loadedHolder.contact.status !== "active") {
      bounce(returnTo, "That holder contact is not on file.");
    }
  }
  let additionalInsured = parsed.additionalInsured;
  if (interestId) {
    const [interest] = await db
      .select()
      .from(policyAdditionalInterests)
      .where(
        and(
          eq(policyAdditionalInterests.tenantId, DEFAULT_TENANT_ID),
          eq(policyAdditionalInterests.id, interestId),
        ),
      );
    if (!interest) {
      bounce(returnTo, "That additional interest is not on file.");
    }
    additionalInsured =
      additionalInsured || additionalInsuredFromInterest(interest);
  } else if (str(formData, "addAsAi") === "1" && policyId) {
    const { getPolicyWorkspace } = await import("@/lib/db/queries");
    const workspace = await getPolicyWorkspace(policyId);
    if (workspace && canHoldInterests(workspace.policy)) {
      const kinds = allowedInterestKinds(workspace.policy);
      const kind = kinds.includes("certificate_holder")
        ? "certificate_holder"
        : kinds[0] ?? "additional_interest";
      const [created] = await db
        .insert(policyAdditionalInterests)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          policyId,
          kind,
          name: parsed.holderName,
          address: parsed.holderAddress,
          notes: "Added from COI request. Does not file an endorsement.",
        })
        .returning();
      interestId = created.id;
      additionalInsured = additionalInsured || created.name;
    }
  }
  await db.insert(certificateRequests).values({
    tenantId: DEFAULT_TENANT_ID,
    accountId,
    policyId,
    holderName: parsed.holderName,
    holderAddress: parsed.holderAddress,
    jobLocation: parsed.jobLocation,
    notes: str(formData, "notes") || null,
    status: "requested",
    requestedBy: actor.id,
    requestedByName: actor.name,
    interestId,
    additionalInsured,
    specialWording: parsed.specialWording,
    waiverOfSubrogation: flags.waiverOfSubrogation,
    primaryNoncontributory: flags.primaryNoncontributory,
    holderContactId,
  });
  await writeServicingLog({
    title: `COI requested · ${parsed.holderName}`,
    body: additionalInsured
      ? `Certificate stub requested for ${parsed.holderName}. Additional insured: ${additionalInsured}. Not a licensed ACORD product. Not issued yet.`
      : `Certificate stub requested for ${parsed.holderName}. Not a licensed ACORD product. Not issued yet.`,
    eventType: "coi_requested",
    accountId,
    policyId,
  });
  revalidatePath("/certificates");
  revalidatePath("/certificates/holders");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath(`/businesses/${accountId}`);
  revalidatePath("/book-health");
  bounce(returnTo.includes("/certificates") ? "/certificates" : `/accounts/${accountId}`, undefined, "coi_requested");
}

export async function advanceCertificateRequest(formData: FormData) {
  const requestId = str(formData, "requestId");
  const action = str(formData, "action") === "withdraw" ? "withdraw" : "issue";
  const loaded = await getCertificateRequest(requestId);
  if (!loaded) bounce("/certificates", "Certificate request not found.");
  const next = nextCertificateRequestStatus(
    loaded.request.status as "requested" | "issued" | "withdrawn",
    action,
  );
  if (!next) bounce("/certificates", `Cannot ${action} a ${loaded.request.status} request.`);

  if (action === "withdraw") {
    await db
      .update(certificateRequests)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(eq(certificateRequests.id, loaded.request.id));
    revalidatePath("/certificates");
    bounce("/certificates", undefined, "withdrawn");
  }

  const workspace = await getAccountWorkspace(loaded.account.id);
  if (!workspace) bounce("/certificates", "Business not found.");
  const existing = await db
    .select()
    .from(issuedCertificates)
    .where(
      and(
        eq(issuedCertificates.tenantId, DEFAULT_TENANT_ID),
        eq(issuedCertificates.accountId, loaded.account.id),
      ),
    );
  const reused = matchingIssuedCertificate(existing, loaded.request.holderName);
  if (reused) {
    await db
      .update(certificateRequests)
      .set({
        status: "issued",
        issuedCertificateId: reused.id,
        issuedAt: reused.issuedAt,
        updatedAt: new Date(),
      })
      .where(eq(certificateRequests.id, loaded.request.id));
    revalidatePath("/certificates");
    revalidatePath(`/accounts/${loaded.account.id}`);
    bounce(`/businesses/${loaded.account.id}/certificates/${reused.id}`, undefined, "reused");
  }

  const draft = buildCertificateDraft(
    workspace.policies.map(({ policy, carrier }) => ({
      id: policy.id,
      lineOfBusiness: policy.lineOfBusiness,
      status: policy.status,
      policyNumber: policy.policyNumber,
      carrierName: carrier?.name ?? "Unknown carrier",
      effectiveDate: policy.effectiveDate,
      expirationDate: policy.expirationDate,
      coverageLimits: policy.coverageLimits,
    })),
    {
      holderName: loaded.request.holderName,
      holderAddress: loaded.request.holderAddress,
      jobLocation: loaded.request.jobLocation,
    },
  );
  if (!draft.ok) bounce("/certificates", draft.error);

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, DEFAULT_TENANT_ID));
  const issuedAt = new Date();
  const [row] = await db
    .insert(issuedCertificates)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      accountId: loaded.account.id,
      businessId: loaded.account.id,
      certificateNumber: nextCertificateNumber(existing.length, issuedAt),
      holderName: draft.draft.holderName,
      holderAddress: draft.draft.holderAddress,
      jobLocation: draft.draft.jobLocation,
      lines: draft.draft.lines,
      producerName: tenant?.name ?? "FitFirst",
      issuedAt,
      status: "issued",
      additionalInsured: loaded.request.additionalInsured,
      specialWording: loaded.request.specialWording,
      interestId: loaded.request.interestId,
      waiverOfSubrogation: loaded.request.waiverOfSubrogation,
      primaryNoncontributory: loaded.request.primaryNoncontributory,
    })
    .returning();

  await db
    .update(certificateRequests)
    .set({
      status: "issued",
      issuedCertificateId: row.id,
      issuedAt,
      updatedAt: new Date(),
    })
    .where(eq(certificateRequests.id, loaded.request.id));

  await writeServicingLog({
    title: `COI stub issued · ${row.certificateNumber}`,
    body: `Issued desk stub ${row.certificateNumber} to ${row.holderName}. Not a licensed ACORD product.`,
    eventType: "coi_issued",
    accountId: loaded.account.id,
    policyId: loaded.request.policyId,
  });

  revalidatePath("/certificates");
  revalidatePath(`/accounts/${loaded.account.id}`);
  revalidatePath(`/businesses/${loaded.account.id}`);
  bounce(`/businesses/${loaded.account.id}/certificates/${row.id}`, undefined, "issued");
}

export async function createRenewalFollowup(formData: FormData) {
  const policyId = str(formData, "policyId");
  if (!isUuid(policyId)) bounce("/renewals", "Policy is required.");
  const { loadRenewalPipeline } = await import("@/lib/ams/queries");
  const pipeline = await loadRenewalPipeline(90);
  const row = pipeline.rows.find((item) => item.id === policyId);
  if (!row) bounce("/renewals", "That policy is not in the upcoming renewal window.");
  if (row.hasFollowup) bounce("/renewals", undefined, "followup_exists");

  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce("/renewals", "Policy not found.");

  const due = workspace.policy.expirationDate;
  const title = renewalFollowupTitle(workspace.policy.policyNumber);
  const body = renewalFollowupBody({
    policyNumber: workspace.policy.policyNumber,
    partyName: row.partyName,
    daysUntil: row.daysUntil,
    currentPremium: row.currentPremium,
    proposedPremium: row.proposedPremium,
  });

  await db.insert(reviewTasks).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    kind: "renewal",
    title,
    dueDate: due,
    status: "open",
  });
  const session = await currentDeskSession();
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "renewal_followup",
    title,
    body,
    severity: row.daysUntil <= 30 ? "warning" : "info",
    entityType: "policy",
    entityId: policyId,
    userId: session.userId,
    recipientUserId: session.userId,
  });
  await writeServicingLog({
    title,
    body,
    eventType: "renewal_followup",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  revalidatePath("/renewals");
  revalidatePath("/tasks");
  revalidatePath("/alerts");
  revalidatePath(`/policies/${policyId}`);
  bounce("/renewals", undefined, "followup_created");
}

async function upsertServicingCheck(input: {
  policyId: string;
  itemKey: ServicingCheckKey;
  status: "complete" | "incomplete";
  taskId?: string | null;
  actorId?: string | null;
}) {
  const [existing] = await db
    .select()
    .from(policyServicingChecks)
    .where(
      and(
        eq(policyServicingChecks.tenantId, DEFAULT_TENANT_ID),
        eq(policyServicingChecks.policyId, input.policyId),
        eq(policyServicingChecks.itemKey, input.itemKey),
      ),
    );
  const completedAt = input.status === "complete" ? new Date() : null;
  if (existing) {
    const [row] = await db
      .update(policyServicingChecks)
      .set({
        status: input.status,
        taskId: input.taskId ?? existing.taskId,
        completedAt,
        completedBy: input.status === "complete" ? input.actorId ?? null : null,
        updatedAt: new Date(),
      })
      .where(eq(policyServicingChecks.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(policyServicingChecks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId: input.policyId,
      itemKey: input.itemKey,
      status: input.status,
      taskId: input.taskId ?? null,
      completedAt,
      completedBy: input.status === "complete" ? input.actorId ?? null : null,
    })
    .returning();
  return row;
}

export async function toggleServicingCheck(formData: FormData) {
  const policyId = str(formData, "policyId");
  const itemKey = str(formData, "itemKey");
  const nextStatus = str(formData, "status") === "complete" ? "complete" : "incomplete";
  if (!isUuid(policyId) || !isServicingCheckKey(itemKey)) {
    bounce(`/policies/${policyId || ""}`, "Unknown servicing item.");
  }
  const actor = await actorName();
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce(`/policies/${policyId}`, "Policy not found.");

  const [existing] = await db
    .select()
    .from(policyServicingChecks)
    .where(
      and(
        eq(policyServicingChecks.tenantId, DEFAULT_TENANT_ID),
        eq(policyServicingChecks.policyId, policyId),
        eq(policyServicingChecks.itemKey, itemKey),
      ),
    );

  let taskId = existing?.taskId ?? null;
  if (nextStatus === "incomplete" && !taskId) {
    const [task] = await db
      .insert(reviewTasks)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        policyId,
        contactId: workspace.policy.contactId,
        accountId: workspace.policy.accountId,
        kind: "servicing",
        title: servicingTaskTitle(itemKey, workspace.policy.policyNumber),
        dueDate: workspace.policy.expirationDate ?? new Date(),
        status: "open",
      })
      .returning();
    taskId = task.id;
    await writeServicingLog({
      title: servicingTaskTitle(itemKey, workspace.policy.policyNumber),
      body: servicingTaskBody(itemKey, workspace.policy.policyNumber),
      eventType: "servicing_task",
      policyId,
      contactId: workspace.policy.contactId,
      accountId: workspace.policy.accountId,
      dealId: workspace.policy.dealId,
    });
  }
  if (nextStatus === "complete" && taskId) {
    await db
      .update(reviewTasks)
      .set({ status: "done", completedAt: new Date() })
      .where(eq(reviewTasks.id, taskId));
  }

  await upsertServicingCheck({
    policyId,
    itemKey,
    status: nextStatus,
    taskId,
    actorId: actor.id,
  });
  refreshPolicy(policyId, ["/tasks", "/book-health"]);
  bounce(`/policies/${policyId}`, undefined, nextStatus === "complete" ? "check_complete" : "check_open");
}

export async function createServicingTask(formData: FormData) {
  const policyId = str(formData, "policyId");
  const itemKey = str(formData, "itemKey");
  if (!isUuid(policyId) || !isServicingCheckKey(itemKey)) {
    bounce(`/policies/${policyId || ""}`, "Unknown servicing item.");
  }
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce(`/policies/${policyId}`, "Policy not found.");

  const [existing] = await db
    .select()
    .from(policyServicingChecks)
    .where(
      and(
        eq(policyServicingChecks.tenantId, DEFAULT_TENANT_ID),
        eq(policyServicingChecks.policyId, policyId),
        eq(policyServicingChecks.itemKey, itemKey),
      ),
    );
  if (existing?.taskId) bounce(`/policies/${policyId}`, undefined, "task_exists");

  const [task] = await db
    .insert(reviewTasks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      contactId: workspace.policy.contactId,
      accountId: workspace.policy.accountId,
      kind: "servicing",
      title: servicingTaskTitle(itemKey, workspace.policy.policyNumber),
      dueDate: workspace.policy.expirationDate ?? new Date(),
      status: "open",
    })
    .returning();
  await upsertServicingCheck({
    policyId,
    itemKey,
    status: existing?.status === "complete" ? "complete" : "incomplete",
    taskId: task.id,
  });
  await writeServicingLog({
    title: servicingTaskTitle(itemKey, workspace.policy.policyNumber),
    body: servicingTaskBody(itemKey, workspace.policy.policyNumber),
    eventType: "servicing_task",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  refreshPolicy(policyId, ["/tasks"]);
  bounce(`/policies/${policyId}`, undefined, "task_created");
}

export async function attemptCarrierDownloadImport(formData: FormData) {
  const provider = str(formData, "provider") as CarrierDownloadProvider;
  const result = attemptCarrierDownload(provider === "al3" ? "al3" : "ivans");
  const key = provider === "al3" ? "al3" : "ivans";
  const [existing] = await db
    .select()
    .from(carrierDownloadConnections)
    .where(
      and(
        eq(carrierDownloadConnections.tenantId, DEFAULT_TENANT_ID),
        eq(carrierDownloadConnections.provider, key),
      ),
    );
  if (existing) {
    await db
      .update(carrierDownloadConnections)
      .set({
        status: result.status,
        lastAttemptAt: new Date(),
        lastError: result.reason,
        updatedAt: new Date(),
      })
      .where(eq(carrierDownloadConnections.id, existing.id));
  } else {
    await db.insert(carrierDownloadConnections).values({
      tenantId: DEFAULT_TENANT_ID,
      provider: key,
      status: result.status,
      lastAttemptAt: new Date(),
      lastError: result.reason,
      notes: "Empty importer. No carrier fees invented.",
    });
  }
  revalidatePath("/settings/carrier-download");
  revalidatePath("/ams/carrier-download");
  bounce("/settings/carrier-download", result.reason, "not_connected");
}

function asServicingDocKey(value: string): ServicingDocKey | null {
  return (SERVICING_DOC_KEYS as readonly string[]).includes(value)
    ? (value as ServicingDocKey)
    : null;
}

export async function createPacketTask(formData: FormData) {
  const policyId = str(formData, "policyId");
  const key = asServicingDocKey(str(formData, "docKey"));
  if (!isUuid(policyId) || !key) bounce(`/policies/${policyId || ""}`, "Choose a missing packet slot.");
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const [workspace, servicing] = await Promise.all([
    getPolicyWorkspace(policyId),
    loadPolicyServicing(policyId),
  ]);
  if (!workspace || !servicing) bounce(`/policies/${policyId}`, "Policy not found.");
  const missing = servicing.missingPackets;
  if (!missing.includes(key)) {
    bounce(`/policies/${policyId}`, `${key.replaceAll("_", " ")} is already on file.`);
  }
  if (servicing.packetByKey[key]) {
    bounce(`/policies/${policyId}`, undefined, "task_exists");
  }
  const title = packetTaskTitle(key, workspace.policy.policyNumber);
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 7);
  await db.insert(reviewTasks).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
    kind: servicingTaskKind(key),
    title,
    dueDate: due,
    status: "open",
  });
  await writeServicingLog({
    title,
    body: `${title}. In-app task only — shopping docs stay on the Deal.`,
    eventType: "packet_task",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  refreshPolicy(policyId, ["/tasks", "/book-health"]);
  bounce(`/policies/${policyId}`, undefined, "packet_task");
}

export async function saveAdditionalInterest(formData: FormData) {
  const policyId = str(formData, "policyId");
  if (!isUuid(policyId)) bounce("/policies", "Policy is required.");
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce(`/policies/${policyId}`, "Policy not found.");
  const kinds = allowedInterestKinds(workspace.policy);
  if (!canHoldInterests(workspace.policy) || kinds.length === 0) {
    bounce(`/policies/${policyId}`, "Additional interest is for personal-lines or certifiable commercial Policies.");
  }
  const parsed = validateInterestDraft({
    kind: str(formData, "kind"),
    name: str(formData, "name"),
    address: str(formData, "address"),
    city: str(formData, "city"),
    state: str(formData, "state"),
    zip: str(formData, "zip"),
    loanNumber: str(formData, "loanNumber"),
    clause: str(formData, "clause"),
    notes: str(formData, "notes"),
  });
  if (!parsed.ok) bounce(`/policies/${policyId}`, parsed.error);
  if (!kinds.includes(parsed.kind)) {
    bounce(`/policies/${policyId}`, "That interest type is not used on this Policy.");
  }
  const [row] = await db
    .insert(policyAdditionalInterests)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      kind: parsed.kind,
      name: parsed.name,
      address: str(formData, "address") || null,
      city: str(formData, "city") || null,
      state: str(formData, "state") || null,
      zip: str(formData, "zip") || null,
      loanNumber: str(formData, "loanNumber") || null,
      clause: str(formData, "clause") || null,
      notes: str(formData, "notes") || null,
    })
    .returning();
  await writeServicingLog({
    title: `Added ${parsed.kind.replaceAll("_", " ")}`,
    body: `${parsed.name} added on ${workspace.policy.policyNumber}. Does not file an endorsement by itself.`,
    eventType: "interest_added",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  refreshPolicy(policyId);
  flashAction(`/policies/${policyId}`, "interest-saved");
}

export async function deleteAdditionalInterest(formData: FormData) {
  const policyId = str(formData, "policyId");
  const interestId = str(formData, "interestId");
  if (!isUuid(policyId) || !isUuid(interestId)) {
    bounce(`/policies/${policyId || ""}`, "Interest not found.");
  }
  const [existing] = await db
    .select()
    .from(policyAdditionalInterests)
    .where(
      and(
        eq(policyAdditionalInterests.tenantId, DEFAULT_TENANT_ID),
        eq(policyAdditionalInterests.id, interestId),
        eq(policyAdditionalInterests.policyId, policyId),
      ),
    );
  if (!existing) bounce(`/policies/${policyId}`, "Interest not found.");
  await db.delete(policyAdditionalInterests).where(eq(policyAdditionalInterests.id, interestId));
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  await writeServicingLog({
    title: `Removed ${existing.kind.replaceAll("_", " ")}`,
    body: `${existing.name} removed from this Policy.`,
    eventType: "interest_removed",
    policyId,
    contactId: workspace?.policy.contactId,
    accountId: workspace?.policy.accountId,
    dealId: workspace?.policy.dealId,
  });
  refreshPolicy(policyId);
  bounce(`/policies/${policyId}`, undefined, "interest_removed");
}

export async function completeSuspenseTask(formData: FormData) {
  const taskId = str(formData, "taskId");
  const returnTo = str(formData, "returnTo") || "/suspense";
  if (!isUuid(taskId)) bounce(returnTo, "Suspense task not found.");
  const [task] = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, taskId)));
  if (!task || !task.policyId) bounce(returnTo, "Suspense task not found.");
  if (task.status !== "open") bounce(returnTo, undefined, "already_closed");
  await db
    .update(reviewTasks)
    .set({ status: "completed" })
    .where(eq(reviewTasks.id, task.id));
  if (task.title) {
    await db
      .update(activities)
      .set({ status: "completed", updatedAt: new Date() })
      .where(
        and(
          eq(activities.tenantId, DEFAULT_TENANT_ID),
          eq(activities.policyId, task.policyId),
          eq(activities.kind, "task"),
          eq(activities.status, "open"),
          eq(activities.title, task.title),
        ),
      );
  }
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(task.policyId);
  await writeServicingLog({
    title: `Closed suspense · ${task.title}`,
    body: `${task.title} marked collected in-app. Policy stays in force. Missing file is still a packet slot, not a cancel.`,
    eventType: "suspense_closed",
    policyId: task.policyId,
    contactId: workspace?.policy.contactId ?? task.contactId,
    accountId: workspace?.policy.accountId ?? task.accountId,
    dealId: workspace?.policy.dealId ?? task.dealId,
  });
  refreshPolicy(task.policyId, ["/suspense", "/tasks"]);
  bounce(returnTo.includes("/policies/") ? `/policies/${task.policyId}` : "/suspense", undefined, "suspense_closed");
}

export async function createPolicyNotice(formData: FormData) {
  const policyId = str(formData, "policyId");
  if (!isUuid(policyId)) bounce("/notices", "Policy is required.");
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce(`/policies/${policyId}`, "Policy not found.");
  const parsed = validateNoticeDraft({
    kind: str(formData, "kind"),
    reason: str(formData, "reason"),
    effectiveOn: parseIsoDate(str(formData, "effectiveOn")),
    notes: str(formData, "notes"),
  });
  if (!parsed.ok) bounce(`/policies/${policyId}`, parsed.error);
  await db.insert(policyNotices).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    kind: parsed.kind,
    status: "drafted",
    reason: parsed.reason,
    effectiveOn: parsed.effectiveOn,
    notes: parsed.notes,
  });
  await writeServicingLog({
    title: noticeKindLine(parsed.kind, workspace.policy.policyNumber),
    body: `${noticeKindLine(parsed.kind, workspace.policy.policyNumber)}. Draft only. Does not file or change Policy status.`,
    eventType: "notice_drafted",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  refreshPolicy(policyId, ["/notices"]);
  bounce(`/policies/${policyId}`, undefined, "notice_drafted");
}

export async function advancePolicyNotice(formData: FormData) {
  const noticeId = str(formData, "noticeId");
  const action = str(formData, "action") === "withdraw" ? "withdraw" : "mail";
  const returnTo = str(formData, "returnTo") || "/notices";
  const loaded = await getPolicyNotice(noticeId);
  if (!loaded) bounce(returnTo, "Notice not found.");
  const next = nextNoticeStatus(
    loaded.notice.status as "drafted" | "mailed" | "withdrawn",
    action,
  );
  if (!next) bounce(returnTo, `Cannot ${action} a ${loaded.notice.status} notice.`);
  await db
    .update(policyNotices)
    .set({
      status: next,
      mailedAt: next === "mailed" ? new Date() : loaded.notice.mailedAt,
      updatedAt: new Date(),
    })
    .where(eq(policyNotices.id, loaded.notice.id));
  await writeServicingLog({
    title: `${noticeKindLine(loaded.notice.kind, loaded.policy.policyNumber)} · ${next}`,
    body:
      next === "mailed"
        ? `Logged as mailed. ${loaded.policy.policyNumber} status is unchanged. File a service request if the carrier confirms.`
        : `Notice withdrawn. ${loaded.policy.policyNumber} unchanged.`,
    eventType: next === "mailed" ? "notice_mailed" : "notice_withdrawn",
    policyId: loaded.policy.id,
    contactId: loaded.policy.contactId,
    accountId: loaded.policy.accountId,
    dealId: loaded.policy.dealId,
  });
  refreshPolicy(loaded.policy.id, ["/notices"]);
  bounce(returnTo.includes("/policies/") ? `/policies/${loaded.policy.id}` : "/notices", undefined, next);
}

export async function createEndorsementDraft(formData: FormData) {
  const policyId = str(formData, "policyId");
  if (!isUuid(policyId)) bounce("/endorsements", "Policy is required.");
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce(`/policies/${policyId}`, "Policy not found.");
  const parsed = validateEndorsementDraft({
    formCode: str(formData, "formCode"),
    wording: str(formData, "wording"),
    effectiveOn: parseIsoDate(str(formData, "effectiveOn")),
    notes: str(formData, "notes"),
  });
  if (!parsed.ok) bounce(`/policies/${policyId}`, parsed.error);
  const requestId = str(formData, "serviceRequestId");
  await db.insert(endorsementDrafts).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    serviceRequestId: isUuid(requestId) ? requestId : null,
    status: "drafted",
    formCode: parsed.formCode,
    wording: parsed.wording,
    effectiveOn: parsed.effectiveOn,
    notes: parsed.notes,
  });
  await writeServicingLog({
    title: endorsementDraftLine(parsed.formCode, workspace.policy.policyNumber),
    body: `${endorsementDraftLine(parsed.formCode, workspace.policy.policyNumber)}. Draft wording only. Does not file.`,
    eventType: "endorsement_drafted",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  refreshPolicy(policyId, ["/endorsements", "/service-requests"]);
  bounce(`/policies/${policyId}`, undefined, "endorsement_drafted");
}

export async function advanceEndorsementDraft(formData: FormData) {
  const draftId = str(formData, "draftId");
  const action = (str(formData, "action") === "withdraw" ? "withdraw" : "ready") as EndorsementDraftAction;
  const returnTo = str(formData, "returnTo") || "/endorsements";
  const loaded = await getEndorsementDraft(draftId);
  if (!loaded) bounce(returnTo, "Endorsement draft not found.");
  const next = nextEndorsementDraftStatus(
    loaded.draft.status as "drafted" | "ready" | "withdrawn",
    action,
  );
  if (!next) bounce(returnTo, `Cannot ${action} a ${loaded.draft.status} draft.`);
  await db
    .update(endorsementDrafts)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(endorsementDrafts.id, loaded.draft.id));
  await writeServicingLog({
    title: `${endorsementDraftLine(loaded.draft.formCode, loaded.policy.policyNumber)} · ${next}`,
    body:
      next === "ready"
        ? `Wording marked ready. ${loaded.policy.policyNumber} is unchanged. File still happens on the service request.`
        : `Endorsement draft withdrawn. ${loaded.policy.policyNumber} unchanged.`,
    eventType: next === "ready" ? "endorsement_draft_ready" : "endorsement_draft_withdrawn",
    policyId: loaded.policy.id,
    contactId: loaded.policy.contactId,
    accountId: loaded.policy.accountId,
    dealId: loaded.policy.dealId,
  });
  refreshPolicy(loaded.policy.id, ["/endorsements", "/service-requests"]);
  bounce(
    returnTo.includes("/policies/") ? `/policies/${loaded.policy.id}` : "/endorsements",
    undefined,
    next,
  );
}

export async function addServiceNote(formData: FormData) {
  const policyId = str(formData, "policyId");
  const returnTo = str(formData, "returnTo") || (isUuid(policyId) ? `/policies/${policyId}` : "/service-timeline");
  if (!isUuid(policyId)) bounce(returnTo, "Policy is required.");
  const parsed = validateServiceNote(str(formData, "body"));
  if (!parsed.ok) bounce(returnTo, parsed.error);
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce(returnTo, "Policy not found.");
  await writeServicingLog({
    title: serviceNoteTitle(workspace.policy.policyNumber),
    body: parsed.body,
    eventType: "service_note",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  refreshPolicy(policyId, ["/service-timeline"]);
  bounce(returnTo.includes("/service-timeline") ? "/service-timeline" : `/policies/${policyId}`, undefined, "note_logged");
}

export async function saveHolderContact(formData: FormData) {
  const contactId = str(formData, "contactId");
  const accountId = isUuid(str(formData, "accountId")) ? str(formData, "accountId") : null;
  const parsed = validateHolderContact({
    name: str(formData, "name"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    address: str(formData, "address"),
    city: str(formData, "city"),
    state: str(formData, "state"),
    zip: str(formData, "zip"),
    notes: str(formData, "notes"),
  });
  if (!parsed.ok) bounce("/certificates/holders", parsed.error);
  if (contactId) {
    if (!isUuid(contactId)) bounce("/certificates/holders", "Holder contact not found.");
    const existing = await getHolderContact(contactId);
    if (!existing) bounce("/certificates/holders", "Holder contact not found.");
    await db
      .update(certificateHolderContacts)
      .set({
        accountId,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        address: parsed.address,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        notes: parsed.notes,
        updatedAt: new Date(),
      })
      .where(eq(certificateHolderContacts.id, contactId));
    await writeServicingLog({
      title: `Holder contact updated · ${parsed.name}`,
      body: `${parsed.name} contact saved. ${HOLDER_CONTACT_NOTE}`,
      eventType: "holder_contact_saved",
      accountId,
    });
    revalidatePath("/certificates/holders");
    revalidatePath("/certificates");
    revalidatePath("/book-health");
    flashAction("/certificates/holders", "holder-saved");
  }
  const [row] = await db
    .insert(certificateHolderContacts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      accountId,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
      notes: parsed.notes,
      status: "active",
    })
    .returning();
  await writeServicingLog({
    title: `Holder contact added · ${row.name}`,
    body: `${row.name} added as a certificate holder contact. ${HOLDER_CONTACT_NOTE}`,
    eventType: "holder_contact_saved",
    accountId,
  });
  revalidatePath("/certificates/holders");
  revalidatePath("/certificates");
  revalidatePath("/book-health");
  flashAction("/certificates/holders", "holder-saved");
}

export async function archiveHolderContact(formData: FormData) {
  const contactId = str(formData, "contactId");
  if (!isUuid(contactId)) bounce("/certificates/holders", "Holder contact not found.");
  const existing = await getHolderContact(contactId);
  if (!existing) bounce("/certificates/holders", "Holder contact not found.");
  await db
    .update(certificateHolderContacts)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(certificateHolderContacts.id, contactId));
  await writeServicingLog({
    title: `Holder contact archived · ${existing.contact.name}`,
    body: `${existing.contact.name} archived. Open COI requests stay. Does not issue or withdraw a stub.`,
    eventType: "holder_contact_archived",
    accountId: existing.contact.accountId,
  });
  revalidatePath("/certificates/holders");
  revalidatePath("/certificates");
  revalidatePath("/book-health");
  bounce("/certificates/holders", undefined, "holder_archived");
}

export async function enqueueRenewal(formData: FormData) {
  const policyId = str(formData, "policyId");
  if (!isUuid(policyId)) bounce("/renewals/queue", "Policy is required.");
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce("/renewals/queue", "Policy not found.");
  const existing = await getRenewalQueueForPolicy(policyId);
  if (existing) bounce("/renewals/queue", undefined, "already_queued");
  const [row] = await db
    .insert(renewalQueue)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      stage: "upcoming",
      notes: str(formData, "notes") || "Queued from the renewal list. Desk stub only.",
    })
    .returning();
  await writeServicingLog({
    title: renewalQueueLine(workspace.policy.policyNumber, row.stage),
    body: `${workspace.policy.policyNumber} added to the renewal queue as upcoming. Does not bind. No rater.`,
    eventType: "renewal_queue_moved",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  refreshPolicy(policyId, ["/renewals/queue", "/renewals"]);
  bounce("/renewals/queue", undefined, "queued");
}

export async function advanceRenewalQueue(formData: FormData) {
  const queueId = str(formData, "queueId");
  const action = asRenewalQueueAction(str(formData, "action"));
  const returnTo = str(formData, "returnTo") || "/renewals/queue";
  if (!action) bounce(returnTo, "Choose a queue action.");
  const loaded = await getRenewalQueue(queueId);
  if (!loaded) bounce(returnTo, "Renewal queue row not found.");
  if (!isRenewalQueueStage(loaded.queue.stage)) bounce(returnTo, "Queue stage is not recognized.");
  const next = nextRenewalQueueStage(loaded.queue.stage, action);
  if (!next) bounce(returnTo, `Cannot ${action} a ${loaded.queue.stage} card.`);
  await db
    .update(renewalQueue)
    .set({
      stage: next,
      notes: str(formData, "notes") || loaded.queue.notes,
      updatedAt: new Date(),
    })
    .where(eq(renewalQueue.id, loaded.queue.id));
  await writeServicingLog({
    title: renewalQueueLine(loaded.policy.policyNumber, next),
    body:
      next === "accepted"
        ? `${loaded.policy.policyNumber} marked accepted on the queue stub. Same Policy stays in force. Did not bind.`
        : next === "lost"
          ? `${loaded.policy.policyNumber} marked lost on the queue stub. Policy status unchanged.`
          : `${loaded.policy.policyNumber} moved to ${next}. Desk stub only — no rater, no bind.`,
    eventType: "renewal_queue_moved",
    policyId: loaded.policy.id,
    contactId: loaded.policy.contactId,
    accountId: loaded.policy.accountId,
    dealId: loaded.policy.dealId,
  });
  refreshPolicy(loaded.policy.id, ["/renewals/queue", "/renewals"]);
  bounce(returnTo, undefined, next);
}

export async function createPolicyInspection(formData: FormData) {
  const policyId = str(formData, "policyId");
  const returnTo = str(formData, "returnTo") || (isUuid(policyId) ? `/policies/${policyId}` : "/inspections");
  if (!isUuid(policyId)) bounce(returnTo, "Policy is required.");
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce(returnTo, "Policy not found.");
  const parsed = validateInspectionDraft({
    kind: str(formData, "kind"),
    vendor: str(formData, "vendor"),
    scheduledOn: parseIsoDate(str(formData, "scheduledOn")),
    notes: str(formData, "notes"),
  });
  if (!parsed.ok) bounce(returnTo, parsed.error);
  const status = parsed.scheduledOn ? "scheduled" : "requested";
  await db.insert(policyInspections).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    kind: parsed.kind,
    status,
    vendor: parsed.vendor,
    scheduledOn: parsed.scheduledOn,
    notes: parsed.notes,
  });
  await writeServicingLog({
    title: inspectionLine(parsed.kind, workspace.policy.policyNumber),
    body: `${inspectionLine(parsed.kind, workspace.policy.policyNumber)} ${status}. Diary only — does not file.`,
    eventType: status === "scheduled" ? "inspection_scheduled" : "inspection_requested",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  refreshPolicy(policyId, ["/inspections"]);
  bounce(returnTo.includes("/policies/") ? `/policies/${policyId}` : "/inspections", undefined, status);
}

export async function advancePolicyInspection(formData: FormData) {
  const inspectionId = str(formData, "inspectionId");
  const action = asInspectionAction(str(formData, "action"));
  const returnTo = str(formData, "returnTo") || "/inspections";
  if (!action) bounce(returnTo, "Choose an inspection action.");
  const loaded = await getPolicyInspection(inspectionId);
  if (!loaded) bounce(returnTo, "Inspection not found.");
  if (!isInspectionStatus(loaded.inspection.status)) bounce(returnTo, "Inspection status is not recognized.");
  const next = nextInspectionStatus(loaded.inspection.status, action);
  if (!next) bounce(returnTo, `Cannot ${action} a ${loaded.inspection.status} inspection.`);
  await db
    .update(policyInspections)
    .set({
      status: next,
      scheduledOn:
        next === "scheduled"
          ? parseIsoDate(str(formData, "scheduledOn")) ?? loaded.inspection.scheduledOn ?? new Date()
          : loaded.inspection.scheduledOn,
      completedAt: next === "completed" ? new Date() : loaded.inspection.completedAt,
      notes: str(formData, "notes") || loaded.inspection.notes,
      updatedAt: new Date(),
    })
    .where(eq(policyInspections.id, loaded.inspection.id));
  const eventType =
    next === "scheduled"
      ? "inspection_scheduled"
      : next === "completed"
        ? "inspection_completed"
        : "inspection_waived";
  await writeServicingLog({
    title: `${inspectionLine(loaded.inspection.kind, loaded.policy.policyNumber)} · ${next}`,
    body:
      next === "completed"
        ? `${loaded.policy.policyNumber} inspection logged complete. Does not file an endorsement.`
        : next === "waived"
          ? `${loaded.policy.policyNumber} inspection waived. Policy unchanged.`
          : `${loaded.policy.policyNumber} inspection scheduled. Diary only — does not file.`,
    eventType,
    policyId: loaded.policy.id,
    contactId: loaded.policy.contactId,
    accountId: loaded.policy.accountId,
    dealId: loaded.policy.dealId,
  });
  refreshPolicy(loaded.policy.id, ["/inspections"]);
  bounce(returnTo.includes("/policies/") ? `/policies/${loaded.policy.id}` : "/inspections", undefined, next);
}

export async function createPolicyInstallment(formData: FormData) {
  const policyId = str(formData, "policyId");
  const returnTo = str(formData, "returnTo") || (isUuid(policyId) ? `/policies/${policyId}` : "/installments");
  if (!isUuid(policyId)) bounce(returnTo, "Policy is required.");
  const { getPolicyWorkspace } = await import("@/lib/db/queries");
  const workspace = await getPolicyWorkspace(policyId);
  if (!workspace) bounce(returnTo, "Policy not found.");
  const parsed = validateInstallmentDraft({
    billType: str(formData, "billType"),
    amount: str(formData, "amount"),
    dueOn: parseIsoDate(str(formData, "dueOn")),
    notes: str(formData, "notes"),
  });
  if (!parsed.ok) bounce(returnTo, parsed.error);
  await db.insert(policyInstallments).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    billType: parsed.billType,
    status: "scheduled",
    amount: parsed.amount,
    dueOn: parsed.dueOn,
    notes: parsed.notes,
  });
  await writeServicingLog({
    title: installmentLine(workspace.policy.policyNumber, "scheduled"),
    body: `${workspace.policy.policyNumber} ${parsed.billType.replaceAll("_", " ")} installment ${parsed.amount} scheduled. Diary only — no Stripe.`,
    eventType: "installment_scheduled",
    policyId,
    contactId: workspace.policy.contactId,
    accountId: workspace.policy.accountId,
    dealId: workspace.policy.dealId,
  });
  refreshPolicy(policyId, ["/installments"]);
  bounce(returnTo.includes("/policies/") ? `/policies/${policyId}` : "/installments", undefined, "scheduled");
}

export async function advancePolicyInstallment(formData: FormData) {
  const installmentId = str(formData, "installmentId");
  const action = asInstallmentAction(str(formData, "action"));
  const returnTo = str(formData, "returnTo") || "/installments";
  if (!action) bounce(returnTo, "Choose an installment action.");
  const loaded = await getPolicyInstallment(installmentId);
  if (!loaded) bounce(returnTo, "Installment not found.");
  if (!isInstallmentStatus(loaded.installment.status)) {
    bounce(returnTo, "Installment status is not recognized.");
  }
  const next = nextInstallmentStatus(loaded.installment.status, action);
  if (!next) bounce(returnTo, `Cannot ${action} a ${loaded.installment.status} installment.`);
  await db
    .update(policyInstallments)
    .set({
      status: next,
      receivedAt: next === "received" ? new Date() : loaded.installment.receivedAt,
      notes: str(formData, "notes") || loaded.installment.notes,
      updatedAt: new Date(),
    })
    .where(eq(policyInstallments.id, loaded.installment.id));
  const eventType =
    next === "due"
      ? "installment_due"
      : next === "received"
        ? "installment_received"
        : next === "past_due"
          ? "installment_past_due"
          : "installment_waived";
  await writeServicingLog({
    title: installmentLine(loaded.policy.policyNumber, next),
    body:
      next === "received"
        ? `${loaded.policy.policyNumber} installment marked received. No money moved. Policy unchanged.`
        : next === "waived"
          ? `${loaded.policy.policyNumber} installment waived. Policy unchanged.`
          : `${loaded.policy.policyNumber} installment marked ${next.replaceAll("_", " ")}. Diary only — no Stripe.`,
    eventType,
    policyId: loaded.policy.id,
    contactId: loaded.policy.contactId,
    accountId: loaded.policy.accountId,
    dealId: loaded.policy.dealId,
  });
  refreshPolicy(loaded.policy.id, ["/installments"]);
  bounce(returnTo.includes("/policies/") ? `/policies/${loaded.policy.id}` : "/installments", undefined, next);
}

const HOLDER_CONTACT_NOTE = "Does not issue a COI and does not file an endorsement.";

function asRenewalQueueAction(value: string): RenewalQueueAction | null {
  if (value === "quote" || value === "offer" || value === "accept" || value === "lose" || value === "reset") {
    return value;
  }
  return null;
}

function asInspectionAction(value: string): InspectionAction | null {
  if (value === "schedule" || value === "complete" || value === "waive") return value;
  return null;
}

function asInstallmentAction(value: string): InstallmentAction | null {
  if (value === "mark_due" || value === "receive" || value === "mark_past_due" || value === "waive") {
    return value;
  }
  return null;
}

