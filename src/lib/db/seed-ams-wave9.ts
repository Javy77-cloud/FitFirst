import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activities,
  activityLogs,
  policyInspections,
  policyInstallments,
} from "./schema";
import {
  AMS_WAVE9_IDS,
  ELENA_CONTACT_ID,
  ELENA_POLICY_ID,
  HALE_CONTACT_ID,
  HALE_POLICY_ID,
  TENANT_ID,
} from "../fixtures/ids";

export async function seedAmsWave9() {
  await db
    .insert(policyInspections)
    .values({
      id: AMS_WAVE9_IDS.elenaRoofInspection,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      kind: "roof",
      status: "scheduled",
      vendor: "Brevard Roof Docs",
      scheduledOn: new Date("2026-09-12T14:00:00.000Z"),
      notes: "Roof photos for the in-progress CSR endorsement. Diary only. Do not file. Do not bind Ana.",
    })
    .onConflictDoUpdate({
      target: policyInspections.id,
      set: {
        status: "scheduled",
        vendor: "Brevard Roof Docs",
        notes: "Roof photos for the in-progress CSR endorsement. Diary only. Do not file. Do not bind Ana.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(policyInspections)
    .values({
      id: AMS_WAVE9_IDS.haleWindInspection,
      tenantId: TENANT_ID,
      policyId: HALE_POLICY_ID,
      kind: "wind_mit",
      status: "requested",
      vendor: "Space Coast Wind",
      notes: "Wind mit requested for Hale renewal quoting. Does not file. Do not cancel.",
    })
    .onConflictDoUpdate({
      target: policyInspections.id,
      set: {
        status: "requested",
        vendor: "Space Coast Wind",
        notes: "Wind mit requested for Hale renewal quoting. Does not file. Do not cancel.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(policyInstallments)
    .values({
      id: AMS_WAVE9_IDS.elenaInstallment,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      billType: "agency_bill",
      status: "scheduled",
      amount: "284.00",
      dueOn: new Date("2026-10-01T12:00:00.000Z"),
      notes: "October agency-bill installment on HO3-ELENA-2026. Diary stub. No Stripe.",
    })
    .onConflictDoUpdate({
      target: policyInstallments.id,
      set: {
        status: "scheduled",
        amount: "284.00",
        notes: "October agency-bill installment on HO3-ELENA-2026. Diary stub. No Stripe.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(policyInstallments)
    .values({
      id: AMS_WAVE9_IDS.haleInstallment,
      tenantId: TENANT_ID,
      policyId: HALE_POLICY_ID,
      billType: "agency_bill",
      status: "past_due",
      amount: "218.40",
      dueOn: new Date("2026-08-15T12:00:00.000Z"),
      notes: "August installment still owed on HP-FL-88421. Past due on the diary. Does not cancel.",
    })
    .onConflictDoUpdate({
      target: policyInstallments.id,
      set: {
        status: "past_due",
        amount: "218.40",
        notes: "August installment still owed on HP-FL-88421. Past due on the diary. Does not cancel.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE9_IDS.elenaInspectionActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Roof · HO3-ELENA-2026",
      notes: "Roof inspection scheduled. Diary only. Do not file.",
      status: "completed",
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: activities.title,
        notes: activities.notes,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE9_IDS.elenaInspectionLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE9_IDS.elenaInspectionLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE9_IDS.elenaInspectionActivity,
    kind: "task",
    eventType: "inspection_scheduled",
    body: "Roof inspection scheduled with Brevard Roof Docs on HO3-ELENA-2026. Diary only — does not file. Do not bind Ana.",
    contactId: ELENA_CONTACT_ID,
    policyId: ELENA_POLICY_ID,
    occurredAt: new Date("2026-09-05T18:20:00.000Z"),
  });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE9_IDS.haleInspectionActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Wind mitigation · HP-FL-88421",
      notes: "Wind mit requested. Does not file.",
      status: "completed",
      contactId: HALE_CONTACT_ID,
      policyId: HALE_POLICY_ID,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: activities.title,
        notes: activities.notes,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE9_IDS.haleInspectionLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE9_IDS.haleInspectionLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE9_IDS.haleInspectionActivity,
    kind: "task",
    eventType: "inspection_requested",
    body: "Wind mit requested on HP-FL-88421. Desk diary only. Do not file or cancel.",
    contactId: HALE_CONTACT_ID,
    policyId: HALE_POLICY_ID,
    occurredAt: new Date("2026-09-05T18:22:00.000Z"),
  });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE9_IDS.elenaInstallmentActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Installment · HO3-ELENA-2026 · scheduled",
      notes: "October agency-bill installment. No Stripe.",
      status: "completed",
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: activities.title,
        notes: activities.notes,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE9_IDS.elenaInstallmentLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE9_IDS.elenaInstallmentLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE9_IDS.elenaInstallmentActivity,
    kind: "task",
    eventType: "installment_scheduled",
    body: "HO3-ELENA-2026 October agency-bill $284.00 scheduled. Diary stub — no Stripe, no bind.",
    contactId: ELENA_CONTACT_ID,
    policyId: ELENA_POLICY_ID,
    occurredAt: new Date("2026-09-05T18:24:00.000Z"),
  });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE9_IDS.haleInstallmentActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Installment · HP-FL-88421 · past due",
      notes: "August installment still owed. Does not cancel.",
      status: "completed",
      contactId: HALE_CONTACT_ID,
      policyId: HALE_POLICY_ID,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: activities.title,
        notes: activities.notes,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE9_IDS.haleInstallmentLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE9_IDS.haleInstallmentLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE9_IDS.haleInstallmentActivity,
    kind: "task",
    eventType: "installment_past_due",
    body: "HP-FL-88421 August installment $218.40 is past due on the diary. Does not cancel the Policy. No Stripe.",
    contactId: HALE_CONTACT_ID,
    policyId: HALE_POLICY_ID,
    occurredAt: new Date("2026-09-05T18:26:00.000Z"),
  });
}
