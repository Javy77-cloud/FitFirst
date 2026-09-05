import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import { reasonLabel } from "@/lib/policy/reasons";
import { isInForceStatus, type PolicyChangeKind } from "@/lib/policy/status";
import { parseHolderInput } from "@/lib/certificates/issue";
import { db } from "@/lib/db";
import {
  alerts,
  clientHistory,
  issuedCertificates,
  policies,
  portalRequests,
  policyWorkNotes,
  reviewTasks,
  type IssuedCertificate,
  type PortalRequest,
} from "@/lib/db/schema";
import { ensureWorkItem, setWorkStatus, toggleWorkFlag } from "@/lib/work-queue/service";
import {
  PORTAL_PING_KIND,
  PORTAL_REQUEST_KIND,
  defaultReminderDue,
} from "@/lib/work-queue/types";
import { findMatchingCertificate, type PortalSession } from "./session";
import type { CoiRequestPayload, PolicyChangePayload } from "./types";

export { PORTAL_PING_KIND, PORTAL_REQUEST_KIND };

function tenantId() {
  return DEFAULT_TENANT_ID;
}

export function formatCoiWorkNote(input: {
  partyName: string;
  policyNumber?: string | null;
  holderName: string;
  holderAddress: string;
  jobLocation: string | null;
}): string {
  return [
    "CLIENT PORTAL — COI request (no rekey)",
    "",
    `Business: ${input.partyName}`,
    input.policyNumber ? `Policy: ${input.policyNumber}` : null,
    `Holder: ${input.holderName}`,
    `Address: ${input.holderAddress}`,
    `Job / location: ${input.jobLocation || "None listed"}`,
    "",
    "Issue the certificate stub from these fields. Do not retype the holder.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function formatChangeWorkNote(input: {
  partyName: string;
  policyNumber: string;
  changeKind: PolicyChangeKind;
  reasonLabel: string;
  effectiveDate: string;
  summary: string;
}): string {
  const noun =
    input.changeKind === "endorsement"
      ? "Endorsement"
      : input.changeKind === "cancellation"
        ? "Cancellation"
        : "Non-renewal";
  return [
    "CLIENT PORTAL — policy change (no rekey)",
    "",
    `Insured: ${input.partyName}`,
    `Policy: ${input.policyNumber}`,
    `Kind: ${noun}`,
    `Reason: ${input.reasonLabel}`,
    `Effective: ${input.effectiveDate}`,
    `What they asked: ${input.summary || "—"}`,
    "",
    "Do not retype. File from this note on the existing Policy when ready.",
  ].join("\n");
}

async function attachToServiceQueue(input: {
  policyId: string;
  contactId: string | null;
  accountId: string | null;
  dealId: string | null;
  title: string;
  body: string;
  workStatus: "endorsement_pending" | "waiting_on_docs";
  flag: "endorsement_required" | "need_more_docs";
}) {
  const item = await ensureWorkItem(input.policyId);
  await setWorkStatus(input.policyId, input.workStatus);
  await toggleWorkFlag({
    policyId: input.policyId,
    flag: input.flag,
    actorId: ADMIN_USER_ID,
    on: true,
  });
  const [note] = await db
    .insert(policyWorkNotes)
    .values({
      tenantId: tenantId(),
      workItemId: item.id,
      authorId: null,
      body: input.body,
    })
    .returning();

  const dueDate = defaultReminderDue();
  const [task] = await db
    .insert(reviewTasks)
    .values({
      tenantId: tenantId(),
      contactId: input.contactId,
      accountId: input.accountId,
      policyId: input.policyId,
      dealId: input.dealId,
      kind: PORTAL_REQUEST_KIND,
      title: input.title.slice(0, 160),
      dueDate,
      status: "open",
      workItemId: item.id,
    })
    .returning();

  const [alert] = await db
    .insert(alerts)
    .values({
      tenantId: tenantId(),
      kind: PORTAL_PING_KIND,
      title: input.title.slice(0, 120),
      body: `${input.body.split("\n").slice(0, 6).join(" ")} In-desk only — no client email.`,
      severity: "warning",
      entityType: "policy",
      entityId: input.policyId,
    })
    .returning();

  await db.insert(clientHistory).values({
    tenantId: tenantId(),
    contactId: input.contactId,
    accountId: input.accountId,
    dealId: input.dealId,
    policyId: input.policyId,
    eventType: PORTAL_REQUEST_KIND,
    body: input.title,
    occurredAt: new Date(),
  });

  return { item, note, task, alert };
}

export type SubmitCoiResult =
  | {
      ok: true;
      reused: true;
      certificate: IssuedCertificate;
      request: PortalRequest;
    }
  | {
      ok: true;
      reused: false;
      request: PortalRequest;
    }
  | { ok: false; error: string };

export async function submitCoiRequest(
  session: PortalSession,
  input: { holderName: string; holderAddress: string; jobLocation?: string },
): Promise<SubmitCoiResult> {
  if (!session.account) {
    return { ok: false, error: "Certificates are issued on a Business with an in-force GL or WC policy." };
  }
  if (!session.canRequestCoi) {
    return { ok: false, error: "Issue a certificate only when the Business has an active GL or WC policy." };
  }

  const holder = parseHolderInput({
    holderName: input.holderName,
    holderAddress: input.holderAddress,
    jobLocation: input.jobLocation,
  });
  if (!holder.ok) return holder;

  const existing = findMatchingCertificate(session.certificates, holder.holderName);
  const payload: CoiRequestPayload = {
    holderName: holder.holderName,
    holderAddress: holder.holderAddress,
    jobLocation: holder.jobLocation,
    reusedCertificateId: existing?.id,
    reusedCertificateNumber: existing?.certificateNumber,
  };

  if (existing) {
    const [request] = await db
      .insert(portalRequests)
      .values({
        tenantId: tenantId(),
        tokenId: session.token.id,
        contactId: session.contact?.id ?? null,
        accountId: session.account.id,
        policyId: session.policies[0]?.policy.id ?? null,
        kind: "coi",
        status: "reused",
        summary: `Existing stub ${existing.certificateNumber} already issued to ${existing.holderName}.`,
        payload,
        reusedCertificateId: existing.id,
      })
      .returning();
    return { ok: true, reused: true, certificate: existing, request };
  }

  const certPolicy =
    session.policies.find(
      (row) => isInForceStatus(row.policy.status) && /gl|wc/i.test(row.policy.lineOfBusiness),
    ) ?? session.policies[0];
  const body = formatCoiWorkNote({
    partyName: session.partyName,
    policyNumber: certPolicy?.policy.policyNumber,
    holderName: holder.holderName,
    holderAddress: holder.holderAddress,
    jobLocation: holder.jobLocation,
  });

  let workItemId: string | null = null;
  if (certPolicy) {
    const queued = await attachToServiceQueue({
      policyId: certPolicy.policy.id,
      contactId: session.contact?.id ?? certPolicy.policy.contactId,
      accountId: session.account.id,
      dealId: certPolicy.policy.dealId,
      title: `Portal COI · ${holder.holderName}`,
      body,
      workStatus: "waiting_on_docs",
      flag: "need_more_docs",
    });
    workItemId = queued.item.id;
  }

  const [request] = await db
    .insert(portalRequests)
    .values({
      tenantId: tenantId(),
      tokenId: session.token.id,
      contactId: session.contact?.id ?? null,
      accountId: session.account.id,
      policyId: certPolicy?.policy.id ?? null,
      kind: "coi",
      status: "queued",
      summary: `COI requested for ${holder.holderName}`,
      payload,
      workItemId,
    })
    .returning();

  return { ok: true, reused: false, request };
}

export type SubmitChangeResult =
  | { ok: true; request: PortalRequest }
  | { ok: false; error: string };

export async function submitPolicyChangeRequest(
  session: PortalSession,
  input: {
    policyId: string;
    changeKind: PolicyChangeKind;
    effectiveDate: string;
    reason: string;
    summary?: string;
  },
): Promise<SubmitChangeResult> {
  const row = session.policies.find((item) => item.policy.id === input.policyId);
  if (!row) return { ok: false, error: "That policy is not on this portal link." };
  if (!isInForceStatus(row.policy.status)) {
    return { ok: false, error: "This policy is already off the book." };
  }

  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: "Reason is required." };
  const effectiveDate = input.effectiveDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
    return { ok: false, error: "A valid effective date is required." };
  }

  const labeled = reasonLabel(input.changeKind, reason);
  const summary = input.summary?.trim() || "";
  const payload: PolicyChangePayload = {
    changeKind: input.changeKind,
    effectiveDate,
    reason,
    reasonLabel: labeled,
    summary,
    policyNumber: row.policy.policyNumber,
  };
  const body = formatChangeWorkNote({
    partyName: session.partyName,
    policyNumber: row.policy.policyNumber,
    changeKind: input.changeKind,
    reasonLabel: labeled,
    effectiveDate,
    summary,
  });

  const queued = await attachToServiceQueue({
    policyId: row.policy.id,
    contactId: session.contact?.id ?? row.policy.contactId,
    accountId: session.account?.id ?? row.policy.accountId,
    dealId: row.policy.dealId,
    title: `Portal ${input.changeKind.replaceAll("_", " ")} · ${row.policy.policyNumber}`,
    body,
    workStatus: "endorsement_pending",
    flag: "endorsement_required",
  });

  const [request] = await db
    .insert(portalRequests)
    .values({
      tenantId: tenantId(),
      tokenId: session.token.id,
      contactId: session.contact?.id ?? row.policy.contactId,
      accountId: session.account?.id ?? row.policy.accountId,
      policyId: row.policy.id,
      kind: "policy_change",
      status: "queued",
      summary: `${labeled} on ${row.policy.policyNumber} effective ${effectiveDate}`,
      payload,
      workItemId: queued.item.id,
    })
    .returning();

  return { ok: true, request };
}

export async function listOpenPortalRequests() {
  return db
    .select({
      request: portalRequests,
      policy: policies,
      certificate: issuedCertificates,
    })
    .from(portalRequests)
    .leftJoin(policies, eq(portalRequests.policyId, policies.id))
    .leftJoin(issuedCertificates, eq(portalRequests.reusedCertificateId, issuedCertificates.id))
    .where(eq(portalRequests.tenantId, tenantId()))
    .orderBy(desc(portalRequests.createdAt));
}

export async function getPortalRequest(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(portalRequests)
    .where(and(eq(portalRequests.tenantId, tenantId()), eq(portalRequests.id, id)));
  return row ?? null;
}
