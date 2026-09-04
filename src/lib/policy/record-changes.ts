import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { policyChangeLogs } from "@/lib/db/schema";
import {
  diffPolicyFields,
  type PolicyChangeSource,
} from "./change-log";

export type DeskActor = {
  id: string | null;
  name: string;
};

export async function deskActor(fallback = "Desk"): Promise<DeskActor> {
  try {
    const session = await currentDeskSession();
    if (session.signedIn && session.userId) {
      return { id: session.userId, name: session.name || fallback };
    }
  } catch {
    // Seed / tests / no cookie jar.
  }
  return { id: null, name: fallback };
}

export async function recordPolicyFieldChanges(input: {
  policyId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  source?: PolicyChangeSource;
  eventId?: string | null;
  actor?: DeskActor;
  changedAt?: Date;
}) {
  const changes = diffPolicyFields(input.before, input.after);
  if (changes.length === 0) return [];
  const actor = input.actor ?? (await deskActor());
  const changedAt = input.changedAt ?? new Date();
  const rows = changes.map((change) => ({
    tenantId: DEFAULT_TENANT_ID,
    policyId: input.policyId,
    changedBy: actor.id,
    changedByName: actor.name,
    changedAt,
    fieldKey: change.fieldKey,
    fieldLabel: change.fieldLabel,
    beforeValue: change.beforeValue,
    afterValue: change.afterValue,
    source: input.source ?? "record_edit",
    eventId: input.eventId ?? null,
  }));
  return db.insert(policyChangeLogs).values(rows).returning();
}
