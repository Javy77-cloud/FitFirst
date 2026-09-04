import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, activityLogs, emailSendJobs } from "@/lib/db/schema";
import { writeEoAuditSafe } from "@/lib/eo-audit/write";
import { eoActionFromCommsKind } from "@/lib/eo-audit/types";
import { activityLogBody, hasCommsRecord, type RelatedRecordIds } from "@/lib/lifecycle/activity";
import {
  commsThreadKey,
  defaultCommsDirection,
  defaultCommsEventType,
  type CommsDirection,
} from "@/lib/desk/comms";

export type WriteCommsInput = RelatedRecordIds & {
  kind: string;
  title: string;
  body?: string | null;
  notes?: string | null;
  subject?: string | null;
  fromAddress?: string | null;
  toAddress?: string | null;
  direction?: CommsDirection | string | null;
  eventType?: string | null;
  status?: string | null;
  dueAt?: Date | null;
  startAt?: Date | null;
  endAt?: Date | null;
  assignee?: string | null;
  threadKey?: string | null;
  occurredAt?: Date | null;
  durationSeconds?: number | null;
  outcome?: string | null;
  phoneNumber?: string | null;
  meetingType?: string | null;
  meetingLocation?: string | null;
  videoProvider?: string | null;
  id?: string;
  logEmailJob?: boolean;
  actorId?: string | null;
  actorName?: string | null;
};

export async function writeDeskComms(input: WriteCommsInput) {
  const kind = input.kind || "task";
  const related: RelatedRecordIds = {
    contactId: input.contactId || null,
    accountId: input.accountId || null,
    policyId: input.policyId || null,
    dealId: input.dealId || null,
    leadId: input.leadId || null,
  };
  if ((kind === "email" || kind === "sms" || kind === "call") && !hasCommsRecord(related)) {
    throw new Error("Call, email, and text need a Deal, Contact, Policy, Business, or Lead.");
  }
  const direction = (input.direction as CommsDirection) || defaultCommsDirection(kind, input.eventType);
  const eventType = input.eventType || defaultCommsEventType(kind, direction);
  const status =
    input.status ||
    (kind === "call" || kind === "email" || kind === "sms" ? "completed" : "open");
  const fullBody = (input.body || input.notes || "").trim();
  const subject = input.subject?.trim() || (kind === "email" ? input.title : null);
  const threadKey =
    input.threadKey ||
    commsThreadKey({ channel: kind, subject, related });
  const stamp = activityLogBody(kind, eventType, input.title, {
    durationSeconds: input.durationSeconds,
    outcome: input.outcome,
  });
  const logBody = fullBody ? `${stamp}\n\n${fullBody}` : stamp;

  const [activity] = await db
    .insert(activities)
    .values({
      ...(input.id ? { id: input.id } : {}),
      tenantId: DEFAULT_TENANT_ID,
      kind,
      title: input.title,
      notes: fullBody || null,
      status,
      dueAt: input.dueAt ?? null,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      durationSeconds: input.durationSeconds ?? null,
      outcome: input.outcome ?? null,
      phoneNumber: input.phoneNumber ?? null,
      direction,
      meetingType: input.meetingType ?? null,
      meetingLocation: input.meetingLocation ?? null,
      videoProvider: input.videoProvider ?? null,
      assignee: input.assignee ?? null,
      contactId: related.contactId,
      accountId: related.accountId,
      policyId: related.policyId,
      dealId: related.dealId,
      leadId: related.leadId,
    })
    .returning();

  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity.id,
    kind,
    eventType,
    body: logBody,
    occurredAt: input.occurredAt ?? new Date(),
    contactId: related.contactId,
    accountId: related.accountId,
    policyId: related.policyId,
    dealId: related.dealId,
    leadId: related.leadId,
    direction,
    threadKey,
    subject,
    fromAddress: input.fromAddress || null,
    toAddress: input.toAddress || null,
  });

  if (input.logEmailJob !== false && kind === "email") {
    await db.insert(emailSendJobs).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: related.contactId,
      accountId: related.accountId,
      dealId: related.dealId,
      policyId: related.policyId,
      anchorKind: "desk_log",
      anchorAt: input.occurredAt ?? new Date(),
      scheduledFor: input.occurredAt ?? new Date(),
      status: direction === "inbound" ? "received" : "logged",
    });
  }

  const eoAction = eoActionFromCommsKind(kind);
  if (eoAction) {
    const entityType = related.policyId
      ? "policy"
      : related.dealId
        ? "deal"
        : related.contactId
          ? "contact"
          : related.accountId
            ? "account"
            : related.leadId
              ? "lead"
              : null;
    const entityId =
      related.policyId || related.dealId || related.contactId || related.accountId || related.leadId || null;
    await writeEoAuditSafe({
      action: eoAction,
      summary: input.title || `${eoAction} logged`,
      occurredAt: input.occurredAt ?? undefined,
      actorId: input.actorId,
      actorName: input.actorName,
      entityType,
      entityId,
      contactId: related.contactId,
      accountId: related.accountId,
      policyId: related.policyId,
      dealId: related.dealId,
      leadId: related.leadId,
      activityId: activity.id,
      meta: {
        direction,
        eventType,
        subject: subject ?? undefined,
      },
    });
  }

  return { activity, threadKey, direction, eventType };
}
