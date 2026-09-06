import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eoAuditLogs } from "@/lib/db/schema";
import { isEoAuditAction, type EoAuditAction } from "./types";

export type EoAuditWriteInput = {
  id?: string;
  action: EoAuditAction | string;
  summary: string;
  occurredAt?: Date;
  actorId?: string | null;
  actorName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  documentId?: string | null;
  activityId?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function actorFromDeskSession(): Promise<{ id: string | null; name: string }> {
  try {
    const session = await currentDeskSession();
    if (session.signedIn) {
      return { id: session.userId, name: session.name || "Desk" };
    }
  } catch {
    // Seed / non-request callers have no cookies.
  }
  return { id: null, name: "Desk" };
}

export async function writeEoAudit(input: EoAuditWriteInput) {
  const action = input.action.trim().toLowerCase();
  if (!isEoAuditAction(action)) return null;
  const sessionActor = input.actorId || input.actorName ? null : await actorFromDeskSession();
  const [row] = await db
    .insert(eoAuditLogs)
    .values({
      ...(input.id ? { id: input.id } : {}),
      tenantId: DEFAULT_TENANT_ID,
      occurredAt: input.occurredAt ?? new Date(),
      actorId: input.actorId ?? sessionActor?.id ?? null,
      actorName: (input.actorName || sessionActor?.name || "Desk").trim() || "Desk",
      action,
      summary: input.summary.trim() || EO_FALLBACK_SUMMARY[action],
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      contactId: input.contactId ?? null,
      accountId: input.accountId ?? null,
      policyId: input.policyId ?? null,
      dealId: input.dealId ?? null,
      leadId: input.leadId ?? null,
      documentId: input.documentId ?? null,
      activityId: input.activityId ?? null,
      meta: input.meta ?? null,
    })
    .returning();
  return row;
}

const EO_FALLBACK_SUMMARY: Record<EoAuditAction, string> = {
  email: "Email logged",
  sms: "SMS logged",
  call: "Call logged",
  meeting: "Meeting logged",
  doc_view: "Document viewed",
  reveal_pii: "PII revealed",
  policy_change: "Policy changed",
  role_switch: "Role switch",
};

/** Never block a desk action if the trail write fails. */
export async function writeEoAuditSafe(input: EoAuditWriteInput) {
  try {
    return await writeEoAudit(input);
  } catch (error) {
    console.error("eo_audit_logs append failed", error);
    return null;
  }
}
