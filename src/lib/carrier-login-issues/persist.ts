import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { carrierLoginIssues } from "@/lib/db/schema";
import {
  appendCarrierLoginEvent,
  buildCarrierLoginEvent,
  readCarrierLoginEvents,
  type NewCarrierLoginIssue,
} from "@/lib/carrier-login-issues/store";
import {
  isLoginErrorCategory,
  type CarrierLoginEvent,
} from "@/lib/carrier-login-issues/types";

function rowToEvent(row: typeof carrierLoginIssues.$inferSelect): CarrierLoginEvent | null {
  if (!isLoginErrorCategory(row.errorCategory)) return null;
  return {
    id: row.id,
    carrier_name: row.carrierName,
    carrier_id: row.carrierId,
    lob: row.lob,
    error_message: row.errorMessage,
    error_category: row.errorCategory,
    occurred_at: row.occurredAt.toISOString(),
    source: row.source,
    deal_id: row.dealId,
    standing: row.standing,
  };
}

async function insertCarrierLoginRow(event: CarrierLoginEvent): Promise<void> {
  await db
    .insert(carrierLoginIssues)
    .values({
      id: event.id,
      tenantId: DEFAULT_TENANT_ID,
      carrierId: event.carrier_id,
      carrierName: event.carrier_name,
      lob: event.lob,
      errorMessage: event.error_message,
      errorCategory: event.error_category,
      occurredAt: new Date(event.occurred_at),
      source: event.source,
      dealId: event.deal_id,
      standing: event.standing,
    })
    .onConflictDoNothing();
}

/**
 * Append one login failure. Writes the NDJSON list and, when Postgres is
 * reachable, the carrier_login_issues table. Returns null when the text is
 * not a login failure. Throws only when both stores fail.
 */
export async function recordCarrierLoginIssue(
  input: NewCarrierLoginIssue,
): Promise<CarrierLoginEvent | null> {
  const event = buildCarrierLoginEvent(input);
  if (!event) return null;
  let fileOk = false;
  let dbOk = false;
  try {
    appendCarrierLoginEvent(event);
    fileOk = true;
  } catch (error) {
    console.error("carrier login ndjson append failed", error);
  }
  try {
    await insertCarrierLoginRow(event);
    dbOk = true;
  } catch (error) {
    console.error("carrier login table insert failed", error);
  }
  if (!fileOk && !dbOk) {
    throw new Error("Could not record the carrier login issue.");
  }
  return event;
}

/** Shop / portal paths: never let a logging failure stop the quote. */
export async function captureQuoteBotLoginFailure(
  input: NewCarrierLoginIssue,
): Promise<CarrierLoginEvent | null> {
  try {
    return await recordCarrierLoginIssue(input);
  } catch (error) {
    console.error("carrier login issue log failed", error);
    return null;
  }
}

/** Seed file plus any rows the table has. Duplicate ids collapse to one event. */
export async function loadCarrierLoginEvents(): Promise<CarrierLoginEvent[]> {
  const fromFile = readCarrierLoginEvents();
  let fromDb: CarrierLoginEvent[] = [];
  try {
    const rows = await db
      .select()
      .from(carrierLoginIssues)
      .where(eq(carrierLoginIssues.tenantId, DEFAULT_TENANT_ID));
    fromDb = rows.flatMap((row) => {
      const event = rowToEvent(row);
      return event ? [event] : [];
    });
  } catch {
    fromDb = [];
  }
  const byId = new Map<string, CarrierLoginEvent>();
  for (const event of [...fromFile, ...fromDb]) byId.set(event.id, event);
  return [...byId.values()];
}
