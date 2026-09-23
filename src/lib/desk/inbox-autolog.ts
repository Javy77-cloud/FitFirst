/** Auto-log matched Inbox threads onto CRM activities + resolve email assignees. */

import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, activityLogs, integrationConnections } from "@/lib/db/schema";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { decodeMailText } from "@/lib/desk/mail-text";
import type { InboxMatch } from "@/lib/desk/inbox-match";
import type { MailProviderId, MailThreadMessage } from "@/lib/integrations/mail-contract";
import { mailThreadKey } from "@/lib/integrations/mail-contract";

export function mailMessageOccurredAt(msg: {
  internalDate?: number | null;
  date?: string | null;
}): Date {
  if (msg.internalDate != null && Number.isFinite(msg.internalDate) && msg.internalDate > 0) {
    return new Date(msg.internalDate);
  }
  const parsed = Date.parse(msg.date ?? "");
  return Number.isFinite(parsed) ? new Date(parsed) : new Date();
}

export function mailMessageSourceId(providerId: MailProviderId, messageId: string): string {
  return `${providerId}:msg:${messageId.trim()}`;
}

/** Prefer prior outbound stamp on the thread, then mailbox owner — never contact.owner alone. */
export function preferEmailThreadAssignee(input: {
  priorAssigneeId?: string | null;
  priorCreatedById?: string | null;
  mailboxOwnerUserId?: string | null;
  sessionUserId?: string | null;
}): string | null {
  return (
    input.priorAssigneeId?.trim() ||
    input.priorCreatedById?.trim() ||
    input.mailboxOwnerUserId?.trim() ||
    input.sessionUserId?.trim() ||
    null
  );
}

export async function loadMailboxOwnerUserId(providerId: MailProviderId): Promise<string | null> {
  const [row] = await db
    .select({ ownerUserId: integrationConnections.ownerUserId })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.tenantId, DEFAULT_TENANT_ID),
        eq(integrationConnections.provider, providerId),
        eq(integrationConnections.connected, true),
      ),
    )
    .limit(1);
  return row?.ownerUserId ?? null;
}

export async function loadThreadEmailAgent(threadKey: string): Promise<{
  assignee: string | null;
  createdByUserId: string | null;
}> {
  const key = threadKey.trim();
  if (!key) return { assignee: null, createdByUserId: null };
  const logs = await db
    .select({
      activityId: activityLogs.activityId,
      direction: activityLogs.direction,
      occurredAt: activityLogs.occurredAt,
    })
    .from(activityLogs)
    .where(and(eq(activityLogs.tenantId, DEFAULT_TENANT_ID), eq(activityLogs.threadKey, key)));
  if (logs.length === 0) return { assignee: null, createdByUserId: null };
  const outbound = logs
    .filter((row) => (row.direction ?? "").toLowerCase() === "outbound")
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const pick = outbound[0] ?? [...logs].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
  if (!pick) return { assignee: null, createdByUserId: null };
  const [activity] = await db
    .select({
      assignee: activities.assignee,
      createdByUserId: activities.createdByUserId,
    })
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, pick.activityId)))
    .limit(1);
  return {
    assignee: activity?.assignee ?? null,
    createdByUserId: activity?.createdByUserId ?? null,
  };
}

export async function resolveEmailThreadAssignee(input: {
  threadKey: string;
  providerId: MailProviderId;
  sessionUserId?: string | null;
}): Promise<string | null> {
  const prior = await loadThreadEmailAgent(input.threadKey);
  const mailboxOwnerUserId = await loadMailboxOwnerUserId(input.providerId);
  return preferEmailThreadAssignee({
    priorAssigneeId: prior.assignee,
    priorCreatedById: prior.createdByUserId,
    mailboxOwnerUserId,
    sessionUserId: input.sessionUserId,
  });
}

type LoggedStamp = {
  sourceId: string | null;
  direction: string | null;
  occurredAt: Date;
  fromAddress: string | null;
};

async function loadLoggedStamps(threadKey: string): Promise<LoggedStamp[]> {
  const logs = await db
    .select({
      activityId: activityLogs.activityId,
      direction: activityLogs.direction,
      occurredAt: activityLogs.occurredAt,
      fromAddress: activityLogs.fromAddress,
    })
    .from(activityLogs)
    .where(and(eq(activityLogs.tenantId, DEFAULT_TENANT_ID), eq(activityLogs.threadKey, threadKey)));
  if (logs.length === 0) return [];
  const ids = [...new Set(logs.map((row) => row.activityId))];
  const rows = await db
    .select({ id: activities.id, sourceId: activities.sourceId })
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), inArray(activities.id, ids)));
  const sourceById = new Map(rows.map((row) => [row.id, row.sourceId]));
  return logs.map((row) => ({
    sourceId: sourceById.get(row.activityId) ?? null,
    direction: row.direction,
    occurredAt: row.occurredAt,
    fromAddress: row.fromAddress,
  }));
}

function alreadyLogged(stamps: LoggedStamp[], input: {
  sourceId: string;
  direction: string;
  occurredAt: Date;
  fromAddress: string;
}): boolean {
  if (stamps.some((row) => row.sourceId && row.sourceId === input.sourceId)) return true;
  const from = input.fromAddress.trim().toLowerCase();
  return stamps.some((row) => {
    if ((row.direction ?? "").toLowerCase() !== input.direction) return false;
    const delta = Math.abs(row.occurredAt.getTime() - input.occurredAt.getTime());
    if (delta > 120_000) return false;
    if (!from) return true;
    const loggedFrom = (row.fromAddress ?? "").trim().toLowerCase();
    return !loggedFrom || loggedFrom.includes(from) || from.includes(loggedFrom);
  });
}

export async function ensureMatchedThreadLogged(input: {
  providerId: MailProviderId;
  threadId: string;
  messages: MailThreadMessage[];
  match: InboxMatch;
  sessionUserId?: string | null;
  /** When true, only fill inbound gaps (default). Outbound from FitFirst already logs on send. */
  inboundOnly?: boolean;
}): Promise<{ logged: number }> {
  const contactId = input.match.contact?.id ?? null;
  const dealId = input.match.deal?.id ?? null;
  const policyId = input.match.renewal?.policyId ?? null;
  if (!contactId && !dealId && !policyId) return { logged: 0 };
  if (!input.messages.length) return { logged: 0 };

  const threadKey = mailThreadKey(input.providerId, input.threadId);
  const stamps = await loadLoggedStamps(threadKey);
  const assignee = await resolveEmailThreadAssignee({
    threadKey,
    providerId: input.providerId,
    sessionUserId: input.sessionUserId,
  });
  const inboundOnly = input.inboundOnly !== false;
  let logged = 0;

  for (const msg of input.messages) {
    if (inboundOnly && !msg.inbound) continue;
    const direction = msg.inbound ? "inbound" : "outbound";
    const occurredAt = mailMessageOccurredAt(msg);
    const sourceId = mailMessageSourceId(input.providerId, msg.id);
    if (
      alreadyLogged(stamps, {
        sourceId,
        direction,
        occurredAt,
        fromAddress: msg.from,
      })
    ) {
      continue;
    }
    const subject = decodeMailText(msg.subject) || "Inbox thread";
    await writeDeskComms({
      kind: "email",
      title: subject,
      body: msg.body || msg.snippet || "",
      subject,
      fromAddress: msg.from,
      toAddress: msg.to,
      direction,
      eventType: msg.inbound ? "received" : "sent",
      contactId,
      dealId,
      policyId,
      threadKey,
      occurredAt,
      startAt: occurredAt,
      assignee,
      actorId: assignee,
      sourceId,
      logEmailJob: false,
    });
    stamps.push({
      sourceId,
      direction,
      occurredAt,
      fromAddress: msg.from,
    });
    logged += 1;
  }
  return { logged };
}

/** After assign / outbound send — stamp assignee on every email activity for the thread. */
export async function stampThreadEmailAssignee(threadKey: string, agentId: string): Promise<number> {
  const key = threadKey.trim();
  const agent = agentId.trim();
  if (!key || !agent) return 0;
  const logs = await db
    .select({ activityId: activityLogs.activityId })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.tenantId, DEFAULT_TENANT_ID),
        eq(activityLogs.threadKey, key),
        eq(activityLogs.kind, "email"),
      ),
    );
  const ids = [...new Set(logs.map((row) => row.activityId))];
  if (ids.length === 0) return 0;
  await db
    .update(activities)
    .set({ assignee: agent })
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), inArray(activities.id, ids)));
  return ids.length;
}
