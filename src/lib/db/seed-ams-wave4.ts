import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activities,
  activityLogs,
  policyAdditionalInterests,
  reviewTasks,
} from "./schema";
import {
  AMS_WAVE4_IDS,
  ELENA_CONTACT_ID,
  ELENA_POLICY_ID,
  HALE_CONTACT_ID,
  HALE_POLICY_ID,
  TENANT_ID,
} from "../fixtures/ids";
import { packetTaskTitle } from "@/lib/ams/packet-tasks";
import { serviceRequestTaskKind, serviceRequestTaskTitle } from "@/lib/ams/service-requests";
import { SERVICE_REQUEST_TASK_KIND, servicingTaskKind } from "@/lib/domain-ams";

export async function seedAmsWave4() {
  await db
    .insert(policyAdditionalInterests)
    .values({
      id: AMS_WAVE4_IDS.elenaMortgagee,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      kind: "mortgagee",
      name: "First Community Bank ISAOA",
      address: "100 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32940",
      loanNumber: "88421-ELENA",
      clause: "ISAOA/ATIMA",
      notes: "Lender asked for this mortgagee on the in-progress endorsement. Not filed yet.",
    })
    .onConflictDoUpdate({
      target: policyAdditionalInterests.id,
      set: {
        name: "First Community Bank ISAOA",
        loanNumber: "88421-ELENA",
        notes: "Lender asked for this mortgagee on the in-progress endorsement. Not filed yet.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(reviewTasks)
    .values([
      {
        id: AMS_WAVE4_IDS.elenaAorTask,
        tenantId: TENANT_ID,
        contactId: ELENA_CONTACT_ID,
        policyId: ELENA_POLICY_ID,
        kind: servicingTaskKind("aor"),
        title: packetTaskTitle("aor", "HO3-ELENA-2026"),
        dueDate: new Date("2026-09-15T16:00:00.000Z"),
        status: "open",
      },
      {
        id: AMS_WAVE4_IDS.elenaServiceTask,
        tenantId: TENANT_ID,
        contactId: ELENA_CONTACT_ID,
        policyId: ELENA_POLICY_ID,
        kind: serviceRequestTaskKind(),
        title: serviceRequestTaskTitle("endorsement", "HO3-ELENA-2026"),
        dueDate: new Date("2026-09-12T16:00:00.000Z"),
        status: "open",
      },
      {
        id: AMS_WAVE4_IDS.haleServiceTask,
        tenantId: TENANT_ID,
        contactId: HALE_CONTACT_ID,
        policyId: HALE_POLICY_ID,
        kind: SERVICE_REQUEST_TASK_KIND,
        title: serviceRequestTaskTitle("endorsement", "HP-FL-88421"),
        dueDate: new Date("2026-09-20T16:00:00.000Z"),
        status: "open",
      },
    ])
    .onConflictDoUpdate({
      target: reviewTasks.id,
      set: {
        title: reviewTasks.title,
        status: "open",
      },
    });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE4_IDS.elenaAorActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: packetTaskTitle("aor", "HO3-ELENA-2026"),
      notes: "AOR packet slot is empty on HO3-ELENA-2026. In-app task only. Do not bind Ana.",
      status: "open",
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dueAt: new Date("2026-09-15T16:00:00.000Z"),
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: packetTaskTitle("aor", "HO3-ELENA-2026"),
        notes: "AOR packet slot is empty on HO3-ELENA-2026. In-app task only. Do not bind Ana.",
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE4_IDS.elenaAorLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE4_IDS.elenaAorLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE4_IDS.elenaAorActivity,
    kind: "task",
    eventType: "packet_task",
    body: "AOR packet missing on HO3-ELENA-2026. Created in-app collect task. Policy stays bound.",
    contactId: ELENA_CONTACT_ID,
    policyId: ELENA_POLICY_ID,
    occurredAt: new Date("2026-09-04T15:00:00.000Z"),
  });
}
