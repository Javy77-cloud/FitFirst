import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  alerts,
  clientHistory,
  policies,
  policyWorkFlags,
  policyWorkItems,
  policyWorkNotes,
  reviewTasks,
  users,
} from "@/lib/db/schema";
import {
  WORK_PING_KIND,
  WORK_REMINDER_KIND,
  defaultReminderDue,
  isWorkFlag,
  isWorkStatus,
  workFlagLabel,
  workStatusLabel,
  type WorkFlag,
  type WorkStatus,
} from "./types";

function tenantId() {
  return DEFAULT_TENANT_ID;
}

export async function ensureWorkItem(policyId: string) {
  const [existing] = await db
    .select()
    .from(policyWorkItems)
    .where(
      and(eq(policyWorkItems.tenantId, tenantId()), eq(policyWorkItems.policyId, policyId)),
    );
  if (existing) return existing;

  const [created] = await db
    .insert(policyWorkItems)
    .values({
      tenantId: tenantId(),
      policyId,
      workStatus: "ready",
    })
    .returning();
  return created;
}

export async function assignWorkItem(policyId: string, assigneeId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId()), eq(users.id, assigneeId)));
  if (!user) throw new Error("Assignee must be an Admin or Agent user.");

  const item = await ensureWorkItem(policyId);
  const [updated] = await db
    .update(policyWorkItems)
    .set({ assigneeId: user.id, updatedAt: new Date() })
    .where(eq(policyWorkItems.id, item.id))
    .returning();
  return updated;
}

export async function setWorkStatus(policyId: string, workStatus: string) {
  if (!isWorkStatus(workStatus)) {
    throw new Error("Unknown work status.");
  }
  const item = await ensureWorkItem(policyId);
  const [updated] = await db
    .update(policyWorkItems)
    .set({ workStatus, updatedAt: new Date() })
    .where(eq(policyWorkItems.id, item.id))
    .returning();
  return updated;
}

export async function toggleWorkFlag(input: {
  policyId: string;
  flag: string;
  actorId: string;
  on: boolean;
}) {
  if (!isWorkFlag(input.flag)) throw new Error("Unknown work flag.");
  const item = await ensureWorkItem(input.policyId);
  const [open] = await db
    .select()
    .from(policyWorkFlags)
    .where(
      and(
        eq(policyWorkFlags.tenantId, tenantId()),
        eq(policyWorkFlags.workItemId, item.id),
        eq(policyWorkFlags.flag, input.flag),
        isNull(policyWorkFlags.clearedAt),
      ),
    );

  if (input.on) {
    if (open) return { item, flag: open, changed: false };
    const [created] = await db
      .insert(policyWorkFlags)
      .values({
        tenantId: tenantId(),
        workItemId: item.id,
        policyId: input.policyId,
        flag: input.flag,
        createdBy: input.actorId,
      })
      .returning();
    return { item, flag: created, changed: true };
  }

  if (!open) return { item, flag: null, changed: false };
  const [cleared] = await db
    .update(policyWorkFlags)
    .set({ clearedAt: new Date() })
    .where(eq(policyWorkFlags.id, open.id))
    .returning();
  return { item, flag: cleared, changed: true };
}

export async function addWorkNote(input: {
  policyId: string;
  authorId: string;
  body: string;
}) {
  const body = input.body.trim();
  if (!body) throw new Error("Note cannot be empty.");
  const item = await ensureWorkItem(input.policyId);
  const [note] = await db
    .insert(policyWorkNotes)
    .values({
      tenantId: tenantId(),
      workItemId: item.id,
      authorId: input.authorId,
      body,
    })
    .returning();
  return { item, note };
}

export async function notifyAssignee(input: {
  policyId: string;
  actorId: string;
  message: string;
  dueDate?: Date | null;
}) {
  const message = input.message.trim();
  if (!message) throw new Error("Reminder needs a message.");

  const item = await ensureWorkItem(input.policyId);
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenantId()), eq(policies.id, input.policyId)));
  if (!policy) throw new Error("Policy not found.");

  const dueDate = input.dueDate ?? defaultReminderDue();
  const title = `${message.slice(0, 80)}${message.length > 80 ? "…" : ""} · ${policy.policyNumber}`;

  const [task] = await db
    .insert(reviewTasks)
    .values({
      tenantId: tenantId(),
      contactId: policy.contactId,
      policyId: policy.id,
      dealId: policy.dealId,
      kind: WORK_REMINDER_KIND,
      title,
      dueDate,
      status: "open",
      workItemId: item.id,
    })
    .returning();

  const [alert] = await db
    .insert(alerts)
    .values({
      tenantId: tenantId(),
      kind: WORK_PING_KIND,
      title: `Work ping · ${policy.policyNumber}`,
      body: `${message} Due ${dueDate.toISOString().slice(0, 10)}. In-desk only — no broker email.`,
      severity: "warning",
      entityType: "policy",
      entityId: policy.id,
    })
    .returning();

  await db.insert(clientHistory).values({
    tenantId: tenantId(),
    contactId: policy.contactId,
    dealId: policy.dealId,
    policyId: policy.id,
    eventType: "work_ping",
    body: `In-app Task for ${policy.policyNumber}: ${message}`,
    occurredAt: new Date(),
  });

  return { item, task, alert };
}

export function describeWork(status: WorkStatus | string, flags: WorkFlag[] | string[]) {
  const flagCopy = flags.map((flag) => workFlagLabel(flag)).join(", ");
  return {
    workStatus: workStatusLabel(status),
    flags: flagCopy || "No flags",
  };
}
