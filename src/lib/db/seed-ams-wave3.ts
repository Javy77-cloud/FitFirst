import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activities,
  activityLogs,
  policyServiceRequestEvents,
  policyServiceRequests,
  policyServicingChecks,
  reviewTasks,
} from "./schema";
import {
  AMS_WAVE2_IDS,
  AMS_WAVE3_IDS,
  DESK_AGENT_IDS,
  ELENA_CONTACT_ID,
  ELENA_POLICY_ID,
  HALE_CONTACT_ID,
  HALE_POLICY_ID,
  HARBOR_POLICY_ID,
  TENANT_ID,
} from "../fixtures/ids";

export async function seedAmsWave3() {
  await db
    .insert(reviewTasks)
    .values([
      {
        id: AMS_WAVE3_IDS.elenaMortgageeTask,
        tenantId: TENANT_ID,
        contactId: ELENA_CONTACT_ID,
        policyId: ELENA_POLICY_ID,
        kind: "servicing",
        title: "Servicing · Mortgagee · HO3-ELENA-2026",
        dueDate: new Date("2026-09-12T16:00:00.000Z"),
        status: "open",
      },
      {
        id: AMS_WAVE3_IDS.haleRenewalDocsTask,
        tenantId: TENANT_ID,
        contactId: HALE_CONTACT_ID,
        policyId: HALE_POLICY_ID,
        kind: "servicing",
        title: "Servicing · Renewal docs due · HP-FL-88421",
        dueDate: new Date("2026-10-01T16:00:00.000Z"),
        status: "open",
      },
    ])
    .onConflictDoUpdate({
      target: reviewTasks.id,
      set: { status: "open", title: reviewTasks.title },
    });

  await db
    .insert(policyServicingChecks)
    .values([
      {
        id: AMS_WAVE3_IDS.elenaRenewalDocs,
        tenantId: TENANT_ID,
        policyId: ELENA_POLICY_ID,
        itemKey: "renewal_docs",
        status: "complete",
        notes: "Expires 2027-09-01 — not in the 90-day window.",
        completedAt: new Date("2026-09-03T16:00:00.000Z"),
        completedBy: DESK_AGENT_IDS.javy,
      },
      {
        id: AMS_WAVE3_IDS.elenaInspection,
        tenantId: TENANT_ID,
        policyId: ELENA_POLICY_ID,
        itemKey: "inspection",
        status: "incomplete",
      },
      {
        id: AMS_WAVE3_IDS.elenaMortgagee,
        tenantId: TENANT_ID,
        policyId: ELENA_POLICY_ID,
        itemKey: "mortgagee",
        status: "incomplete",
        notes: "Lender asked for a mortgagee endorsement. Open service request.",
        taskId: AMS_WAVE3_IDS.elenaMortgageeTask,
      },
      {
        id: AMS_WAVE3_IDS.elenaIdCards,
        tenantId: TENANT_ID,
        policyId: ELENA_POLICY_ID,
        itemKey: "id_cards",
        status: "complete",
        completedAt: new Date("2026-09-01T16:00:00.000Z"),
        completedBy: DESK_AGENT_IDS.javy,
      },
      {
        id: AMS_WAVE3_IDS.haleRenewalDocs,
        tenantId: TENANT_ID,
        policyId: HALE_POLICY_ID,
        itemKey: "renewal_docs",
        status: "incomplete",
        notes: "30-day window. Compare is on file. Do not cancel Hale.",
        taskId: AMS_WAVE3_IDS.haleRenewalDocsTask,
      },
      {
        id: AMS_WAVE3_IDS.haleInspection,
        tenantId: TENANT_ID,
        policyId: HALE_POLICY_ID,
        itemKey: "inspection",
        status: "incomplete",
      },
      {
        id: AMS_WAVE3_IDS.haleMortgagee,
        tenantId: TENANT_ID,
        policyId: HALE_POLICY_ID,
        itemKey: "mortgagee",
        status: "complete",
        completedAt: new Date("2026-08-20T16:00:00.000Z"),
        completedBy: DESK_AGENT_IDS.javy,
      },
      {
        id: AMS_WAVE3_IDS.haleIdCards,
        tenantId: TENANT_ID,
        policyId: HALE_POLICY_ID,
        itemKey: "id_cards",
        status: "incomplete",
      },
      {
        id: AMS_WAVE3_IDS.harborRenewalDocs,
        tenantId: TENANT_ID,
        policyId: HARBOR_POLICY_ID,
        itemKey: "renewal_docs",
        status: "complete",
        completedAt: new Date("2026-09-01T16:00:00.000Z"),
        completedBy: DESK_AGENT_IDS.javy,
      },
      {
        id: AMS_WAVE3_IDS.harborInspection,
        tenantId: TENANT_ID,
        policyId: HARBOR_POLICY_ID,
        itemKey: "inspection",
        status: "incomplete",
        notes: "Marina slip inspection still out.",
      },
      {
        id: AMS_WAVE3_IDS.harborMortgagee,
        tenantId: TENANT_ID,
        policyId: HARBOR_POLICY_ID,
        itemKey: "mortgagee",
        status: "complete",
        completedAt: new Date("2026-08-15T16:00:00.000Z"),
        completedBy: DESK_AGENT_IDS.javy,
      },
      {
        id: AMS_WAVE3_IDS.harborIdCards,
        tenantId: TENANT_ID,
        policyId: HARBOR_POLICY_ID,
        itemKey: "id_cards",
        status: "complete",
        completedAt: new Date("2026-08-15T16:00:00.000Z"),
        completedBy: DESK_AGENT_IDS.javy,
      },
    ])
    .onConflictDoUpdate({
      target: policyServicingChecks.id,
      set: { updatedAt: new Date() },
    });

  await db
    .insert(policyServiceRequests)
    .values({
      id: AMS_WAVE3_IDS.harborWithdrawnCancel,
      tenantId: TENANT_ID,
      policyId: HARBOR_POLICY_ID,
      kind: "cancellation",
      status: "withdrawn",
      reason: "insured_request",
      summary: "Insured asked about a mid-term cancel, then kept the GL. Withdrawn — Harbor stays in force.",
      effectiveDate: new Date("2026-09-15T12:00:00.000Z"),
      requestedBy: DESK_AGENT_IDS.javy,
      requestedByName: "Javy Garcia",
    })
    .onConflictDoUpdate({
      target: policyServiceRequests.id,
      set: {
        status: "withdrawn",
        summary: "Insured asked about a mid-term cancel, then kept the GL. Withdrawn — Harbor stays in force.",
        updatedAt: new Date(),
      },
    });

  await db.delete(policyServiceRequestEvents).where(eq(policyServiceRequestEvents.id, AMS_WAVE3_IDS.elenaEndorsementEvent));
  await db.delete(policyServiceRequestEvents).where(eq(policyServiceRequestEvents.id, AMS_WAVE3_IDS.haleEndorsementEvent));
  await db.delete(policyServiceRequestEvents).where(eq(policyServiceRequestEvents.id, AMS_WAVE3_IDS.harborCancelEvent));
  await db.insert(policyServiceRequestEvents).values([
    {
      id: AMS_WAVE3_IDS.elenaEndorsementEvent,
      tenantId: TENANT_ID,
      requestId: AMS_WAVE2_IDS.elenaEndorsementRequest,
      policyId: ELENA_POLICY_ID,
      action: "started",
      body: "Endorsement moved to in progress. Mortgagee packet still incomplete. Policy not rewritten.",
      actorId: DESK_AGENT_IDS.javy,
      actorName: "Javy Garcia",
      occurredAt: new Date("2026-09-03T17:00:00.000Z"),
    },
    {
      id: AMS_WAVE3_IDS.haleEndorsementEvent,
      tenantId: TENANT_ID,
      requestId: AMS_WAVE2_IDS.haleEndorsementRequest,
      policyId: HALE_POLICY_ID,
      action: "requested",
      body: "Coverage A endorsement requested before the 10/1 renewal. Hale stays Active — do not auto-cancel.",
      actorId: DESK_AGENT_IDS.javy,
      actorName: "Javy Garcia",
      occurredAt: new Date("2026-09-03T17:05:00.000Z"),
    },
    {
      id: AMS_WAVE3_IDS.harborCancelEvent,
      tenantId: TENANT_ID,
      requestId: AMS_WAVE3_IDS.harborWithdrawnCancel,
      policyId: HARBOR_POLICY_ID,
      action: "withdrawn",
      body: "Cancellation withdrawn. Harbor Key GL stays in force.",
      actorId: DESK_AGENT_IDS.javy,
      actorName: "Javy Garcia",
      occurredAt: new Date("2026-09-03T17:20:00.000Z"),
    },
  ]);

  await db
    .insert(activities)
    .values([
      {
        id: AMS_WAVE3_IDS.elenaMortgageeActivity,
        tenantId: TENANT_ID,
        kind: "task",
        title: "Servicing · Mortgagee · HO3-ELENA-2026",
        notes: "Mortgagee is incomplete on HO3-ELENA-2026. In-desk task only — do not email.",
        status: "open",
        contactId: ELENA_CONTACT_ID,
        policyId: ELENA_POLICY_ID,
        dueAt: new Date("2026-09-12T16:00:00.000Z"),
      },
      {
        id: AMS_WAVE3_IDS.haleRenewalActivity,
        tenantId: TENANT_ID,
        kind: "task",
        title: "Servicing · Renewal docs due · HP-FL-88421",
        notes: "Renewal packet due. Hale stays Active. In-desk only — no email.",
        status: "open",
        contactId: HALE_CONTACT_ID,
        policyId: HALE_POLICY_ID,
        dueAt: new Date("2026-10-01T16:00:00.000Z"),
      },
    ])
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: activities.title,
        notes: activities.notes,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE3_IDS.elenaMortgageeActivity));
  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE3_IDS.haleRenewalActivity));
  await db.insert(activityLogs).values([
    {
      id: AMS_WAVE3_IDS.elenaMortgageeActivity,
      tenantId: TENANT_ID,
      activityId: AMS_WAVE3_IDS.elenaMortgageeActivity,
      kind: "task",
      eventType: "servicing_task",
      body: "Mortgagee is incomplete on HO3-ELENA-2026. In-desk task only — do not email.",
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      occurredAt: new Date("2026-09-03T17:30:00.000Z"),
    },
    {
      id: AMS_WAVE3_IDS.haleRenewalActivity,
      tenantId: TENANT_ID,
      activityId: AMS_WAVE3_IDS.haleRenewalActivity,
      kind: "task",
      eventType: "servicing_task",
      body: "Renewal packet due. Hale stays Active. In-desk only — no email.",
      contactId: HALE_CONTACT_ID,
      policyId: HALE_POLICY_ID,
      occurredAt: new Date("2026-09-03T17:35:00.000Z"),
    },
  ]);
}
