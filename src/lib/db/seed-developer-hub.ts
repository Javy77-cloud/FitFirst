import { eq } from "drizzle-orm";
import { COV_A_EMPTY_SCRIPT } from "@/lib/developer-hub/client-scripts";
import { DEMO_ORG_API_KEY, hashOrgApiKey, prefixFromSecret } from "@/lib/developer-hub/keys";
import {
  ADMIN_USER_ID,
  DEV_HUB_API_KEY_ID,
  DEV_HUB_CONNECTION_ID,
  DEV_HUB_FUNCTION_ID,
  DEV_HUB_IDS,
  DEV_HUB_INBOUND_ID,
  DEV_HUB_WEBHOOK_ID,
  EMAIL_TEMPLATE_IDS,
  TENANT_ID,
} from "../fixtures/ids";
import { db } from "./index";
import {
  deskClientScripts,
  deskCustomButtons,
  deskMacros,
  deskWidgets,
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
    .insert(developerFunctions)
    .values({
      id: "d0480000-0000-4048-8048-000000000008",
      tenantId: TENANT_ID,
      name: "Lead follow-up stub",
      apiName: "lead_followup_stub",
      description: "Button category. Custom Buttons call this by apiName.",
      language: "typescript",
      category: "button",
      body: '{"op":"wrap","as":"followUp"}',
      exposeAsRest: false,
      exposeAsOauth: false,
      createdBy: ADMIN_USER_ID,
    })
    .onConflictDoUpdate({
      target: developerFunctions.id,
      set: {
        name: "Lead follow-up stub",
        apiName: "lead_followup_stub",
        category: "button",
        body: '{"op":"wrap","as":"followUp"}',
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
  } else {
    await db.insert(developerOrgApiKeys).values({
      id: DEV_HUB_API_KEY_ID,
      tenantId: TENANT_ID,
      name: "Desk functions (demo)",
      prefix: prefixFromSecret(DEMO_ORG_API_KEY),
      secretHash: tokenHash,
      createdBy: ADMIN_USER_ID,
    });
  }

  await db
    .insert(deskMacros)
    .values({
      id: DEV_HUB_IDS.macroLeadFollowup,
      tenantId: TENANT_ID,
      module: "leads",
      name: "Mark contacted + follow-up",
      description:
        "Manual only. Sets status to contacted, opens a 3-day follow-up task, and queues a stub email. Never runs on Ana Dib.",
      enabled: true,
      actions: {
        email: {
          templateId: EMAIL_TEMPLATE_IDS.googleReview,
          subject: "Checking in, {{record.firstName}}",
          body: "Hi {{record.firstName}} — we logged a follow-up from the desk. This stays in the outbound stub queue.",
        },
        fieldUpdates: [{ field: "status", value: "contacted" }],
        createTasks: [{ title: "Follow up after macro", kind: "macro", dueInDays: 3 }],
      },
    })
    .onConflictDoUpdate({
      target: deskMacros.id,
      set: {
        name: "Mark contacted + follow-up",
        description:
          "Manual only. Sets status to contacted, opens a 3-day follow-up task, and queues a stub email. Never runs on Ana Dib.",
        enabled: true,
        actions: {
          email: {
            templateId: EMAIL_TEMPLATE_IDS.googleReview,
            subject: "Checking in, {{record.firstName}}",
            body: "Hi {{record.firstName}} — we logged a follow-up from the desk. This stays in the outbound stub queue.",
          },
          fieldUpdates: [{ field: "status", value: "contacted" }],
          createTasks: [{ title: "Follow up after macro", kind: "macro", dueInDays: 3 }],
        },
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deskMacros)
    .values({
      id: "d0480000-0000-4048-8048-000000000018",
      tenantId: TENANT_ID,
      module: "contacts",
      name: "Note + callback",
      description: "Manual only. Writes a follow-up note and a 2-day task. Skips Ana.",
      enabled: true,
      actions: {
        email: null,
        fieldUpdates: [{ field: "notes", value: "Desk follow-up from macro." }],
        createTasks: [{ title: "Call back after macro", kind: "macro", dueInDays: 2 }],
      },
    })
    .onConflictDoUpdate({
      target: deskMacros.id,
      set: {
        name: "Note + callback",
        enabled: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deskMacros)
    .values({
      id: "d0480000-0000-4048-8048-000000000019",
      tenantId: TENANT_ID,
      module: "deals",
      name: "Shop note + task",
      description: "Manual only. Adds a shop note and a 3-day task. Skips Ana.",
      enabled: true,
      actions: {
        email: null,
        fieldUpdates: [{ field: "notes", value: "Macro shop follow-up logged." }],
        createTasks: [{ title: "Shop follow-up after macro", kind: "macro", dueInDays: 3 }],
      },
    })
    .onConflictDoUpdate({
      target: deskMacros.id,
      set: {
        name: "Shop note + task",
        enabled: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deskWidgets)
    .values([
      {
        id: DEV_HUB_IDS.widgetSettingsPulse,
        tenantId: TENANT_ID,
        name: "Agency pulse stub",
        type: "settings",
        hosting: "external",
        externalUrl: "https://example.com",
        zipMeta: null,
        enabled: true,
      },
      {
        id: DEV_HUB_IDS.widgetDealRelated,
        tenantId: TENANT_ID,
        name: "Deal related-list stub",
        type: "related_list",
        hosting: "internal",
        externalUrl: null,
        zipMeta: {
          fileName: "deal-related-list.zip",
          byteSize: 0,
          uploadedAt: "2026-09-05T12:00:00.000Z",
        },
        enabled: true,
      },
    ])
    .onConflictDoNothing({ target: deskWidgets.id });

  await db
    .insert(deskCustomButtons)
    .values([
      {
        id: DEV_HUB_IDS.buttonDealMap,
        tenantId: TENANT_ID,
        module: "deals",
        placement: "detail",
        label: "Open property map",
        visibilityProfiles: ["admin", "agent"],
        actionKind: "url",
        functionApiName: null,
        urlTemplate:
          "https://www.google.com/maps/search/?api=1&query={{record.address}}+{{record.city}}+{{record.state}}",
        widgetId: null,
        enabled: true,
      },
      {
        id: DEV_HUB_IDS.buttonLeadFunction,
        tenantId: TENANT_ID,
        module: "leads",
        placement: "mass_action",
        label: "Run follow-up function",
        visibilityProfiles: ["admin", "agent"],
        actionKind: "function",
        functionApiName: "lead_followup_stub",
        urlTemplate: null,
        widgetId: null,
        enabled: true,
      },
      {
        id: DEV_HUB_IDS.buttonDealWidget,
        tenantId: TENANT_ID,
        module: "deals",
        placement: "detail",
        label: "Open related widget",
        visibilityProfiles: ["admin", "agent"],
        actionKind: "widget",
        functionApiName: null,
        urlTemplate: null,
        widgetId: DEV_HUB_IDS.widgetDealRelated,
        enabled: true,
      },
    ])
    .onConflictDoNothing({ target: deskCustomButtons.id });

  await db
    .insert(deskClientScripts)
    .values({
      id: DEV_HUB_IDS.scriptDealCovA,
      tenantId: TENANT_ID,
      module: "deals",
      page: "edit",
      event: "onChange",
      fieldName: "coverageA",
      name: "Warn if Coverage A is empty",
      body: COV_A_EMPTY_SCRIPT,
      enabled: true,
    })
    .onConflictDoUpdate({
      target: deskClientScripts.id,
      set: {
        body: COV_A_EMPTY_SCRIPT,
        enabled: true,
        updatedAt: new Date(),
      },
    });
}
