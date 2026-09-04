import { desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  activityLogs,
  contacts,
  deals,
  documents,
  eoAuditLogs,
  policies,
} from "@/lib/db/schema";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { partyLabel } from "@/lib/desk/policy-name";
import { findEoGaps, type EoActivityStamp, type EoGapFlag } from "./gaps";
import { eoActionFromCommsKind, type EoAuditAction } from "./types";

export type EoTrailRow = {
  id: string;
  occurredAt: Date;
  actorName: string;
  action: EoAuditAction | string;
  summary: string;
  entityType: string | null;
  entityId: string | null;
  contactId: string | null;
  accountId: string | null;
  policyId: string | null;
  dealId: string | null;
  leadId: string | null;
  documentId: string | null;
  activityId: string | null;
  recordLabel: string;
};

export async function listRecentEoAudit(limit = 80): Promise<EoTrailRow[]> {
  const rows = await db
    .select()
    .from(eoAuditLogs)
    .where(eq(eoAuditLogs.tenantId, DEFAULT_TENANT_ID))
    .orderBy(desc(eoAuditLogs.occurredAt))
    .limit(limit);

  const contactIds = [...new Set(rows.map((row) => row.contactId).filter(Boolean))] as string[];
  const accountIds = [...new Set(rows.map((row) => row.accountId).filter(Boolean))] as string[];
  const policyIds = [...new Set(rows.map((row) => row.policyId).filter(Boolean))] as string[];
  const dealIds = [...new Set(rows.map((row) => row.dealId).filter(Boolean))] as string[];

  const [contactRows, accountRows, policyRows, dealRows] = await Promise.all([
    contactIds.length
      ? db.select().from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID))
      : Promise.resolve([]),
    accountIds.length
      ? db.select().from(accounts).where(eq(accounts.tenantId, DEFAULT_TENANT_ID))
      : Promise.resolve([]),
    policyIds.length
      ? db.select().from(policies).where(eq(policies.tenantId, DEFAULT_TENANT_ID))
      : Promise.resolve([]),
    dealIds.length
      ? db.select().from(deals).where(eq(deals.tenantId, DEFAULT_TENANT_ID))
      : Promise.resolve([]),
  ]);

  const contactsById = new Map(contactRows.map((row) => [row.id, row]));
  const accountsById = new Map(accountRows.map((row) => [row.id, row]));
  const policiesById = new Map(policyRows.map((row) => [row.id, row]));
  const dealsById = new Map(dealRows.map((row) => [row.id, row]));

  return rows.map((row) => {
    const contact = row.contactId ? contactsById.get(row.contactId) : null;
    const account = row.accountId ? accountsById.get(row.accountId) : null;
    const policy = row.policyId ? policiesById.get(row.policyId) : null;
    const deal = row.dealId ? dealsById.get(row.dealId) : null;
    const party = partyLabel(contact ?? null, account ?? null);
    const recordLabel =
      [party || null, policy?.policyNumber, deal?.title].filter(Boolean).join(" · ") || row.summary;
    return {
      id: row.id,
      occurredAt: row.occurredAt,
      actorName: row.actorName,
      action: row.action,
      summary: row.summary,
      entityType: row.entityType,
      entityId: row.entityId,
      contactId: row.contactId,
      accountId: row.accountId,
      policyId: row.policyId,
      dealId: row.dealId,
      leadId: row.leadId,
      documentId: row.documentId,
      activityId: row.activityId,
      recordLabel,
    };
  });
}

export async function loadEoGapFlags(asOf: Date = DESK_AS_OF): Promise<EoGapFlag[]> {
  const [policyRows, dealRows, docRows, activityRows, logRows, auditRows, contactRows, accountRows] =
    await Promise.all([
      db.select().from(policies).where(eq(policies.tenantId, DEFAULT_TENANT_ID)),
      db.select().from(deals).where(eq(deals.tenantId, DEFAULT_TENANT_ID)),
      db.select().from(documents).where(eq(documents.tenantId, DEFAULT_TENANT_ID)),
      db.select().from(activities).where(eq(activities.tenantId, DEFAULT_TENANT_ID)),
      db.select().from(activityLogs).where(eq(activityLogs.tenantId, DEFAULT_TENANT_ID)),
      db.select().from(eoAuditLogs).where(eq(eoAuditLogs.tenantId, DEFAULT_TENANT_ID)),
      db.select().from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID)),
      db.select().from(accounts).where(eq(accounts.tenantId, DEFAULT_TENANT_ID)),
    ]);

  const contactsById = new Map(contactRows.map((row) => [row.id, row]));
  const accountsById = new Map(accountRows.map((row) => [row.id, row]));

  const stamps: EoActivityStamp[] = [
    ...auditRows.map((row) => ({
      occurredAt: row.occurredAt,
      action: row.action,
      contactId: row.contactId,
      accountId: row.accountId,
      policyId: row.policyId,
      dealId: row.dealId,
      leadId: row.leadId,
    })),
    ...logRows.map((row) => ({
      occurredAt: row.occurredAt,
      action: eoActionFromCommsKind(row.kind) ?? row.kind,
      contactId: row.contactId,
      accountId: row.accountId,
      policyId: row.policyId,
      dealId: row.dealId,
      leadId: row.leadId,
    })),
    ...activityRows.map((row) => ({
      occurredAt: row.startAt ?? row.dueAt ?? row.createdAt,
      action: eoActionFromCommsKind(row.kind) ?? row.kind,
      contactId: row.contactId,
      accountId: row.accountId,
      policyId: row.policyId,
      dealId: row.dealId,
      leadId: row.leadId,
    })),
  ];

  return findEoGaps({
    asOf,
    policies: policyRows.map((row) => ({
      id: row.id,
      policyNumber: row.policyNumber,
      status: row.status,
      expirationDate: row.expirationDate,
      renewalDate: row.renewalDate,
      contactId: row.contactId,
      accountId: row.accountId,
      dealId: row.dealId,
      partyLabel: partyLabel(
        row.contactId ? contactsById.get(row.contactId) ?? null : null,
        row.accountId ? accountsById.get(row.accountId) ?? null : null,
      ),
    })),
    deals: dealRows.map((row) => ({
      id: row.id,
      title: row.title,
      pipelineStage: row.pipelineStage,
      pipelineStageSlug: row.pipelineStageSlug,
      contactId: row.contactId,
      leadId: row.leadId,
    })),
    docs: docRows.map((row) => ({
      slot: row.slot,
      docType: row.docType,
      policyId: row.policyId,
      dealId: row.dealId,
    })),
    tasks: activityRows.map((row) => ({
      kind: row.kind,
      dealId: row.dealId,
      contactId: row.contactId,
      leadId: row.leadId,
      policyId: row.policyId,
    })),
    stamps,
  });
}

export async function loadComplianceDesk() {
  const [trail, flags] = await Promise.all([listRecentEoAudit(80), loadEoGapFlags()]);
  return { trail, flags };
}
