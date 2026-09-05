import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { mergeTokens, type MergeRecord } from "@/lib/developer-hub/merge";
import { parseMacroActions, validateMacroActions } from "@/lib/developer-hub/macros";
import { anaSkipMessage, isProtectedAnaRecord } from "@/lib/developer-hub/protected";
import type { DevHubModule, MacroActions } from "@/lib/developer-hub/types";
import { db } from "@/lib/db";
import {
  activities,
  contacts,
  deals,
  emailSendJobs,
  emailTemplates,
  leads,
  policies,
  reviewTasks,
} from "@/lib/db/schema";
import { CONTACT_ID, DEAL_ID, LEAD_ID } from "@/lib/fixtures/ids";

export type MacroRunResult = {
  ran: number;
  skippedAna: number;
  tasksCreated: number;
  emailsQueued: number;
  updated: number;
  errors: string[];
  summary: string;
};

type LoadedRecord = {
  id: string;
  merge: MergeRecord;
  email: string | null;
  contactId: string | null;
  dealId: string | null;
  policyId: string | null;
  leadId: string | null;
  accountId: string | null;
};

export async function applyMacroToRecords(input: {
  module: DevHubModule;
  actions: MacroActions;
  recordIds: string[];
  ranBy: string | null;
}): Promise<MacroRunResult> {
  const checked = validateMacroActions(input.module, parseMacroActions(input.actions));
  if (!checked.ok) {
    return {
      ran: 0,
      skippedAna: 0,
      tasksCreated: 0,
      emailsQueued: 0,
      updated: 0,
      errors: [checked.error],
      summary: checked.error,
    };
  }
  const actions = checked.actions;
  const uniqueIds = [...new Set(input.recordIds.filter(Boolean))];
  const result: MacroRunResult = {
    ran: 0,
    skippedAna: 0,
    tasksCreated: 0,
    emailsQueued: 0,
    updated: 0,
    errors: [],
    summary: "",
  };

  const loaded = await loadRecords(input.module, uniqueIds);
  for (const id of uniqueIds) {
    if (isProtectedAnaRecord(id) || id === LEAD_ID || id === DEAL_ID || id === CONTACT_ID) {
      result.skippedAna += 1;
      continue;
    }
    const record = loaded.get(id);
    if (!record) {
      result.errors.push(`Record ${id} was not found on ${input.module}.`);
      continue;
    }
    try {
      const updated = await applyFieldUpdates(input.module, record, actions);
      if (updated) result.updated += 1;
      result.tasksCreated += await createMacroTasks(input.module, record, actions);
      result.emailsQueued += await queueMacroEmail(record, actions);
      result.ran += 1;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : "Macro failed on a record.");
    }
  }

  const parts = [
    result.ran ? `Updated ${result.ran} record${result.ran === 1 ? "" : "s"}` : "No records updated",
    result.updated ? `${result.updated} field update pass` : null,
    result.tasksCreated ? `${result.tasksCreated} task${result.tasksCreated === 1 ? "" : "s"} created` : null,
    result.emailsQueued ? `${result.emailsQueued} email${result.emailsQueued === 1 ? "" : "s"} queued` : null,
    result.skippedAna ? anaSkipMessage() : null,
  ].filter(Boolean);
  result.summary = parts.join(" · ");
  return result;
}

async function loadRecords(module: DevHubModule, ids: string[]): Promise<Map<string, LoadedRecord>> {
  const map = new Map<string, LoadedRecord>();
  if (ids.length === 0) return map;
  if (module === "leads") {
    const rows = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    for (const row of rows) {
      map.set(row.id, {
        id: row.id,
        email: row.email,
        contactId: null,
        dealId: row.convertedDealId,
        policyId: null,
        leadId: row.id,
        accountId: null,
        merge: {
          id: row.id,
          module,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          address: row.mailingAddress,
          city: row.city,
          state: row.state,
          zip: row.zip,
          status: row.status,
        },
      });
    }
  } else if (module === "contacts") {
    const rows = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    for (const row of rows) {
      map.set(row.id, {
        id: row.id,
        email: row.email,
        contactId: row.id,
        dealId: null,
        policyId: null,
        leadId: null,
        accountId: row.accountId,
        merge: {
          id: row.id,
          module,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          address: row.mailingAddress,
          city: row.city,
          state: row.state,
          zip: row.zip,
          status: row.status,
        },
      });
    }
  } else if (module === "deals") {
    const rows = await db
      .select({ deal: deals, contact: contacts })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), inArray(deals.id, ids)));
    for (const row of rows) {
      map.set(row.deal.id, {
        id: row.deal.id,
        email: row.contact?.email ?? null,
        contactId: row.deal.contactId,
        dealId: row.deal.id,
        policyId: null,
        leadId: row.deal.leadId,
        accountId: row.deal.accountId,
        merge: {
          id: row.deal.id,
          module,
          firstName: row.contact?.firstName ?? null,
          lastName: row.contact?.lastName ?? null,
          title: row.deal.title,
          email: row.contact?.email ?? null,
          phone: row.contact?.phone ?? null,
          address: row.deal.propertyOneliner ?? row.contact?.mailingAddress ?? null,
          city: row.contact?.city ?? null,
          state: row.deal.state,
          zip: row.contact?.zip ?? null,
          coverageA: row.deal.coverageAmount,
          status: row.deal.pipelineStage,
        },
      });
    }
  } else if (module === "policies") {
    const rows = await db
      .select({ policy: policies, contact: contacts })
      .from(policies)
      .leftJoin(contacts, eq(policies.contactId, contacts.id))
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), inArray(policies.id, ids)));
    for (const row of rows) {
      map.set(row.policy.id, {
        id: row.policy.id,
        email: row.contact?.email ?? null,
        contactId: row.policy.contactId,
        dealId: row.policy.dealId,
        policyId: row.policy.id,
        leadId: null,
        accountId: row.policy.accountId,
        merge: {
          id: row.policy.id,
          module,
          firstName: row.contact?.firstName ?? null,
          lastName: row.contact?.lastName ?? null,
          title: row.policy.policyNumber,
          email: row.contact?.email ?? null,
          phone: row.contact?.phone ?? null,
          status: row.policy.status,
        },
      });
    }
  } else {
    const rows = await db
      .select()
      .from(reviewTasks)
      .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), inArray(reviewTasks.id, ids)));
    for (const row of rows) {
      map.set(row.id, {
        id: row.id,
        email: null,
        contactId: row.contactId,
        dealId: row.dealId,
        policyId: row.policyId,
        leadId: null,
        accountId: row.accountId,
        merge: {
          id: row.id,
          module,
          title: row.title,
          status: row.status,
        },
      });
    }
  }
  return map;
}

async function applyFieldUpdates(
  module: DevHubModule,
  record: LoadedRecord,
  actions: MacroActions,
): Promise<boolean> {
  if (actions.fieldUpdates.length === 0) return false;
  const now = new Date();
  if (module === "leads") {
    const patch: Record<string, unknown> = { updatedAt: now };
    for (const update of actions.fieldUpdates) {
      if (update.field === "status") patch.status = update.value;
      if (update.field === "notes") patch.notes = update.value;
      if (update.field === "source") patch.source = update.value;
    }
    await db
      .update(leads)
      .set(patch)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, record.id)));
    return true;
  }
  if (module === "contacts") {
    const patch: Record<string, unknown> = { updatedAt: now };
    for (const update of actions.fieldUpdates) {
      if (update.field === "status") patch.status = update.value;
      if (update.field === "notes") patch.notes = update.value;
    }
    await db
      .update(contacts)
      .set(patch)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, record.id)));
    return true;
  }
  if (module === "deals") {
    const patch: Record<string, unknown> = { updatedAt: now };
    for (const update of actions.fieldUpdates) {
      if (update.field === "notes") patch.notes = update.value;
      if (update.field === "pipelineStage") patch.pipelineStage = update.value;
    }
    await db
      .update(deals)
      .set(patch)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, record.id)));
    return true;
  }
  if (module === "policies") {
    const patch: Record<string, unknown> = { updatedAt: now };
    for (const update of actions.fieldUpdates) {
      if (update.field === "status") patch.status = update.value;
    }
    if (Object.keys(patch).length === 1) return false;
    await db
      .update(policies)
      .set(patch)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, record.id)));
    return true;
  }
  const patch: Record<string, unknown> = {};
  for (const update of actions.fieldUpdates) {
    if (update.field === "status") patch.status = update.value;
  }
  if (Object.keys(patch).length === 0) return false;
  await db
    .update(reviewTasks)
    .set(patch)
    .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, record.id)));
  return true;
}

async function createMacroTasks(
  module: DevHubModule,
  record: LoadedRecord,
  actions: MacroActions,
): Promise<number> {
  let created = 0;
  for (const task of actions.createTasks) {
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + (task.dueInDays ?? 3));
    await db.insert(reviewTasks).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: record.contactId,
      accountId: record.accountId,
      policyId: record.policyId,
      dealId: record.dealId,
      kind: task.kind ?? "macro",
      title: `${task.title} · ${record.merge.name || record.merge.title || record.id}`,
      dueDate: due,
      status: "open",
    });
    await db.insert(activities).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "task",
      title: task.title,
      notes: `Created by Developer Hub macro on ${module}.`,
      status: "open",
      dueAt: due,
      contactId: record.contactId,
      accountId: record.accountId,
      dealId: record.dealId,
      policyId: record.policyId,
      leadId: record.leadId,
    });
    created += 1;
  }
  return created;
}

async function queueMacroEmail(record: LoadedRecord, actions: MacroActions): Promise<number> {
  if (!actions.email) return 0;
  let subject = actions.email.subject ?? "";
  let body = actions.email.body ?? "";
  if (actions.email.templateId) {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(eq(emailTemplates.tenantId, DEFAULT_TENANT_ID), eq(emailTemplates.id, actions.email.templateId)),
      );
    if (template) {
      subject = subject || template.subjectEn || template.subject || "";
      body = body || template.bodyEn || template.body || "";
    }
  }
  const now = new Date();
  await db.insert(emailSendJobs).values({
    tenantId: DEFAULT_TENANT_ID,
    templateId: actions.email.templateId ?? null,
    contactId: record.contactId,
    accountId: record.accountId,
    dealId: record.dealId,
    policyId: record.policyId,
    anchorKind: "macro",
    anchorAt: now,
    scheduledFor: now,
    status: "queued",
    toEmail: record.email,
    subject: mergeTokens(subject, record.merge),
    body: mergeTokens(body, record.merge),
    sendFromProvider: "stub",
  });
  return 1;
}
