import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { SERVICING_TASK_KINDS } from "@/lib/domain-ams";
import { isUuid } from "@/lib/ids";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  carrierDownloadConnections,
  carriers,
  certificateRequests,
  contacts,
  documents,
  issuedCertificates,
  policies,
  policyAdditionalInterests,
  policyServiceRequests,
  policyTerms,
  reviewTasks,
  users,
} from "@/lib/db/schema";
import { bookHealthCounts, missingDocRows, producerBookRows, type OwnedBookPolicy } from "./book-health";
import { buildServicingChecklist, type ServicingFile, type ServicingTask } from "./checklist";
import { packetTasksByKey, type PacketTask } from "./packet-tasks";

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

export async function listServiceRequests(policyId?: string) {
  const clauses = [eq(policyServiceRequests.tenantId, tenant())];
  if (policyId) {
    if (!isUuid(policyId)) return [];
    clauses.push(eq(policyServiceRequests.policyId, policyId));
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

export async function loadPolicyServicing(policyId: string) {
  if (!isUuid(policyId)) return null;
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, policyId)));
  if (!policy) return null;
  const [files, requests, nextTask, interests, packetTaskRows] = await Promise.all([
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
  const counts = bookHealthCounts(book);
  const missing = missingDocRows(book, filesByPolicy);
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
    producers: rollup.producers,
    agency: rollup.agency,
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
