"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import {
  activities,
  activityLogs,
  alerts,
  carrierDownloadConnections,
  certificateRequests,
  issuedCertificates,
  policyServiceRequests,
  reviewTasks,
  tenants,
} from "@/lib/db/schema";
import { getAccountWorkspace } from "@/lib/db/queries";
import { filePolicyChange } from "@/lib/policy/service";
import { parseIsoDate } from "@/lib/policy/workflow";
import {
  applyServiceRequestAction,
  serviceKindLabel,
  type ServiceRequestAction,
} from "@/lib/ams/service-requests";
import { getCertificateRequest, getServiceRequest } from "@/lib/ams/queries";
import {
  matchingIssuedCertificate,
  nextCertificateRequestStatus,
  validateCertificateRequest,
} from "@/lib/ams/coi-requests";
import { attemptCarrierDownload } from "@/lib/ams/carrier-download";
import { buildCertificateDraft, nextCertificateNumber } from "@/lib/certificates/issue";
import { renewalFollowupBody, renewalFollowupTitle } from "@/lib/ams/renewals";
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
  };
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
  revalidatePath("/");
  for (const path of extras) revalidatePath(path);
}

export async function createServiceRequest(formData: FormData) {
  const policyId = str(formData, "policyId");
  const kind = asKind(str(formData, "kind"));
  if (!isUuid(policyId) || !kind) bounce(`/policies/${policyId || ""}`, "Choose a change type.");
  const effectiveDate = parseIsoDate(str(formData, "effectiveDate"));
  if (!effectiveDate) bounce(`/policies/${policyId}`, "A valid effective date is required.");
  const reason = str(formData, "reason");
  if (!reason) bounce(`/policies/${policyId}`, "Reason is required.");
  const actor = await actorName();
  const coverageARaw = str(formData, "coverageA");
  const coverageA = coverageARaw ? Number(coverageARaw) : null;
  const [row] = await db
    .insert(policyServiceRequests)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      kind,
      status: "requested",
      reason,
      summary: str(formData, "summary") || null,
      effectiveDate,
      coverageA: coverageA != null && Number.isFinite(coverageA) ? coverageA : null,
      premium: str(formData, "premium") || null,
      requestedBy: actor.id,
      requestedByName: actor.name,
    })
    .returning();
  const loaded = await getServiceRequest(row.id);
  await writeServicingLog({
    title: `${serviceKindLabel(kind)} requested`,
    body: `${serviceKindLabel(kind)} requested on this Policy. Status: requested. Not filed yet.`,
    eventType: "service_requested",
    policyId,
    contactId: loaded?.policy.contactId,
    accountId: loaded?.policy.accountId,
    dealId: loaded?.policy.dealId,
  });
  refreshPolicy(policyId);
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

  await writeServicingLog({
    title: `${serviceKindLabel(loaded.request.kind)} ${drafted.status.replaceAll("_", " ")}`,
    body:
      action === "file"
        ? `${serviceKindLabel(loaded.request.kind)} filed. Policy ${loaded.policy.policyNumber} is now ${drafted.policy.status}.`
        : `${serviceKindLabel(loaded.request.kind)} moved to ${drafted.status.replaceAll("_", " ")}.`,
    eventType: `service_${action}`,
    policyId: loaded.policy.id,
    contactId: loaded.policy.contactId,
    accountId: loaded.policy.accountId,
    dealId: loaded.policy.dealId,
  });

  refreshPolicy(loaded.policy.id, loaded.policy.contactId ? [`/contacts/${loaded.policy.contactId}`] : []);
  bounce(`/policies/${loaded.policy.id}`, undefined, drafted.status);
}

export async function createCertificateRequest(formData: FormData) {
  const accountId = str(formData, "accountId") || str(formData, "businessId");
  const parsed = validateCertificateRequest({
    holderName: str(formData, "holderName"),
    holderAddress: str(formData, "holderAddress"),
    jobLocation: str(formData, "jobLocation"),
  });
  const returnTo = str(formData, "returnTo") || `/accounts/${accountId}`;
  if (!isUuid(accountId)) bounce("/certificates", "Business is required.");
  if (!parsed.ok) bounce(returnTo, parsed.error);
  const actor = await actorName();
  await db.insert(certificateRequests).values({
    tenantId: DEFAULT_TENANT_ID,
    accountId,
    policyId: isUuid(str(formData, "policyId")) ? str(formData, "policyId") : null,
    holderName: parsed.holderName,
    holderAddress: parsed.holderAddress,
    jobLocation: parsed.jobLocation,
    notes: str(formData, "notes") || null,
    status: "requested",
    requestedBy: actor.id,
    requestedByName: actor.name,
  });
  await writeServicingLog({
    title: `COI requested · ${parsed.holderName}`,
    body: `Certificate stub requested for ${parsed.holderName}. Not a licensed ACORD product. Not issued yet.`,
    eventType: "coi_requested",
    accountId,
    policyId: isUuid(str(formData, "policyId")) ? str(formData, "policyId") : null,
  });
  revalidatePath("/certificates");
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

