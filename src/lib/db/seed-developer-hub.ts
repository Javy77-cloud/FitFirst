import { eq } from "drizzle-orm";
import { hashOrgApiKey, DEMO_ORG_API_KEY, prefixFromSecret } from "@/lib/developer-hub/keys";
import {
  ADMIN_USER_ID,
  DEV_HUB_API_KEY_ID,
  DEV_HUB_CONNECTION_ID,
  DEV_HUB_FUNCTION_ID,
  DEV_HUB_INBOUND_ID,
  DEV_HUB_WEBHOOK_ID,
  TENANT_ID,
} from "../fixtures/ids";
import { db } from "./index";
import {
  developerConnections,
  developerFunctions,
  developerInboundHooks,
  developerOrgApiKeys,
  developerWebhooks,
} from "./schema";

export async function seedDeveloperHub() {
  await db
    .insert(developerFunctions)
    .values({
      id: DEV_HUB_FUNCTION_ID,
      tenantId: TENANT_ID,
      name: "Echo payload",
      apiName: "echo_payload",
      description:
        "Sample standalone function. REST uses an org API key. Body is an allowlisted JSON transform — not host JavaScript.",
      language: "typescript",
      category: "standalone",
      body: '{"op":"identity"}',
      exposeAsRest: true,
      exposeAsOauth: false,
      connectionLinkName: "google_calendar",
      createdBy: ADMIN_USER_ID,
    })
    .onConflictDoUpdate({
      target: developerFunctions.id,
      set: {
        name: "Echo payload",
        apiName: "echo_payload",
        description:
          "Sample standalone function. REST uses an org API key. Body is an allowlisted JSON transform — not host JavaScript.",
        language: "typescript",
        category: "standalone",
        body: '{"op":"identity"}',
        exposeAsRest: true,
        connectionLinkName: "google_calendar",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(developerWebhooks)
    .values({
      id: DEV_HUB_WEBHOOK_ID,
      tenantId: TENANT_ID,
      name: "Deal stage ping",
      event: "deal.stage_changed",
      targetUrl: "http://127.0.0.1:43147/api/dev/webhooks/inbound/desk-echo",
      secret: "ff_devhub_hook",
      enabled: true,
    })
    .onConflictDoUpdate({
      target: developerWebhooks.id,
      set: {
        name: "Deal stage ping",
        event: "deal.stage_changed",
        targetUrl: "http://127.0.0.1:43147/api/dev/webhooks/inbound/desk-echo",
        secret: "ff_devhub_hook",
        enabled: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(developerInboundHooks)
    .values({
      id: DEV_HUB_INBOUND_ID,
      tenantId: TENANT_ID,
      name: "Desk echo signal",
      slug: "desk-echo",
      enabled: true,
    })
    .onConflictDoUpdate({
      target: developerInboundHooks.id,
      set: { name: "Desk echo signal", slug: "desk-echo", enabled: true },
    });

  await db
    .insert(developerConnections)
    .values({
      id: DEV_HUB_CONNECTION_ID,
      tenantId: TENANT_ID,
      name: "Google Calendar",
      linkName: "google_calendar",
      kind: "google",
      status: "needs_credentials",
      notes: "Agency BYO OAuth later. Authorize is a wall — no live Google token exchange.",
      createdBy: ADMIN_USER_ID,
    })
    .onConflictDoUpdate({
      target: developerConnections.id,
      set: {
        name: "Google Calendar",
        linkName: "google_calendar",
        kind: "google",
        status: "needs_credentials",
        notes: "Agency BYO OAuth later. Authorize is a wall — no live Google token exchange.",
        updatedAt: new Date(),
      },
    });

  const tokenHash = hashOrgApiKey(DEMO_ORG_API_KEY);
  const [existing] = await db
    .select()
    .from(developerOrgApiKeys)
    .where(eq(developerOrgApiKeys.id, DEV_HUB_API_KEY_ID));
  if (existing) {
    await db
      .update(developerOrgApiKeys)
      .set({
        tenantId: TENANT_ID,
        name: "Desk functions (demo)",
        prefix: prefixFromSecret(DEMO_ORG_API_KEY),
        secretHash: tokenHash,
        revokedAt: null,
        createdBy: ADMIN_USER_ID,
      })
      .where(eq(developerOrgApiKeys.id, DEV_HUB_API_KEY_ID));
    return;
  }
  await db.insert(developerOrgApiKeys).values({
    id: DEV_HUB_API_KEY_ID,
    tenantId: TENANT_ID,
    name: "Desk functions (demo)",
    prefix: prefixFromSecret(DEMO_ORG_API_KEY),
    secretHash: tokenHash,
    createdBy: ADMIN_USER_ID,
  });
}
