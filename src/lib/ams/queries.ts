import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  isWorkDesk,
  SERVICING_TASK_KINDS,
  servicingDocKeyFromTaskKind,
  servicingTaskKind,
} from "@/lib/domain-ams";
import { isUuid } from "@/lib/ids";
import { isSuspenseDocKey, pendingSuspenseKeys } from "./suspense";
import { rollupCertificateHolders } from "./certificate-holders";
import { filterSuspenseBoard, sortSuspenseBoard, type SuspenseBoardRow } from "./suspense-board";
import { ageSuspenseRow, filterSuspenseByAge } from "./suspense-aging";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  carrierDownloadConnections,
  carriers,
  certificateRequests,
  claims,
  contacts,
  documents,
  issuedCertificates,
  policies,
  claimDiary,
  endorsementDrafts,
  policyAdditionalInterests,
  policyNotices,
  policyServiceRequests,
  policyTerms,
  reviewTasks,
  users,
} from "@/lib/db/schema";
import {
  bookHealthCounts,
  filterOwnedBook,
  missingDocRows,
  producerBookRows,
  type OwnedBookPolicy,
} from "./book-health";
import { buildServicingChecklist, type ServicingFile, type ServicingTask } from "./checklist";
import { packetTaskTitle, packetTasksByKey, type PacketTask } from "./packet-tasks";

const policyOwner = alias(users, "policy_owner");
import {
  buildRenewalRow,
  isUpcomingRenewal,
  sortRenewalRows,
  type RenewalPolicy,
} from "./renewals";
import { carrierDownloadCatalog } from "./carrier-download";

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

export async function loadPolicyServicing(policyId: string) {
  if (!isUuid(policyId)) return null;
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, policyId)));
  if (!policy) return null;
  await ensureServicingSuspense(policyId);
  const [files, requests, nextTask, interests, packetTaskRows, terms, notices, drafts] = await Promise.all([
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
    listPolicyNotices(policyId),
    listEndorsementDrafts(policyId),
  ]);
  const packetTasks: PacketTask[] = packetTaskRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    status: row.status,
  }));
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
    checklist: buildServicingChecklist({
      files,
      expirationDate: policy.expirationDate,
      nextTask,
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
  const book: OwnedBookPolicy[] = rows.map(({ policy, contact, account, ownerName }) => ({
    id: policy.id,
    policyNumber: policy.policyNumber,
    status: policy.status,
    lineOfBusiness: policy.lineOfBusiness,
    expirationDate: policy.expirationDate,
    partyName: partyName(contact, account),
    ownerId: policy.ownerId,
    ownerName: ownerName || "Unassigned",
  }));
  const selectedOwner =
    ownerId && (ownerId === "unassigned" || book.some((row) => row.ownerId === ownerId))
      ? ownerId
      : null;
  const scopedBook = filterOwnedBook(book, selectedOwner);
  const counts = bookHealthCounts(book);
  const agencyMissing = missingDocRows(book, filesByPolicy);
  const missing = selectedOwner ? missingDocRows(scopedBook, filesByPolicy) : agencyMissing;
  const rollup = producerBookRows(book, filesByPolicy);
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
    agencyMissingCount: agencyMissing.length,
    producers: rollup.producers,
    agency: rollup.agency,
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
  );
  return {
    windowDays,
    rows: list.map((row) => ({
      ...row,
      hasFollowup: followupByPolicy.has(row.id),
    })),
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
    ageSuspenseRow(row, DESK_AS_OF),
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
