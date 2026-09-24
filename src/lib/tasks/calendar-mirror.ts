/**
 * Mirror desk review_tasks onto Calendar `activities` so Create Notice / Create Task
 * land on the Desk Calendar and can sync to Google — same ET due instant.
 */
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { reviewTaskActivitySourceId } from "@/lib/time/et";

export async function upsertReviewTaskCalendarActivity(input: {
  taskId: string;
  title: string;
  dueDate: Date;
  status?: string | null;
  assigneeId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
}): Promise<{ id: string } | null> {
  const sourceId = reviewTaskActivitySourceId(input.taskId);
  const status = (input.status ?? "open").toLowerCase() === "done" ? "completed" : "open";
  const endAt = new Date(input.dueDate.getTime() + 30 * 60 * 1000);
  const values = {
    tenantId: DEFAULT_TENANT_ID,
    kind: "task" as const,
    title: input.title,
    status,
    dueAt: input.dueDate,
    startAt: input.dueDate,
    endAt,
    assignee: input.assigneeId ?? null,
    contactId: input.contactId ?? null,
    dealId: input.dealId ?? null,
    policyId: input.policyId ?? null,
    accountId: input.accountId ?? null,
    leadId: input.leadId ?? null,
    sourceId,
  };

  const [existing] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.sourceId, sourceId)))
    .limit(1);

  if (existing) {
    await db
      .update(activities)
      .set({
        title: values.title,
        status: values.status,
        dueAt: values.dueAt,
        startAt: values.startAt,
        endAt: values.endAt,
        assignee: values.assignee,
        contactId: values.contactId,
        dealId: values.dealId,
        policyId: values.policyId,
        accountId: values.accountId,
        leadId: values.leadId,
      })
      .where(eq(activities.id, existing.id));
    await pushCalendar(existing.id, values.title, values.startAt, values.endAt);
    return existing;
  }

  const [row] = await db.insert(activities).values(values).returning({ id: activities.id });
  if (row) {
    await pushCalendar(row.id, values.title, values.startAt, values.endAt);
  }
  return row ?? null;
}

async function pushCalendar(
  id: string,
  title: string,
  startAt: Date,
  endAt: Date,
) {
  try {
    const { pushDeskActivityToCalendars } = await import("@/lib/integrations/calendar-event-sync");
    await pushDeskActivityToCalendars({ id, title, startAt, endAt }).catch(() => undefined);
  } catch {
    /* optional Google push */
  }
}
