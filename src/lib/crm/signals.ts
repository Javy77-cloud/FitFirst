import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, reviewTasks } from "@/lib/db/schema";

export type CrmSignalKind =
  | "lead_converted"
  | "stage_moved"
  | "meeting_scheduled"
  | "comms_queued"
  | "comms_held"
  | "sheet_invalidated";

export type CrmSignalInput = {
  kind: CrmSignalKind;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  taskKind?: string;
  dueInDays?: number;
  createTask?: boolean;
  severity?: string;
};

export function crmSignalDefaults(kind: CrmSignalKind): {
  taskKind: string;
  dueInDays: number;
  createTask: boolean;
  severity: string;
} {
  if (kind === "lead_converted") {
    return { taskKind: "convert_followup", dueInDays: 1, createTask: true, severity: "info" };
  }
  if (kind === "meeting_scheduled") {
    return { taskKind: "meeting", dueInDays: 0, createTask: true, severity: "info" };
  }
  if (kind === "stage_moved") {
    return { taskKind: "stage_move", dueInDays: 1, createTask: false, severity: "info" };
  }
  if (kind === "comms_held") {
    return { taskKind: "comms_hold", dueInDays: 0, createTask: false, severity: "warning" };
  }
  if (kind === "sheet_invalidated") {
    return { taskKind: "sheet_invalidated", dueInDays: 0, createTask: false, severity: "info" };
  }
  return { taskKind: "comms_queue", dueInDays: 0, createTask: false, severity: "info" };
}

export function shouldCreateStageTask(stageSlug: string) {
  return stageSlug === "quote_sent" || stageSlug === "closed_lost" || stageSlug === "quotes" || stageSlug === "review";
}

export async function writeCrmSignals(input: CrmSignalInput) {
  const defaults = crmSignalDefaults(input.kind);
  const createTask = input.createTask ?? defaults.createTask;
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + (input.dueInDays ?? defaults.dueInDays));

  const [alert] = await db
    .insert(alerts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: input.kind,
      title: input.title,
      body: input.body,
      severity: input.severity ?? defaults.severity,
      entityType: input.entityType ?? (input.dealId ? "deal" : input.contactId ? "contact" : input.accountId ? "account" : null),
      entityId: input.entityId ?? input.dealId ?? input.contactId ?? input.accountId ?? input.policyId ?? null,
      userId: input.userId ?? null,
      recipientUserId: input.userId ?? null,
    })
    .returning();

  let task: typeof reviewTasks.$inferSelect | null = null;
  if (createTask) {
    const [row] = await db
      .insert(reviewTasks)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        title: input.title,
        kind: input.taskKind ?? defaults.taskKind,
        dueDate: due,
        status: "open",
        contactId: input.contactId ?? null,
        accountId: input.accountId ?? null,
        dealId: input.dealId ?? null,
        policyId: input.policyId ?? null,
      })
      .returning();
    task = row ?? null;
  }

  return { alert, task };
}

export async function writeCrmSignalsSafe(input: CrmSignalInput) {
  try {
    return await writeCrmSignals(input);
  } catch {
    return { alert: null, task: null };
  }
}
