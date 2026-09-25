/**
 * Shared off-book handler. There is no separate "archived" policy status.
 * Off-book means lapsed / cancelled / non_renewed / expired (plus legacy aliases).
 *
 * Call after the policy row is already saved with an off-book status.
 * Idempotent: already-prior terms, closed renewal work, read signals, and
 * archive-stage queue rows are left alone.
 *
 * Parks an existing renewals-queue row onto the archive stage (the renewals
 * desk parking lot). Does not insert a queue row when the policy was never queued.
 */
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, policyAutomations, renewalQueue, reviewTasks } from "@/lib/db/schema";
import { isRenewalArchiveStage, isRenewalShoppingStage } from "@/lib/renewal/board-filter";
import {
  demoteCurrentOnOffBookStatusMany,
  shouldDemoteCurrentForStatus,
} from "@/lib/policy/offbook-demote-current";

/** Date-automation jobs + the review tasks syncPolicyDateAutomations mirrors. */
export const OFF_BOOK_RENEWAL_WORK_KINDS = ["renewal_30", "renewal_60"] as const;

/** Chase signals cleared the same way Client staying marks them read. */
export const OFF_BOOK_SIGNAL_KINDS = ["renewal_autopilot", "renewal_silence"] as const;

/** Existing renewals-desk archive stage. Not a policy status. */
export const OFF_BOOK_QUEUE_STAGE = "archive" as const;

const CLOSED_WORK_STATUSES = new Set(["done", "closed", "cancelled", "canceled", "completed", "complete"]);

export function shouldApplyOffBookEffects(nextStatus: string | null | undefined): boolean {
  return shouldDemoteCurrentForStatus(nextStatus);
}

export type OffBookWorkRow = {
  id: string;
  kind: string;
  status?: string | null;
};

/** renewal_30 / renewal_60 rows that are still open. */
export function planOffBookWorkClosures(rows: readonly OffBookWorkRow[]): string[] {
  const kinds = new Set<string>(OFF_BOOK_RENEWAL_WORK_KINDS);
  return rows
    .filter((row) => {
      if (!kinds.has(row.kind)) return false;
      return !CLOSED_WORK_STATUSES.has((row.status ?? "").trim().toLowerCase());
    })
    .map((row) => row.id);
}

export type OffBookSignalRow = {
  id: string;
  kind: string;
  readAt?: Date | string | null;
  entityType?: string | null;
  entityId?: string | null;
  body?: string | null;
};

export function signalBelongsToPolicy(row: OffBookSignalRow, policyId: string): boolean {
  if (row.entityType === "policy" && row.entityId === policyId) return true;
  const body = row.body ?? "";
  // Panel keys are `renewal_autopilot:<id>:<band>` and `renewal_silence:<id>`.
  // Require the following delimiter so a shorter id cannot match a longer one.
  return (
    body.includes(`renewal_autopilot:${policyId}:`) ||
    body.includes(`renewal_silence:${policyId}-->`) ||
    body.includes(`renewal_silence:${policyId}"`)
  );
}

/** Unread autopilot + renewal-silence alerts for this policy. */
export function planOffBookSignalDismissals(
  rows: readonly OffBookSignalRow[],
  policyId: string,
): string[] {
  const id = policyId.trim();
  if (!id) return [];
  const kinds = new Set<string>(OFF_BOOK_SIGNAL_KINDS);
  return rows
    .filter((row) => {
      if (row.readAt) return false;
      if (!kinds.has(row.kind)) return false;
      return signalBelongsToPolicy(row, id);
    })
    .map((row) => row.id);
}

/**
 * Stage to write on an existing renewals-queue row.
 * Null when the row is already on the archive parking lot.
 */
export function nextOffBookQueueStage(stage: string | null | undefined): typeof OFF_BOOK_QUEUE_STAGE | null {
  if (isRenewalArchiveStage(stage ?? "")) return null;
  return OFF_BOOK_QUEUE_STAGE;
}

/** True when the parked stage is off the active renewals shopping columns. */
export function offBookQueueStageLeavesShopping(stage: string): boolean {
  return !isRenewalShoppingStage(stage);
}

export type OffBookEffectsResult = {
  documentsDemoted: number;
  termsDemoted: number;
  automationsClosed: number;
  tasksClosed: number;
  signalsDismissed: number;
  queuesParked: number;
};

function emptyEffects(): OffBookEffectsResult {
  return {
    documentsDemoted: 0,
    termsDemoted: 0,
    automationsClosed: 0,
    tasksClosed: 0,
    signalsDismissed: 0,
    queuesParked: 0,
  };
}

export async function closeOffBookRenewalWork(
  policyIds: readonly string[],
): Promise<{ automationsClosed: number; tasksClosed: number }> {
  const ids = uniqueIds(policyIds);
  if (ids.length === 0) return { automationsClosed: 0, tasksClosed: 0 };

  const automations = await db
    .select({
      id: policyAutomations.id,
      kind: policyAutomations.kind,
      status: policyAutomations.status,
    })
    .from(policyAutomations)
    .where(
      and(
        eq(policyAutomations.tenantId, DEFAULT_TENANT_ID),
        inArray(policyAutomations.policyId, ids),
        inArray(policyAutomations.kind, [...OFF_BOOK_RENEWAL_WORK_KINDS]),
      ),
    );
  const automationIds = planOffBookWorkClosures(automations);
  if (automationIds.length > 0) {
    await db
      .update(policyAutomations)
      .set({ status: "closed", updatedAt: new Date() })
      .where(inArray(policyAutomations.id, automationIds));
  }

  const tasks = await db
    .select({
      id: reviewTasks.id,
      kind: reviewTasks.kind,
      status: reviewTasks.status,
    })
    .from(reviewTasks)
    .where(
      and(
        eq(reviewTasks.tenantId, DEFAULT_TENANT_ID),
        inArray(reviewTasks.policyId, ids),
        inArray(reviewTasks.kind, [...OFF_BOOK_RENEWAL_WORK_KINDS]),
      ),
    );
  const taskIds = planOffBookWorkClosures(tasks);
  if (taskIds.length > 0) {
    await db
      .update(reviewTasks)
      .set({ status: "done", completedAt: new Date() })
      .where(inArray(reviewTasks.id, taskIds));
  }

  return { automationsClosed: automationIds.length, tasksClosed: taskIds.length };
}

async function dismissOffBookSignals(policyIds: readonly string[]): Promise<number> {
  const ids = uniqueIds(policyIds);
  if (ids.length === 0) return 0;

  const rows = await db
    .select({
      id: alerts.id,
      kind: alerts.kind,
      readAt: alerts.readAt,
      entityType: alerts.entityType,
      entityId: alerts.entityId,
      body: alerts.body,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        inArray(alerts.kind, [...OFF_BOOK_SIGNAL_KINDS]),
        isNull(alerts.readAt),
      ),
    );

  const dismissIds = [
    ...new Set(ids.flatMap((policyId) => planOffBookSignalDismissals(rows, policyId))),
  ];
  if (dismissIds.length === 0) return 0;
  await db.update(alerts).set({ readAt: new Date() }).where(inArray(alerts.id, dismissIds));
  return dismissIds.length;
}

async function parkOffBookRenewalQueue(policyIds: readonly string[]): Promise<number> {
  const ids = uniqueIds(policyIds);
  if (ids.length === 0) return 0;

  const rows = await db
    .select({ id: renewalQueue.id, stage: renewalQueue.stage })
    .from(renewalQueue)
    .where(and(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID), inArray(renewalQueue.policyId, ids)));

  const parkIds = rows.filter((row) => nextOffBookQueueStage(row.stage) != null).map((row) => row.id);
  if (parkIds.length === 0) return 0;
  await db
    .update(renewalQueue)
    .set({ stage: OFF_BOOK_QUEUE_STAGE, updatedAt: new Date() })
    .where(inArray(renewalQueue.id, parkIds));
  return parkIds.length;
}

function uniqueIds(policyIds: readonly string[]): string[] {
  return [...new Set(policyIds.map((id) => id.trim()).filter(Boolean))];
}

function revalidateOffBookSurfaces() {
  try {
    revalidatePath("/policies");
    revalidatePath("/renewals");
    revalidatePath("/renewals/queue");
    revalidatePath("/tasks");
    revalidatePath("/notifications");
  } catch {
    // Render-time or test callers have no revalidate store.
  }
}

/** One policy. Safe to re-run after the status is already off-book. */
export async function applyOffBookEffects(policyId: string): Promise<OffBookEffectsResult> {
  return applyOffBookEffectsMany([policyId]);
}

/** Mass status edits. Caller has already written the off-book status. */
export async function applyOffBookEffectsMany(
  policyIds: readonly string[],
): Promise<OffBookEffectsResult> {
  const ids = uniqueIds(policyIds);
  if (ids.length === 0) return emptyEffects();

  const demoted = await demoteCurrentOnOffBookStatusMany(ids);
  const work = await closeOffBookRenewalWork(ids);
  const signalsDismissed = await dismissOffBookSignals(ids);
  const queuesParked = await parkOffBookRenewalQueue(ids);
  revalidateOffBookSurfaces();

  return {
    documentsDemoted: demoted.documentsDemoted,
    termsDemoted: demoted.termsDemoted,
    automationsClosed: work.automationsClosed,
    tasksClosed: work.tasksClosed,
    signalsDismissed,
    queuesParked,
  };
}
