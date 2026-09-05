import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { developerWebhookDeliveries, developerWebhooks } from "@/lib/db/schema";
import { isWebhookEvent, type WebhookEvent } from "./types";

export function isLocalDeliveryUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  } catch {
    return false;
  }
}

export async function enqueueDeskEvent(event: WebhookEvent, payload: Record<string, unknown>) {
  if (!isWebhookEvent(event)) return [];
  const hooks = await db
    .select()
    .from(developerWebhooks)
    .where(
      and(
        eq(developerWebhooks.tenantId, DEFAULT_TENANT_ID),
        eq(developerWebhooks.event, event),
        eq(developerWebhooks.enabled, true),
      ),
    );
  const rows = [];
  for (const hook of hooks) {
    const [row] = await db
      .insert(developerWebhookDeliveries)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        webhookId: hook.id,
        event,
        payload: { event, ...payload },
        status: "pending",
      })
      .returning();
    if (row) rows.push(row);
  }
  return rows;
}

export async function emitDeskEvent(event: WebhookEvent, payload: Record<string, unknown>) {
  try {
    await enqueueDeskEvent(event, payload);
  } catch {
    /* CRM must not fail if the hub queue is down. */
  }
}

export async function attemptWebhookDelivery(deliveryId: string, targetUrl: string, secret?: string | null) {
  const [delivery] = await db
    .select()
    .from(developerWebhookDeliveries)
    .where(
      and(
        eq(developerWebhookDeliveries.tenantId, DEFAULT_TENANT_ID),
        eq(developerWebhookDeliveries.id, deliveryId),
      ),
    );
  if (!delivery) return null;

  const now = new Date();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret) headers["x-fitfirst-signature"] = secret;

  if (!isLocalDeliveryUrl(targetUrl)) {
    const [row] = await db
      .update(developerWebhookDeliveries)
      .set({
        status: "attempted",
        attemptCount: delivery.attemptCount + 1,
        lastError: "Stub attempt. External delivery is not required. Use a localhost URL to POST.",
        attemptedAt: now,
      })
      .where(eq(developerWebhookDeliveries.id, delivery.id))
      .returning();
    return row ?? null;
  }

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(delivery.payload),
    });
    const [row] = await db
      .update(developerWebhookDeliveries)
      .set({
        status: res.ok ? "attempted" : "failed",
        attemptCount: delivery.attemptCount + 1,
        lastError: res.ok ? null : `HTTP ${res.status}`,
        attemptedAt: now,
      })
      .where(eq(developerWebhookDeliveries.id, delivery.id))
      .returning();
    return row ?? null;
  } catch (err) {
    const [row] = await db
      .update(developerWebhookDeliveries)
      .set({
        status: "failed",
        attemptCount: delivery.attemptCount + 1,
        lastError: err instanceof Error ? err.message : "Local POST failed.",
        attemptedAt: now,
      })
      .where(eq(developerWebhookDeliveries.id, delivery.id))
      .returning();
    return row ?? null;
  }
}
