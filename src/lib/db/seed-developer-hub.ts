import { db } from "./index";
import { deskClientScripts, deskCustomButtons, deskMacros, deskWidgets } from "./schema";
import { COV_A_EMPTY_SCRIPT } from "@/lib/developer-hub/client-scripts";
import { DEV_HUB_IDS, EMAIL_TEMPLATE_IDS, TENANT_ID } from "../fixtures/ids";

export async function seedDeveloperHub() {
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
