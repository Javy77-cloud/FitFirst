import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  isHolderContactStatus,
  isInspectionStatus,
  isInstallmentStatus,
  isRenewalQueueStage,
  isWorkDesk,
  SERVICE_TIMELINE_EVENTS,
  SERVICING_TASK_KINDS,
  servicingDocKeyFromTaskKind,
} from "@/lib/domain-ams";
import { isUuid } from "@/lib/ids";
import { isSuspenseDocKey, pendingSuspenseKeys } from "./suspense";
import { rollupCertificateHolders } from "./certificate-holders";
import { filterSuspenseBoard, sortSuspenseBoard, type SuspenseBoardRow } from "./suspense-board";
import { ageSuspenseRow, filterSuspenseByAge } from "./suspense-aging";
import { deskNow } from "@/lib/home/as-of";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  activityLogs,
  carrierDownloadConnections,
  carriers,
  certificateHolderContacts,
  certificateRequests,
  claimActivity,
  claims,
  contacts,
  documents,
  issuedCertificates,
  policies,
  claimDiary,
  endorsementDrafts,
  policyAdditionalInterests,
  policyServiceRequestEvents,
  policyInspections,
  policyInstallments,
  policyNotices,
  policyServiceRequests,
  policyServicingChecks,
  policyTerms,
  renewalQueue,
  reviewTasks,
  users,
} from "@/lib/db/schema";
import {
  bookHealthCounts,
  filterOwnedBook,
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
  servicingPacketOnFile,
  type ServicingCheck,
  type ServicingFile,
  type ServicingTask,
} from "./checklist";
import { ensureCurrentPolicyTerm } from "./ensure-term";
import { packetTasksByKey, type PacketTask } from "./packet-tasks";
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
  // Missing dec / ID cards / AOR stay on the servicing checklist. Do not
  // silently open Tasks — agents create packet tasks on purpose.
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
  await ensureCurrentPolicyTerm(policyId);
  await ensureServicingSuspense(policyId);
  const [
    files,
    requests,
    nextTask,
    interests,
    packetTaskRows,
    terms,
    checkRows,
    events,
    claimDesk,
    notices,
    drafts,
  ] = await Promise.all([
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
    listPolicyNotices(policyId),
    listEndorsementDrafts(policyId),
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
  const missingPackets: ServicingDocKey[] = missingServicingDocs(files, policy.lineOfBusiness);
  const packetOnFile = servicingPacketOnFile(files);
  return {
    policy,
    requests: requests.map((row) => row.request),
    interests,
    terms,
    notices: notices.map((row) => row.notice),
    drafts: drafts.map((row) => row.draft),
    nextTask,
    packetTasks,
    packetByKey: packetTasksByKey(packetTasks),
    missingPackets,
    packetOnFile,
    events,
    checks,
    claims: claimDesk.claims,
    claimActivity: claimDesk.activity,
    checklist: buildServicingChecklist({
      files,
      expirationDate: policy.expirationDate,
      nextTask,
      checks,
      lineOfBusiness: policy.lineOfBusiness,
    }),
  };
}

export async function loadBookHealth(ownerId?: string) {
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
  const selectedOwner =
    ownerId && (ownerId === "unassigned" || book.some((row) => row.ownerId === ownerId))
      ? ownerId
      : null;
  const scopedBook = filterOwnedBook(book, selectedOwner);
  const counts = bookHealthCounts(book);
  const agencyMissing = missingDocRows(book, filesByPolicy);
  const missing = selectedOwner ? missingDocRows(scopedBook, filesByPolicy) : agencyMissing;
  const missingDec = missingDecRows(missing);
  const monoline = monolineGaps(book);
  const lapseRisk = lapseRiskRows(scopedBook);
  const packetRollup = producerBookRows(book, filesByPolicy);
  const rollups = producerRollups(
    book,
    new Set(missingDec.map((row) => row.policyId)),
    new Set(lapseRisk.map((row) => row.policyId)),
    new Set(monoline.map((row) => row.partyKey)),
  );
  const rollup = packetRollup;
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
    agencyMissingCount: agencyMissing.length,
    scope: session.isAdmin ? "agency" : "producer",
    viewerName: session.name || "Desk",
    ownerId: selectedOwner,
    ownerName:
      selectedOwner === "unassigned"
        ? "Unassigned"
        : rollup.producers.find((row) => row.ownerId === selectedOwner)?.ownerName ?? null,
    openServiceRequests: Number(openRequests[0]?.n ?? 0),
    openCoiRequests: Number(openCoi[0]?.n ?? 0),
    openSuspense: (await loadSuspenseBoard()).rows.length,
    openClaimDiary: Number(
      (
        await db
          .select({ n: sql<number>`count(*)` })
          .from(claimDiary)
          .where(and(eq(claimDiary.tenantId, tenant()), eq(claimDiary.status, "open")))
      )[0]?.n ?? 0,
    ),
    openEndorsementDrafts: Number(
      (
        await db
          .select({ n: sql<number>`count(*)` })
          .from(endorsementDrafts)
          .where(and(eq(endorsementDrafts.tenantId, tenant()), eq(endorsementDrafts.status, "drafted")))
      )[0]?.n ?? 0,
    ),
    openNotices: Number(
      (
        await db
          .select({ n: sql<number>`count(*)` })
          .from(policyNotices)
          .where(and(eq(policyNotices.tenantId, tenant()), eq(policyNotices.status, "drafted")))
      )[0]?.n ?? 0,
    ),
    openRenewalQueue: Number(
      (
        await db
          .select({ n: sql<number>`count(*)` })
          .from(renewalQueue)
          .where(
            and(
              eq(renewalQueue.tenantId, tenant()),
              inArray(renewalQueue.stage, ["upcoming", "contacted", "quoted"]),
            ),
          )
      )[0]?.n ?? 0,
    ),
    activeHolderContacts: Number(
      (
        await db
          .select({ n: sql<number>`count(*)` })
          .from(certificateHolderContacts)
          .where(
            and(
              eq(certificateHolderContacts.tenantId, tenant()),
              eq(certificateHolderContacts.status, "active"),
            ),
          )
      )[0]?.n ?? 0,
    ),
    openInspections: Number(
      (
        await db
          .select({ n: sql<number>`count(*)` })
          .from(policyInspections)
          .where(
            and(
              eq(policyInspections.tenantId, tenant()),
              inArray(policyInspections.status, ["requested", "scheduled"]),
            ),
          )
      )[0]?.n ?? 0,
    ),
    openInstallments: Number(
      (
        await db
          .select({ n: sql<number>`count(*)` })
          .from(policyInstallments)
          .where(
            and(
              eq(policyInstallments.tenantId, tenant()),
              inArray(policyInstallments.status, ["scheduled", "due", "past_due"]),
            ),
          )
      )[0]?.n ?? 0,
    ),
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
    if (!isUpcomingRenewal(policy, windowDays, deskNow())) continue;
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
  const queueRows = ids.length
    ? await db
        .select()
        .from(renewalQueue)
        .where(and(eq(renewalQueue.tenantId, tenant()), inArray(renewalQueue.policyId, ids)))
    : [];
  const queueByPolicy = new Map(queueRows.map((row) => [row.policyId, row]));
  const list = sortRenewalRows(
    upcoming.map((row) => buildRenewalRow(row, deskNow())).filter((row) => row != null),
  ).map((row) => ({
    ...row,
    hasFollowup: followupByPolicy.has(row.id),
    queue: queueByPolicy.get(row.id) ?? null,
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

export async function listPolicyNotices(policyId?: string) {
  const clauses = [eq(policyNotices.tenantId, tenant())];
  if (policyId) {
    if (!isUuid(policyId)) return [];
    clauses.push(eq(policyNotices.policyId, policyId));
  }
  return db
    .select({
      notice: policyNotices,
      policy: policies,
      contact: contacts,
      account: accounts,
    })
    .from(policyNotices)
    .innerJoin(policies, eq(policyNotices.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(and(...clauses))
    .orderBy(desc(policyNotices.createdAt));
}

export async function getPolicyNotice(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      notice: policyNotices,
      policy: policies,
    })
    .from(policyNotices)
    .innerJoin(policies, eq(policyNotices.policyId, policies.id))
    .where(and(eq(policyNotices.tenantId, tenant()), eq(policyNotices.id, id)));
  return row ?? null;
}

export async function loadSuspenseBoard(docKey?: string, age?: string) {
  const taskRows = await db
    .select({
      task: reviewTasks,
      policy: policies,
      contact: contacts,
      account: accounts,
    })
    .from(reviewTasks)
    .innerJoin(policies, eq(reviewTasks.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(
      and(
        eq(reviewTasks.tenantId, tenant()),
        eq(reviewTasks.status, "open"),
        inArray(reviewTasks.kind, [
          SERVICING_TASK_KINDS.id_card,
          SERVICING_TASK_KINDS.aor,
        ]),
      ),
    )
    .orderBy(asc(reviewTasks.dueDate));
  const rows: SuspenseBoardRow[] = [];
  for (const { task, policy, contact, account } of taskRows) {
    const key = servicingDocKeyFromTaskKind(task.kind);
    if (!key || !isSuspenseDocKey(key)) continue;
    rows.push({
      taskId: task.id,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      partyName: partyName(contact, account),
      docKey: key,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status,
      openedAt: task.createdAt,
    });
  }
  const aged = sortSuspenseBoard(filterSuspenseBoard(rows, docKey)).map((row) =>
    ageSuspenseRow(row, deskNow()),
  );
  return {
    docKey: docKey && isSuspenseDocKey(docKey) ? docKey : null,
    age: age && age.length ? age : null,
    rows: filterSuspenseByAge(aged, age),
  };
}

export async function listClaimDiary(claimId?: string, status?: string) {
  const clauses = [eq(claimDiary.tenantId, tenant())];
  if (claimId) {
    if (!isUuid(claimId)) return [];
    clauses.push(eq(claimDiary.claimId, claimId));
  }
  if (status === "open" || status === "completed") {
    clauses.push(eq(claimDiary.status, status));
  }
  return db
    .select({
      entry: claimDiary,
      claim: claims,
      policy: policies,
      contact: contacts,
      account: accounts,
    })
    .from(claimDiary)
    .innerJoin(claims, eq(claimDiary.claimId, claims.id))
    .leftJoin(policies, eq(claimDiary.policyId, policies.id))
    .leftJoin(contacts, eq(claims.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(and(...clauses))
    .orderBy(asc(claimDiary.dueAt), desc(claimDiary.createdAt));
}

export async function getClaimDiaryEntry(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      entry: claimDiary,
      claim: claims,
    })
    .from(claimDiary)
    .innerJoin(claims, eq(claimDiary.claimId, claims.id))
    .where(and(eq(claimDiary.tenantId, tenant()), eq(claimDiary.id, id)));
  return row ?? null;
}

export async function listEndorsementDrafts(policyId?: string) {
  const clauses = [eq(endorsementDrafts.tenantId, tenant())];
  if (policyId) {
    if (!isUuid(policyId)) return [];
    clauses.push(eq(endorsementDrafts.policyId, policyId));
  }
  return db
    .select({
      draft: endorsementDrafts,
      policy: policies,
      contact: contacts,
      account: accounts,
    })
    .from(endorsementDrafts)
    .innerJoin(policies, eq(endorsementDrafts.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(and(...clauses))
    .orderBy(desc(endorsementDrafts.createdAt));
}

export async function getEndorsementDraft(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      draft: endorsementDrafts,
      policy: policies,
    })
    .from(endorsementDrafts)
    .innerJoin(policies, eq(endorsementDrafts.policyId, policies.id))
    .where(and(eq(endorsementDrafts.tenantId, tenant()), eq(endorsementDrafts.id, id)));
  return row ?? null;
}

export async function listCertificateHolders() {
  const interests = await db
    .select({
      interest: policyAdditionalInterests,
      policy: policies,
      account: accounts,
    })
    .from(policyAdditionalInterests)
    .innerJoin(policies, eq(policyAdditionalInterests.policyId, policies.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(
      and(
        eq(policyAdditionalInterests.tenantId, tenant()),
        inArray(policyAdditionalInterests.kind, ["additional_interest", "certificate_holder"]),
      ),
    );
  const requests = await db
    .select()
    .from(certificateRequests)
    .where(eq(certificateRequests.tenantId, tenant()));
  const issued = await db
    .select()
    .from(issuedCertificates)
    .where(eq(issuedCertificates.tenantId, tenant()));
  return rollupCertificateHolders(
    interests.map(({ interest, policy, account }) => ({
      name: interest.name,
      kind: interest.kind,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      accountName: account?.name ?? null,
    })),
    [
      ...requests.map((row) => ({
        holderName: row.holderName,
        status: row.status,
        waiverOfSubrogation: row.waiverOfSubrogation,
        primaryNoncontributory: row.primaryNoncontributory,
      })),
      ...issued.map((row) => ({
        holderName: row.holderName,
        status: row.status === "issued" ? "issued" : row.status,
        waiverOfSubrogation: row.waiverOfSubrogation,
        primaryNoncontributory: row.primaryNoncontributory,
      })),
    ],
  );
}

export async function listServiceTimeline(policyId?: string) {
  const clauses = [
    eq(activityLogs.tenantId, tenant()),
    inArray(activityLogs.eventType, [...SERVICE_TIMELINE_EVENTS]),
  ];
  if (policyId) {
    if (!isUuid(policyId)) return [];
    clauses.push(eq(activityLogs.policyId, policyId));
  }
  return db
    .select({
      log: activityLogs,
      activity: activities,
      policy: policies,
      contact: contacts,
      account: accounts,
    })
    .from(activityLogs)
    .innerJoin(activities, eq(activityLogs.activityId, activities.id))
    .leftJoin(policies, eq(activityLogs.policyId, policies.id))
    .leftJoin(contacts, eq(activityLogs.contactId, contacts.id))
    .leftJoin(accounts, eq(activityLogs.accountId, accounts.id))
    .where(and(...clauses))
    .orderBy(desc(activityLogs.occurredAt));
}

export async function listHolderContacts(status?: string) {
  const clauses = [eq(certificateHolderContacts.tenantId, tenant())];
  if (status && isHolderContactStatus(status)) {
    clauses.push(eq(certificateHolderContacts.status, status));
  }
  return db
    .select({
      contact: certificateHolderContacts,
      account: accounts,
    })
    .from(certificateHolderContacts)
    .leftJoin(accounts, eq(certificateHolderContacts.accountId, accounts.id))
    .where(and(...clauses))
    .orderBy(asc(certificateHolderContacts.name));
}

export async function getHolderContact(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      contact: certificateHolderContacts,
      account: accounts,
    })
    .from(certificateHolderContacts)
    .leftJoin(accounts, eq(certificateHolderContacts.accountId, accounts.id))
    .where(and(eq(certificateHolderContacts.tenantId, tenant()), eq(certificateHolderContacts.id, id)));
  return row ?? null;
}

export async function listRenewalQueue(stage?: string) {
  const clauses = [eq(renewalQueue.tenantId, tenant())];
  if (stage && isRenewalQueueStage(stage)) {
    clauses.push(eq(renewalQueue.stage, stage));
  }
  return db
    .select({
      queue: renewalQueue,
      policy: policies,
      contact: contacts,
      account: accounts,
      carrier: carriers,
    })
    .from(renewalQueue)
    .innerJoin(policies, eq(renewalQueue.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .where(and(...clauses))
    .orderBy(asc(policies.expirationDate));
}

export async function getRenewalQueue(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      queue: renewalQueue,
      policy: policies,
    })
    .from(renewalQueue)
    .innerJoin(policies, eq(renewalQueue.policyId, policies.id))
    .where(and(eq(renewalQueue.tenantId, tenant()), eq(renewalQueue.id, id)));
  return row ?? null;
}

export async function getRenewalQueueForPolicy(policyId: string) {
  if (!isUuid(policyId)) return null;
  const [row] = await db
    .select()
    .from(renewalQueue)
    .where(and(eq(renewalQueue.tenantId, tenant()), eq(renewalQueue.policyId, policyId)));
  return row ?? null;
}

export async function listPolicyInspections(policyId?: string, status?: string) {
  const clauses = [eq(policyInspections.tenantId, tenant())];
  if (policyId) {
    if (!isUuid(policyId)) return [];
    clauses.push(eq(policyInspections.policyId, policyId));
  }
  if (status && isInspectionStatus(status)) {
    clauses.push(eq(policyInspections.status, status));
  }
  return db
    .select({
      inspection: policyInspections,
      policy: policies,
      contact: contacts,
      account: accounts,
    })
    .from(policyInspections)
    .innerJoin(policies, eq(policyInspections.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(and(...clauses))
    .orderBy(asc(policyInspections.scheduledOn), desc(policyInspections.createdAt));
}

export async function getPolicyInspection(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      inspection: policyInspections,
      policy: policies,
    })
    .from(policyInspections)
    .innerJoin(policies, eq(policyInspections.policyId, policies.id))
    .where(and(eq(policyInspections.tenantId, tenant()), eq(policyInspections.id, id)));
  return row ?? null;
}

export async function listPolicyInstallments(policyId?: string, status?: string) {
  const clauses = [eq(policyInstallments.tenantId, tenant())];
  if (policyId) {
    if (!isUuid(policyId)) return [];
    clauses.push(eq(policyInstallments.policyId, policyId));
  }
  if (status && isInstallmentStatus(status)) {
    clauses.push(eq(policyInstallments.status, status));
  }
  return db
    .select({
      installment: policyInstallments,
      policy: policies,
      contact: contacts,
      account: accounts,
    })
    .from(policyInstallments)
    .innerJoin(policies, eq(policyInstallments.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(and(...clauses))
    .orderBy(asc(policyInstallments.dueOn));
}

export async function getPolicyInstallment(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      installment: policyInstallments,
      policy: policies,
    })
    .from(policyInstallments)
    .innerJoin(policies, eq(policyInstallments.policyId, policies.id))
    .where(and(eq(policyInstallments.tenantId, tenant()), eq(policyInstallments.id, id)));
  return row ?? null;
}
