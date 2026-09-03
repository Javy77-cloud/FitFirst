import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "./index";
import { activityLogs } from "./schema";

export async function writeActivityLog(input: {
  activityId: string;
  eventType: string;
  body: string;
  durationSeconds?: number | null;
  fromStatus?: string | null;
  toStatus?: string | null;
}) {
  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: input.activityId,
    eventType: input.eventType,
    body: input.body,
    durationSeconds: input.durationSeconds ?? null,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
  });
}
