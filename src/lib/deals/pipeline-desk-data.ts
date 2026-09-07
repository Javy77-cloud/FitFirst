import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import {
  countTodayDealActivity,
  filterTodayDealActivity,
  isDealTodayActivityType,
  nextDealActionAt,
  type DealActivityTouch,
  type DealTodayActivityType,
} from "./pipeline-desk";

export async function listDealDeskActivities(): Promise<DealActivityTouch[]> {
  const rows = await db
    .select({
      id: activities.id,
      dealId: activities.dealId,
      kind: activities.kind,
      title: activities.title,
      status: activities.status,
      dueAt: activities.dueAt,
      startAt: activities.startAt,
      meetingType: activities.meetingType,
    })
    .from(activities)
    .where(eq(activities.tenantId, DEFAULT_TENANT_ID));
  return rows;
}

export async function loadDealPipelineDesk(queue?: string | null) {
  const rows = await listDealDeskActivities();
  const now = new Date();
  const todayCounts = countTodayDealActivity(rows, now);
  const queueType = isDealTodayActivityType(queue) ? queue : null;
  const queueItems = queueType ? filterTodayDealActivity(rows, queueType, now) : [];
  const nextByDeal = new Map<string, string>();
  const byDeal = new Map<string, DealActivityTouch[]>();
  for (const row of rows) {
    if (!row.dealId) continue;
    const list = byDeal.get(row.dealId) ?? [];
    list.push(row);
    byDeal.set(row.dealId, list);
  }
  for (const [dealId, list] of byDeal) {
    const due = nextDealActionAt({ activities: list });
    if (due) nextByDeal.set(dealId, due.toISOString());
  }
  return { rows, todayCounts, queueType, queueItems, nextByDeal, byDeal };
}

export function nextActionIsoForDeal(
  dealId: string,
  nextByDeal: Map<string, string>,
  updatedAt?: Date | string | null,
): string | null {
  if (nextByDeal.has(dealId)) return nextByDeal.get(dealId) ?? null;
  const due = nextDealActionAt({ updatedAt });
  return due ? due.toISOString() : null;
}

export async function loadDealActivitiesFor(dealId: string): Promise<DealActivityTouch[]> {
  return db
    .select({
      id: activities.id,
      dealId: activities.dealId,
      kind: activities.kind,
      title: activities.title,
      status: activities.status,
      dueAt: activities.dueAt,
      startAt: activities.startAt,
      meetingType: activities.meetingType,
    })
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.dealId, dealId)));
}

export type { DealTodayActivityType };
