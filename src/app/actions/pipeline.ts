"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, deals, pipelines } from "@/lib/db/schema";
import {
  archiveCancelsEmailJobs,
  canonicalizePipelineSlug,
  dealStageForPipeline,
  isArchiveStage,
} from "@/lib/wire/pipeline";
import { isBoardNoopStage } from "@/lib/deals/product-stages";
import { shouldCreateStageTask, writeCrmSignalsSafe } from "@/lib/crm/signals";
import {
  DEAL_ARCHIVE_REMINDER_KIND,
  dealArchiveReminderBody,
  dealArchiveReminderTitle,
} from "@/lib/deals/archive-reminder";
import { isSnoozeDelayUnit, snoozeDueAt, type SnoozeDelayUnit } from "@/lib/leads/follow-up-templates";
import { currentDeskSession } from "@/lib/auth/session";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function pipelineBySlug(slug: string) {
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, DEFAULT_TENANT_ID), eq(pipelines.slug, slug)));
  return pipeline ?? null;
}

export async function moveDealToStage(input: {
  dealId: string;
  pipelineSlug: string;
  stageSlug: string;
  /** Quotes / auto-advance may set late stages. Board and list cannot. */
  allowLate?: boolean;
}) {
  const { dealId, pipelineSlug, stageSlug } = input;
  if (!dealId || !stageSlug) return;
  const canonical = canonicalizePipelineSlug(stageSlug) || stageSlug;
  if (
    !input.allowLate &&
    isBoardNoopStage(canonical) &&
    !isArchiveStage(canonical) &&
    pipelineSlug !== "won-lost" &&
    pipelineSlug !== "archive"
  ) {
    return;
  }
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) return;

  const target = await pipelineBySlug(pipelineSlug);
  const archiveBoard = await pipelineBySlug("archive");
  const now = new Date();

  const patch: {
    pipelineId?: string | null;
    pipelineStageSlug: string;
    pipelineStage: string;
    archivedAt?: Date | null;
    updatedAt: Date;
  } = {
    pipelineStageSlug: canonical,
    pipelineStage: dealStageForPipeline(canonical),
    updatedAt: now,
  };

  if (isArchiveStage(stageSlug) || pipelineSlug === "archive") {
    patch.pipelineId = archiveBoard?.id ?? target?.id ?? deal.pipelineId;
    patch.archivedAt = deal.archivedAt ?? now;
    patch.pipelineStage = "archive";
    patch.pipelineStageSlug = "archive";
    void archiveCancelsEmailJobs();
  } else if (pipelineSlug === "won-lost") {
    patch.archivedAt = null;
  } else if (target) {
    patch.pipelineId = target.id;
    patch.archivedAt = null;
  }

  await db.update(deals).set(patch).where(eq(deals.id, dealId));
  await writeCrmSignalsSafe({
    kind: "stage_moved",
    title: `Stage · ${patch.pipelineStageSlug} · ${deal.title}`,
    body: `Deal moved to ${patch.pipelineStageSlug} on ${pipelineSlug}.`,
    entityType: "deal",
    entityId: dealId,
    dealId,
    contactId: deal.contactId,
    accountId: deal.accountId,
    createTask: shouldCreateStageTask(patch.pipelineStageSlug),
  });
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}

export async function moveDealOnBoard(formData: FormData) {
  await moveDealToStage({
    dealId: str(formData, "dealId"),
    pipelineSlug: str(formData, "pipelineSlug"),
    stageSlug: str(formData, "stageSlug"),
  });
}

export async function archiveWonDeal(formData: FormData) {
  formData.set("pipelineSlug", "archive");
  formData.set("stageSlug", "archive");
  await moveDealOnBoard(formData);
  redirect("/deals?pipeline=archive");
}


/** Archive without redirect — used by Closed Won/Lost archive popup (sep7fx). */
export async function archiveClosedDealNow(input: { dealId: string }) {
  const dealId = String(input.dealId ?? "").trim();
  if (!dealId) return { ok: false as const };
  await moveDealToStage({
    dealId,
    pipelineSlug: "archive",
    stageSlug: "archive",
  });
  return { ok: true as const };
}

/** Snooze creates an in-app notification that re-offers Archive + snooze when due. */
export async function scheduleDealArchiveReminder(input: {
  dealId: string;
  amount: number;
  unit: SnoozeDelayUnit | string;
  dealTitle?: string | null;
}) {
  const dealId = String(input.dealId ?? "").trim();
  const amount = Number(input.amount);
  const unitRaw = String(input.unit ?? "").trim();
  if (!dealId || !Number.isFinite(amount) || amount < 1 || !isSnoozeDelayUnit(unitRaw)) {
    return { ok: false as const };
  }
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) return { ok: false as const };
  const now = new Date();
  const dueAt = snoozeDueAt(now, amount, unitRaw);
  const title = dealArchiveReminderTitle(input.dealTitle?.trim() || deal.title || "Deal");
  const body = dealArchiveReminderBody(input.dealTitle?.trim() || deal.title || "Deal");
  const session = await currentDeskSession();
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: DEAL_ARCHIVE_REMINDER_KIND,
    title,
    body,
    severity: "info",
    entityType: "deal",
    entityId: dealId,
    userId: session?.userId ?? null,
    recipientUserId: session?.userId ?? null,
    createdAt: dueAt,
  });
  await db
    .update(deals)
    .set({ archiveScheduledAt: dueAt, updatedAt: now })
    .where(eq(deals.id, dealId));
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/notifications");
  revalidatePath("/alerts");
  return { ok: true as const, dueAt: dueAt.toISOString() };
}

/** Archive from a fired deal_archive_reminder popup; marks the alert read. */
export async function archiveDealFromReminder(formData: FormData) {
  const dealId = str(formData, "dealId");
  const alertId = str(formData, "alertId");
  if (!dealId) return { ok: false as const };
  if (alertId) {
    await db
      .update(alerts)
      .set({ readAt: new Date() })
      .where(and(eq(alerts.id, alertId), eq(alerts.tenantId, DEFAULT_TENANT_ID)));
  }
  await moveDealToStage({
    dealId,
    pipelineSlug: "archive",
    stageSlug: "archive",
  });
  revalidatePath("/notifications");
  revalidatePath("/alerts");
  return { ok: true as const };
}
