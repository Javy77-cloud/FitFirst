import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, reviewTasks } from "@/lib/db/schema";
import { writeDeskComms } from "@/lib/desk/write-comms";
import {
  parseEpisodeKey,
  sheetInvalidatedEpisodeKey,
  shouldInsertEpisode,
  withEpisodeKey,
  type EpisodeAlertRow,
} from "@/lib/alerts/episode";

export type CrmSignalKind =
  | "lead_converted"
  | "stage_moved"
  | "meeting_scheduled"
  | "comms_queued"
  | "comms_held"
  | "comms_sent"
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
  /** Optional line scope for sheet_invalidated episode keys. */
  shopLine?: string | null;
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
  if (kind === "comms_sent") {
    return { taskKind: "comms_sent", dueInDays: 0, createTask: false, severity: "info" };
  }
  if (kind === "sheet_invalidated") {
    return { taskKind: "sheet_invalidated", dueInDays: 0, createTask: false, severity: "info" };
  }
  return { taskKind: "comms_queue", dueInDays: 0, createTask: false, severity: "info" };
}

/** Stage / pipeline events must never auto-spawn Tasks. Log them instead. */
export function shouldCreateStageTask(_stageSlug: string) {
  return false;
}

/**
 * Own outbound send/queue is Activity history — do not ping the sender's bell.
 * Stage moves stay on the deal UI + Activity note; no bell (multi-product floods).
 */
export function createsUserFacingAlert(kind: CrmSignalKind): boolean {
  return kind !== "comms_sent" && kind !== "comms_queued" && kind !== "stage_moved";
}

function sheetInvalidatedKey(input: CrmSignalInput): string | null {
  if (input.kind !== "sheet_invalidated") return null;
  const dealId = (input.dealId ?? input.entityId ?? "").trim();
  if (!dealId) return null;
  return sheetInvalidatedEpisodeKey(dealId, input.shopLine);
}

async function existingSheetInvalidatedEpisodes(dealId: string): Promise<EpisodeAlertRow[]> {
  const rows = await db
    .select({ id: alerts.id, body: alerts.body, entityId: alerts.entityId })
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.kind, "sheet_invalidated"),
        eq(alerts.entityType, "deal"),
        eq(alerts.entityId, dealId),
      ),
    );
  return rows.map((row) => {
    const parsed = parseEpisodeKey(row.body);
    const fallback = sheetInvalidatedEpisodeKey(dealId, null);
    return { id: row.id, key: parsed ?? fallback };
  });
}

/** Drop sheet_invalidated rows for a deal(+line) so a later RP edit can notify once. */
export async function endSheetInvalidatedEpisodes(dealId: string, line?: string | null) {
  const id = dealId.trim();
  if (!id) return 0;
  const rows = await existingSheetInvalidatedEpisodes(id);
  if (!rows.length) return 0;
  const target = line != null && String(line).trim() ? sheetInvalidatedEpisodeKey(id, line) : null;
  const dropIds = rows
    .filter((row) => {
      if (!target) return true;
      return row.key === target || row.key === sheetInvalidatedEpisodeKey(id, null);
    })
    .map((row) => row.id);
  if (!dropIds.length) return 0;
  await db.delete(alerts).where(inArray(alerts.id, dropIds));
  return dropIds.length;
}

export async function writeCrmSignals(input: CrmSignalInput) {
  const defaults = crmSignalDefaults(input.kind);
  const createTask = input.kind === "stage_moved" ? false : (input.createTask ?? defaults.createTask);
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + (input.dueInDays ?? defaults.dueInDays));

  let alert: typeof alerts.$inferSelect | null = null;
  if (createsUserFacingAlert(input.kind)) {
    const episodeKey = sheetInvalidatedKey(input);
    let body = input.body;
    let skipInsert = false;
    if (episodeKey) {
      const dealId = (input.dealId ?? input.entityId ?? "").trim();
      const existing = await existingSheetInvalidatedEpisodes(dealId);
      if (!shouldInsertEpisode(episodeKey, existing)) {
        skipInsert = true;
      } else {
        body = withEpisodeKey(input.body, episodeKey);
      }
    }
    if (!skipInsert) {
      const [row] = await db
        .insert(alerts)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          kind: input.kind,
          title: input.title,
          body,
          severity: input.severity ?? defaults.severity,
          entityType:
            input.entityType ??
            (input.dealId ? "deal" : input.contactId ? "contact" : input.accountId ? "account" : null),
          entityId:
            input.entityId ?? input.dealId ?? input.contactId ?? input.accountId ?? input.policyId ?? null,
          userId: input.userId ?? null,
          recipientUserId: input.userId ?? null,
        })
        .returning();
      alert = row ?? null;
    }
  }

  if (input.kind === "stage_moved") {
    await writeDeskComms({
      kind: "note",
      title: input.title,
      body: input.body,
      status: "completed",
      eventType: "stage_moved",
      dealId: input.dealId,
      contactId: input.contactId,
      accountId: input.accountId,
      policyId: input.policyId,
      logEmailJob: false,
    }).catch(() => null);
  }

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
