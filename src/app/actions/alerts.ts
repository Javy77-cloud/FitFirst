"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { alertVisibleWhere } from "@/lib/alerts/visibility";
import { currentDeskSession } from "@/lib/auth/session";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isDeskUuid } from "@/lib/desk-id";
import { db } from "@/lib/db";
import { alerts, reviewTasks } from "@/lib/db/schema";
import { flashAction } from "@/lib/flash-action";
import { isSnoozeDelayUnit, snoozeDueAt } from "@/lib/leads/follow-up-templates";
import { taskDueFromForm, taskReminderFireAt } from "@/lib/tasks/due-at";
import {
  composeDeskTaskTitle,
  isDeskTaskType,
} from "@/lib/tasks/task-types";
import { defaultFieldsForModule } from "@/lib/custom-fields/modules";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import { applyModuleSystemValues } from "@/lib/custom-fields/record-system";
import { listFieldDefs, writeRecordValues } from "@/lib/custom-fields/store";
import { normalizeTags, parseTagsFromForm } from "@/lib/tags/module-tags";
import { isActiveNotice, parseNoticeType } from "@/lib/deals/notices";
import { parseDealProduct } from "@/lib/deals/deal-products";
import {
  completeLinkedDealNoticeForTask,
  linkDealProductNoticeTask,
  persistNoticeTypesFromTaskForm,
} from "@/app/actions/product-stage";

function revalidateNotificationSurfaces() {
  revalidatePath("/");
  revalidatePath("/alerts");
  revalidatePath("/notifications");
}

export async function markAlertRead(formData: FormData) {
  const id = String(formData.get("alertId") ?? "");
  if (!id) return;
  const session = await currentDeskSession();
  const visible = alertVisibleWhere(session, DEFAULT_TENANT_ID);
  await db.update(alerts).set({ readAt: new Date() }).where(and(eq(alerts.id, id), visible));
  revalidateNotificationSurfaces();
}

export async function markAllAlertsRead() {
  const session = await currentDeskSession();
  const visible = alertVisibleWhere(session, DEFAULT_TENANT_ID);
  await db
    .update(alerts)
    .set({ readAt: new Date() })
    .where(and(visible, isNull(alerts.readAt)));
  revalidateNotificationSurfaces();
}

export async function markSelectedAlertsRead(formData: FormData) {
  const raw = String(formData.get("alertIds") ?? "");
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) return { updated: 0 };
  const session = await currentDeskSession();
  const visible = alertVisibleWhere(session, DEFAULT_TENANT_ID);
  const now = new Date();
  let updated = 0;
  for (const id of ids) {
    const result = await db
      .update(alerts)
      .set({ readAt: now })
      .where(and(eq(alerts.id, id), visible, isNull(alerts.readAt)))
      .returning({ id: alerts.id });
    updated += result.length;
  }
  revalidateNotificationSurfaces();
  return { updated };
}

export async function completeTask(formData: FormData) {
  const id = String(formData.get("taskId") ?? "");
  await db
    .update(reviewTasks)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(reviewTasks.id, id));
  const clearNotice = String(formData.get("clearNotice") ?? "") === "1";
  const noticeNotes = String(formData.get("noticeNotes") ?? formData.get("notes") ?? "").trim();
  if (id && clearNotice) {
    await completeLinkedDealNoticeForTask(id, noticeNotes);
  }
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/deals");
  if (id) revalidatePath(`/tasks/${id}`);
}


/** Sitewide Create Task form — review_tasks with linked record + assignee. */
export async function createDeskTask(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) return;

  const kindRaw = String(formData.get("kind") ?? "work_reminder").trim();
  const kind = isDeskTaskType(kindRaw) ? kindRaw : "work_reminder";
  const notes = String(formData.get("titleNotes") ?? "").trim();
  const titleRaw = String(formData.get("title") ?? "").trim();
  const title = titleRaw || composeDeskTaskTitle(kind, notes);

  const contactId = isDeskUuid(String(formData.get("contactId") ?? ""))
    ? String(formData.get("contactId")).trim()
    : null;
  const dealId = isDeskUuid(String(formData.get("dealId") ?? ""))
    ? String(formData.get("dealId")).trim()
    : null;
  const policyId = isDeskUuid(String(formData.get("policyId") ?? ""))
    ? String(formData.get("policyId")).trim()
    : null;
  const accountId = isDeskUuid(String(formData.get("accountId") ?? ""))
    ? String(formData.get("accountId")).trim()
    : null;
  const leadId = isDeskUuid(String(formData.get("leadId") ?? ""))
    ? String(formData.get("leadId")).trim()
    : null;
  const recordId = isDeskUuid(String(formData.get("recordId") ?? ""))
    ? String(formData.get("recordId")).trim()
    : null;
  const recordType = String(formData.get("recordType") ?? "").trim();
  if (!recordId) return;

  const assigneeRaw = String(formData.get("assigneeId") ?? "").trim();
  const assigneeId = isDeskUuid(assigneeRaw) ? assigneeRaw : session.userId;

  const dueDate = taskDueFromForm(formData);

  // Ensure FK columns match picked record type when only recordId was set.
  let contact = contactId;
  let deal = dealId;
  let policy = policyId;
  let account = accountId;
  let lead = leadId;
  if (recordType === "contact" && !contact) contact = recordId;
  if (recordType === "deal" && !deal) deal = recordId;
  if (recordType === "policy" && !policy) policy = recordId;
  if (recordType === "business" && !account) account = recordId;
  if (recordType === "lead" && !lead) lead = recordId;

  const statusFromField = String(formData.get("field_status") ?? "").trim();
  const initialStatus = statusFromField || "open";

  const [row] = await db
    .insert(reviewTasks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      title,
      kind,
      dueDate,
      status: initialStatus,
      contactId: contact,
      dealId: deal,
      policyId: policy,
      accountId: account,
      leadId: lead,
      assigneeId,
      ...(initialStatus === "done" ? { completedAt: new Date() } : {}),
    })
    .returning();

  if (row) {
    const defs = await listFieldDefs("tasks").catch(() => defaultFieldsForModule("tasks"));
    const custom = customValuesFromForm(formData, defs);
    if (Object.keys(custom).length > 0) {
      await writeRecordValues(row.id, custom, "tasks");
    }
    const taskTags = normalizeTags([
      ...parseTagsFromForm(formData),
      ...(custom.tags != null ? [custom.tags] : []),
    ]);
    if (taskTags.length > 0) {
      await db.update(reviewTasks).set({ tags: taskTags }).where(eq(reviewTasks.id, row.id));
    }
    // Keep review_tasks.status in sync when layout status picklist is present.
    if (statusFromField && statusFromField !== initialStatus) {
      await db
        .update(reviewTasks)
        .set({
          status: statusFromField,
          ...(statusFromField === "done" ? { completedAt: new Date() } : {}),
        })
        .where(eq(reviewTasks.id, row.id));
    }
    await applyModuleSystemValues(
      "tasks",
      row.id,
      {
        ...custom,
        title,
        kind,
        dueDate: dueDate.toISOString(),
        due_date: dueDate.toISOString(),
        assigneeId: assigneeId ?? "",
        assignee: assigneeId ?? "",
        status: statusFromField || custom.status || initialStatus,
      },
      defs,
    );
  }

  if (row) {
    await scheduleDeskTaskReminder({
      taskId: row.id,
      title,
      dueDate,
      userId: assigneeId ?? session.userId,
    });
    const noticeType = parseNoticeType(formData.get("noticeType"));
    const noticeProduct = parseDealProduct(String(formData.get("noticeProduct") ?? ""));
    if (deal && noticeProduct && isActiveNotice(noticeType)) {
      await persistNoticeTypesFromTaskForm(formData);
      await linkDealProductNoticeTask({
        dealId: deal,
        product: noticeProduct,
        noticeType,
        taskId: row.id,
      });
    }
  }

  await emitDeskEvent("task.due", {
    title,
    dueDate: dueDate.toISOString(),
    dealId: deal,
    contactId: contact,
    policyId: policy,
  });
  revalidateTasks({ dealId: deal, contactId: contact, policyId: policy });
  if (account) revalidatePath(`/businesses/${account}`);
  if (lead) revalidatePath(`/leads/${lead}`);
  if (row) revalidatePath(`/tasks/${row.id}`);

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (returnTo.startsWith("/")) {
    flashAction(returnTo, "task-saved");
    return;
  }
  if (row) flashAction(`/tasks/${row.id}`, "task-saved");
}

export async function createReviewTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const contactRaw = String(formData.get("contactId") ?? "").trim();
  const dealRaw = String(formData.get("dealId") ?? "").trim();
  const policyRaw = String(formData.get("policyId") ?? "").trim();
  const contactId = isDeskUuid(contactRaw) ? contactRaw : null;
  const dealId = isDeskUuid(dealRaw) ? dealRaw : null;
  const policyId = isDeskUuid(policyRaw) ? policyRaw : null;
  const kind = String(formData.get("kind") ?? "30_day").trim() || "30_day";
  const dueDate = taskDueFromForm(formData);
  if (!title) return;
  const [row] = await db
    .insert(reviewTasks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      title,
      kind,
      dueDate,
      status: "open",
      contactId,
      dealId,
      policyId,
    })
    .returning();
  revalidatePath("/tasks");
  if (row) flashAction(`/tasks/${row.id}`, "task-saved");
}

/** In-app popup fires at `dueDate` (`createdAt` is the notify instant). */
async function scheduleDeskTaskReminder(input: {
  taskId: string;
  title: string;
  dueDate: Date;
  userId?: string | null;
}) {
  const fireAt = taskReminderFireAt(input.dueDate);
  const [existing] = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.kind, "task_reminder"),
        eq(alerts.entityType, "review_task"),
        eq(alerts.entityId, input.taskId),
        isNull(alerts.readAt),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(alerts)
      .set({ title: input.title, createdAt: fireAt })
      .where(eq(alerts.id, existing.id));
    return;
  }
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "task_reminder",
    title: input.title,
    body: `In-app task reminder (at due time). Nothing emailed.`,
    severity: "info",
    entityType: "review_task",
    entityId: input.taskId,
    userId: input.userId ?? null,
    recipientUserId: input.userId ?? null,
    createdAt: fireAt,
  });
}

function revalidateTasks(task?: { contactId?: string | null; policyId?: string | null; dealId?: string | null }) {
  revalidatePath("/");
  revalidatePath("/reviews");
  revalidatePath("/tasks");
  revalidatePath("/alerts");
  revalidatePath("/policies");
  revalidatePath("/contacts");
  revalidatePath("/deals");
  if (task?.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task?.policyId) revalidatePath(`/policies/${task.policyId}`);
  if (task?.dealId) revalidatePath(`/deals/${task.dealId}`);
}

function alertStr(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createTask(formData: FormData) {
  const title = alertStr(formData, "title") || "Follow-up";
  const kind = alertStr(formData, "kind") || "task";
  const dueDate = taskDueFromForm(formData);
  const dealId = alertStr(formData, "dealId") || null;
  const contactId = alertStr(formData, "contactId") || null;
  const policyId = alertStr(formData, "policyId") || null;

  await db.insert(reviewTasks).values({
    tenantId: DEFAULT_TENANT_ID,
    title,
    kind,
    dueDate,
    status: "open",
    dealId,
    contactId,
    policyId,
  });
  await emitDeskEvent("task.due", { title, dueDate: dueDate.toISOString(), dealId, contactId, policyId });
  revalidateTasks({ dealId, contactId, policyId });
}

export async function updateTask(formData: FormData) {
  const id = alertStr(formData, "taskId");
  const title = alertStr(formData, "title") || "Follow-up";
  const kind = alertStr(formData, "kind") || "task";
  const status = alertStr(formData, "status") || "open";
  const dueDate = taskDueFromForm(formData);

  const [task] = await db.select().from(reviewTasks).where(eq(reviewTasks.id, id));
  await db
    .update(reviewTasks)
    .set({
      title,
      kind,
      status,
      dueDate,
      completedAt: status === "done" ? (task?.completedAt ?? new Date()) : null,
    })
    .where(eq(reviewTasks.id, id));
  if (id) {
    await scheduleDeskTaskReminder({
      taskId: id,
      title,
      dueDate,
      userId: task?.assigneeId,
    });
  }
  revalidateTasks(task);
  flashAction("/tasks", "task-saved");
}

export async function deleteTask(formData: FormData) {
  const id = alertStr(formData, "taskId");
  const [task] = await db.select().from(reviewTasks).where(eq(reviewTasks.id, id));
  await db.delete(reviewTasks).where(eq(reviewTasks.id, id));
  revalidateTasks(task);
}

export async function updateReviewTask(formData: FormData) {
  const id = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim()
    ? taskDueFromForm(formData)
    : null;
  if (!id || !title) return;
  await db
    .update(reviewTasks)
    .set({
      title,
      status: status || "open",
      ...(dueDate ? { dueDate } : {}),
      completedAt: status === "done" || status === "completed" ? new Date() : null,
    })
    .where(eq(reviewTasks.id, id));
  if (dueDate) {
    await scheduleDeskTaskReminder({ taskId: id, title, dueDate });
  }
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  flashAction(`/tasks/${id}`, "changes-saved");
}

/** Snooze any in-app popup alert (playbook / task reminder). Re-fires later via createdAt. */
export async function snoozeDeskAlert(formData: FormData) {
  const alertId = alertStr(formData, "alertId");
  const amount = Number(alertStr(formData, "amount"));
  const unitRaw = alertStr(formData, "unit");
  if (!alertId || !Number.isFinite(amount) || amount < 1 || !isSnoozeDelayUnit(unitRaw)) {
    return { ok: false as const };
  }
  const now = new Date();
  const dueAt = snoozeDueAt(now, amount, unitRaw);
  const [alert] = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.tenantId, DEFAULT_TENANT_ID), eq(alerts.id, alertId)));
  if (!alert) return { ok: false as const };

  await db.update(alerts).set({ readAt: now }).where(eq(alerts.id, alertId));
  await db.insert(alerts).values({
    tenantId: alert.tenantId,
    kind: alert.kind,
    title: alert.title,
    body: alert.body,
    severity: alert.severity,
    entityType: alert.entityType,
    entityId: alert.entityId,
    userId: alert.userId,
    recipientUserId: alert.recipientUserId,
    createdAt: dueAt,
  });
  revalidateNotificationSurfaces();
  return { ok: true as const, dueAt: dueAt.toISOString() };
}

