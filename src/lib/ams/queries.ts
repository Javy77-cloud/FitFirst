import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isWorkDesk, SERVICING_TASK_KINDS, servicingTaskKind } from "@/lib/domain-ams";
import { isUuid } from "@/lib/ids";
import { pendingSuspenseKeys } from "./suspense";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  carrierDownloadConnections,
  carriers,
  certificateRequests,
  claimActivity,
  claims,
  contacts,
  documents,
  issuedCertificates,
  policies,
  policyAdditionalInterests,
  policyServiceRequestEvents,
  policyServiceRequests,
  policyServicingChecks,
  policyTerms,
  reviewTasks,
  users,
} from "@/lib/db/schema";
import {
  bookHealthCounts,
  lapseRiskRows,
  missingDecRows,
  missingDocRows,
  monolineGaps,
  producerBookRows,
  producerRollups,
  type OwnedBookPolicy,
} from "./book-health";
import {
  buildServicingChecklist,
  missingServicingDocs,
  type ServicingCheck,
  type ServicingFile,
  type ServicingTask,
} from "./checklist";
import { packetTaskTitle, packetTasksByKey, type PacketTask } from "./packet-tasks";
import {
  bucketRenewalRows,
  buildRenewalRow,
  isUpcomingRenewal,
  sortRenewalRows,
  type RenewalPolicy,
} from "./renewals";
import { carrierDownloadCatalog } from "./carrier-download";
import { parseMoney, premiumChange } from "@/lib/renewal/compare";
import type { ServicingCheckKey, ServicingDocKey } from "@/lib/domain-ams";

const policyOwner = alias(users, "policy_owner");

const tenant = () => DEFAULT_TENANT_ID;

function partyName(
  contact: { firstName: string; lastName: string } | null,
  account: { name: string } | null,
): string {
  if (contact) return `${contact.lastName}, ${contact.firstName}`;
  return account?.name ?? "—";
}

async function scopedPolicies() {
  const session = await currentDeskSession();
  const rows = await db
    .select({
      policy: policies,
      contact: contacts,
      account: accounts,
      carrier: carriers,
      owner: policyOwner,
      ownerName: policyOwner.name,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(policyOwner, eq(policies.ownerId, policyOwner.id))
    .where(eq(policies.tenantId, tenant()))
    .orderBy(asc(policies.expirationDate));
  if (session.isAdmin) return rows;
  if (!session.userId) return [];
  return rows.filter(({ policy }) => policy.ownerId === session.userId);
}

export async function listServiceRequests(policyId?: string, workDesk?: string) {
  const clauses = [eq(policyServiceRequests.tenantId, tenant())];
  if (policyId) {
    if (!isUuid(policyId)) return [];
    clauses.push(eq(policyServiceRequests.policyId, policyId));
  }
  if (workDesk && isWorkDesk(workDesk)) {
    clauses.push(eq(policyServiceRequests.workDesk, workDesk));
  }
  return db
    .select({
      request: policyServiceRequests,
      policy: policies,
      contact: contacts,
      account: accounts,
    })
    .from(policyServiceRequests)
    .innerJoin(policies, eq(policyServiceRequests.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(and(...clauses))
    .orderBy(desc(policyServiceRequests.createdAt));
}

export async function getServiceRequest(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      request: policyServiceRequests,
      policy: policies,
    })
    .from(policyServiceRequests)
    .innerJoin(policies, eq(policyServiceRequests.policyId, policies.id))
    .where(and(eq(policyServiceRequests.tenantId, tenant()), eq(policyServiceRequests.id, id)));
  return row ?? null;
}

export async function nextServiceTask(policyId: string): Promise<ServicingTask | null> {
  if (!isUuid(policyId)) return null;
  const [task] = await db
    .select()
    .from(reviewTasks)
    .where(
      and(
        eq(reviewTasks.tenantId, tenant()),
        eq(reviewTasks.policyId, policyId),
        eq(reviewTasks.status, "open"),
      ),
    )
    .orderBy(asc(reviewTasks.dueDate))
    .limit(1);
  if (task) return { id: task.id, title: task.title, dueDate: task.dueDate };
  const [activity] = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.tenantId, tenant()),
        eq(activities.policyId, policyId),
        eq(activities.kind, "task"),
        eq(activities.status, "open"),
      ),
    )
    .orderBy(asc(activities.dueAt))
    .limit(1);
  if (!activity) return null;
  return { id: activity.id, title: activity.title, dueDate: activity.dueAt };
}

export async function listAccountInterests(accountId: string) {
  if (!isUuid(accountId)) return [];
  return db
    .select({
      interest: policyAdditionalInterests,
      policy: policies,
    })
    .from(policyAdditionalInterests)
    .innerJoin(policies, eq(policyAdditionalInterests.policyId, policies.id))
    .where(
      and(eq(policyAdditionalInterests.tenantId, tenant()), eq(policies.accountId, accountId)),
    )
    .orderBy(asc(policyAdditionalInterests.name));
}

export async function ensureServicingSuspense(policyId: string) {
  if (!isUuid(policyId)) return [];
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, policyId)));
  if (!policy) return [];
  const [files, taskRows] = await Promise.all([
    db
      .select({ docType: documents.docType, slot: documents.slot })
      .from(documents)
      .where(and(eq(documents.tenantId, tenant()), eq(documents.policyId, policyId))),
    db
      .select()
      .from(reviewTasks)
      .where(
        and(
          eq(reviewTasks.tenantId, tenant()),
          eq(reviewTasks.policyId, policyId),
          inArray(reviewTasks.kind, [...Object.values(SERVICING_TASK_KINDS)]),
        ),
      ),
  ]);
  const pending = pendingSuspenseKeys(
    files,
    taskRows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      status: row.status,
    })),
  );
  if (pending.length === 0) return [];
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 7);
  await db.insert(reviewTasks).values(
    pending.map((key) => ({
      tenantId: tenant(),
      policyId,
      contactId: policy.contactId,
      accountId: policy.accountId,
      dealId: policy.dealId,
      kind: servicingTaskKind(key),
      title: packetTaskTitle(key, policy.policyNumber),
      dueDate: due,
      status: "open" as const,
    })),
  );
  return pending;
}

export async function listServiceRequestEvents(policyId: string) {
  if (!isUuid(policyId)) return [];
  return db
    .select()
    .from(policyServiceRequestEvents)
    .where(
      and(eq(policyServiceRequestEvents.tenantId, tenant()), eq(policyServiceRequestEvents.policyId, policyId)),
    )
    .orderBy(desc(policyServiceRequestEvents.occurredAt));
}

export async function loadPolicyClaims(policyId: string) {
  if (!isUuid(policyId)) return { claims: [], activity: [] };
  const rows = await db
    .select({ claim: claims, contact: contacts })
    .from(claims)
    .leftJoin(contacts, eq(claims.contactId, contacts.id))
    .where(and(eq(claims.tenantId, tenant()), eq(claims.policyId, policyId)))
    .orderBy(desc(claims.dateReported));
  const claimIds = rows.map((row) => row.claim.id);
  const activity = claimIds.length
    ? await db
        .select()
        .from(claimActivity)
        .where(and(eq(claimActivity.tenantId, tenant()), inArray(claimActivity.claimId, claimIds)))
        .orderBy(desc(claimActivity.createdAt))
    : [];
  return { claims: rows, activity };
}

export async function loadPolicyServicing(policyId: string) {
  if (!isUuid(policyId)) return null;
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, policyId)));
  if (!policy) return null;
  await ensureServicingSuspense(policyId);
  const [files, requests, nextTask, interests, packetTaskRows, terms, checkRows, events, claimDesk] =
    await Promise.all([
      db
        .select({ docType: documents.docType, slot: documents.slot })
        .from(documents)
        .where(and(eq(documents.tenantId, tenant()), eq(documents.policyId, policyId))),
      listServiceRequests(policyId),
      nextServiceTask(policyId),
      db
        .select()
        .from(policyAdditionalInterests)
        .where(
          and(
            eq(policyAdditionalInterests.tenantId, tenant()),
            eq(policyAdditionalInterests.policyId, policyId),
          ),
        )
        .orderBy(asc(policyAdditionalInterests.name)),
      db
        .select()
        .from(reviewTasks)
        .where(
          and(
            eq(reviewTasks.tenantId, tenant()),
            eq(reviewTasks.policyId, policyId),
            inArray(reviewTasks.kind, [...Object.values(SERVICING_TASK_KINDS)]),
          ),
        ),
      db
        .select()
        .from(policyTerms)
        .where(and(eq(policyTerms.tenantId, tenant()), eq(policyTerms.policyId, policyId))),
      db
        .select()
        .from(policyServicingChecks)
        .where(
          and(eq(policyServicingChecks.tenantId, tenant()), eq(policyServicingChecks.policyId, policyId)),
        ),
      listServiceRequestEvents(policyId),
      loadPolicyClaims(policyId),
    ]);
  const packetTasks: PacketTask[] = packetTaskRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    status: row.status,
  }));
  const checks: ServicingCheck[] = checkRows.map((row) => ({
    id: row.id,
    key: row.itemKey as ServicingCheckKey,
    status: row.status === "complete" ? "complete" : "incomplete",
    notes: row.notes,
    taskId: row.taskId,
  }));
  const missingPackets: ServicingDocKey[] = missingServicingDocs(files);
  return {
    policy,
    requests: requests.map((row) => row.request),
    interests,
    terms,
    nextTask,
    packetTasks,
    packetByKey: packetTasksByKey(packetTasks),
    missingPackets,
    events,
    checks,
    claims: claimDesk.claims,
    claimActivity: claimDesk.activity,
    checklist: buildServicingChecklist({
      files,
      expirationDate: policy.expirationDate,
      nextTask,
      checks,
    }),
  };
}

export async function loadBookHealth() {
  const rows = await scopedPolicies();
  const policyIds = rows.map(({ policy }) => policy.id);
  const files = policyIds.length
    ? await db
        .select({
          policyId: documents.policyId,
          docType: documents.docType,
          slot: documents.slot,
        })
        .from(documents)
        .where(and(eq(documents.tenantId, tenant()), inArray(documents.policyId, policyIds)))
    : [];
  const filesByPolicy = new Map<string, ServicingFile[]>();
  for (const file of files) {
    if (!file.policyId) continue;
    const list = filesByPolicy.get(file.policyId) ?? [];
    list.push({ docType: file.docType, slot: file.slot });
    filesByPolicy.set(file.policyId, list);
  }
  const terms = policyIds.length
    ? await db
        .select()
        .from(policyTerms)
        .where(and(eq(policyTerms.tenantId, tenant()), inArray(policyTerms.policyId, policyIds)))
    : [];
  const pctByPolicy = new Map<string, number | null>();
  const currentByPolicy = new Map<string, string | null>();
  const proposedByPolicy = new Map<string, string | null>();
  for (const term of terms) {
    if (term.role === "current") currentByPolicy.set(term.policyId, term.premium);
    if (term.role === "proposed") proposedByPolicy.set(term.policyId, term.premium);
  }
  for (const { policy } of rows) {
    const current = parseMoney(currentByPolicy.get(policy.id) ?? policy.premium);
    const proposed = parseMoney(proposedByPolicy.get(policy.id) ?? null);
    pctByPolicy.set(
      policy.id,
      current != null && proposed != null ? premiumChange(current, proposed).pct : null,
    );
  }
  const book: OwnedBookPolicy[] = rows.map(({ policy, contact, account, owner, ownerName }) => ({
    id: policy.id,
    policyNumber: policy.policyNumber,
    status: policy.status,
    lineOfBusiness: policy.lineOfBusiness,
    expirationDate: policy.expirationDate,
    partyName: partyName(contact, account),
    partyKey: contact?.id ?? account?.id ?? policy.id,
    ownerId: policy.ownerId,
    ownerName: ownerName || owner?.name || (policy.producer ? policy.producer : "Unassigned"),
    premium: policy.premium,
    premiumChangePct: pctByPolicy.get(policy.id) ?? null,
  }));
  const counts = bookHealthCounts(book);
  const missing = missingDocRows(book, filesByPolicy);
  const missingDec = missingDecRows(missing);
  const monoline = monolineGaps(book);
  const lapseRisk = lapseRiskRows(book);
  const packetRollup = producerBookRows(book, filesByPolicy);
  const rollups = producerRollups(
    book,
    new Set(missingDec.map((row) => row.policyId)),
    new Set(lapseRisk.map((row) => row.policyId)),
    new Set(monoline.map((row) => row.partyKey)),
  );
  const openRequests = await db
    .select({ n: sql<number>`count(*)` })
    .from(policyServiceRequests)
    .where(
      and(
        eq(policyServiceRequests.tenantId, tenant()),
        inArray(policyServiceRequests.status, ["requested", "in_progress"]),
      ),
    );
  const openCoi = await db
    .select({ n: sql<number>`count(*)` })
    .from(certificateRequests)
    .where(
      and(eq(certificateRequests.tenantId, tenant()), eq(certificateRequests.status, "requested")),
    );
  const session = await currentDeskSession();
  return {
    counts,
    missing,
    missingDec,
    monoline,
    lapseRisk,
    agency: rollups.agency,
    producers: rollups.producers,
    agencyCounts: packetRollup.agency,
    producerBooks: packetRollup.producers,
    scope: session.isAdmin ? "agency" : "producer",
    viewerName: session.name || "Desk",
    openServiceRequests: Number(openRequests[0]?.n ?? 0),
    openCoiRequests: Number(openCoi[0]?.n ?? 0),
  };
}

export async function loadRenewalPipeline(windowDays = 60) {
  const rows = await scopedPolicies();
  const ids = rows.map(({ policy }) => policy.id);
  const terms = ids.length
    ? await db
        .select()
        .from(policyTerms)
        .where(and(eq(policyTerms.tenantId, tenant()), inArray(policyTerms.policyId, ids)))
    : [];
  const currentByPolicy = new Map<string, string | null>();
  const proposedByPolicy = new Map<string, string | null>();
  for (const term of terms) {
    if (term.role === "current") currentByPolicy.set(term.policyId, term.premium);
    if (term.role === "proposed") proposedByPolicy.set(term.policyId, term.premium);
  }
  const followups = ids.length
    ? await db
        .select()
        .from(reviewTasks)
        .where(
          and(
            eq(reviewTasks.tenantId, tenant()),
            eq(reviewTasks.kind, "renewal"),
            eq(reviewTasks.status, "open"),
            inArray(reviewTasks.policyId, ids),
          ),
        )
    : [];
  const followupByPolicy = new Set(
    followups.map((row) => row.policyId).filter((id): id is string => Boolean(id)),
  );
  const upcoming: RenewalPolicy[] = [];
  for (const { policy, contact, account, carrier } of rows) {
    if (!isUpcomingRenewal(policy, windowDays, DESK_AS_OF)) continue;
    upcoming.push({
      id: policy.id,
      policyNumber: policy.policyNumber,
      status: policy.status,
      lineOfBusiness: policy.lineOfBusiness,
      expirationDate: policy.expirationDate,
      premium: policy.premium,
      partyName: partyName(contact, account),
      carrierName: carrier?.name ?? "Carrier TBD",
      currentPremium: currentByPolicy.get(policy.id) ?? policy.premium,
      proposedPremium: proposedByPolicy.get(policy.id) ?? null,
    });
  }
  const list = sortRenewalRows(
    upcoming.map((row) => buildRenewalRow(row, DESK_AS_OF)).filter((row) => row != null),
  ).map((row) => ({
    ...row,
    hasFollowup: followupByPolicy.has(row.id),
  }));
  return {
    windowDays,
    rows: list,
    buckets: bucketRenewalRows(list),
  };
}

export async function listCertificateQueue() {
  const requests = await db
    .select({
      request: certificateRequests,
      account: accounts,
    })
    .from(certificateRequests)
    .innerJoin(accounts, eq(certificateRequests.accountId, accounts.id))
    .where(eq(certificateRequests.tenantId, tenant()))
    .orderBy(desc(certificateRequests.createdAt));
  const issued = await db
    .select({
      certificate: issuedCertificates,
      account: accounts,
    })
    .from(issuedCertificates)
    .leftJoin(accounts, eq(issuedCertificates.accountId, accounts.id))
    .where(eq(issuedCertificates.tenantId, tenant()))
    .orderBy(desc(issuedCertificates.issuedAt));
  return { requests, issued };
}

export async function getCertificateRequest(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      request: certificateRequests,
      account: accounts,
    })
    .from(certificateRequests)
    .innerJoin(accounts, eq(certificateRequests.accountId, accounts.id))
    .where(and(eq(certificateRequests.tenantId, tenant()), eq(certificateRequests.id, id)));
  return row ?? null;
}

export async function loadCarrierDownloadDesk() {
  const rows = await db
    .select()
    .from(carrierDownloadConnections)
    .where(eq(carrierDownloadConnections.tenantId, tenant()));
  return carrierDownloadCatalog(
    rows.map((row) => ({
      provider: row.provider as "ivans" | "al3",
      status: row.status,
      lastAttemptAt: row.lastAttemptAt,
      lastError: row.lastError,
    })),
  );
}
