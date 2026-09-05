import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activities,
  activityLogs,
  claimActivity,
  claimDiary,
  endorsementDrafts,
  reviewTasks,
} from "./schema";
import {
  AMS_WAVE2_IDS,
  AMS_WAVE4_IDS,
  AMS_WAVE5_IDS,
  AMS_WAVE7_IDS,
  CLAIM_IDS,
  CLAIM_POLICY_ID,
  ELENA_CONTACT_ID,
  ELENA_POLICY_ID,
  TENANT_ID,
} from "../fixtures/ids";

export async function seedAmsWave7() {
  await db
    .update(reviewTasks)
    .set({ status: "open", createdAt: new Date("2026-08-24T16:00:00.000Z") })
    .where(eq(reviewTasks.id, AMS_WAVE4_IDS.elenaAorTask));

  await db
    .update(reviewTasks)
    .set({ status: "open", createdAt: new Date("2026-07-28T16:00:00.000Z") })
    .where(eq(reviewTasks.id, AMS_WAVE5_IDS.haleIdCardTask));

  await db
    .update(reviewTasks)
    .set({ status: "open", createdAt: new Date("2026-08-12T16:00:00.000Z") })
    .where(eq(reviewTasks.id, AMS_WAVE5_IDS.haleAorTask));

  await db
    .insert(claimDiary)
    .values({
      id: AMS_WAVE7_IDS.elenaClaimDiary,
      tenantId: TENANT_ID,
      claimId: CLAIM_IDS.inquiry,
      policyId: ELENA_POLICY_ID,
      kind: "docs_requested",
      status: "open",
      dueAt: new Date("2026-09-10T16:00:00.000Z"),
      body: "Request roof photos on HO3-ELENA-2026. Handle FNOL on the carrier site. Do not file. Claim stays inquiry.",
    })
    .onConflictDoUpdate({
      target: claimDiary.id,
      set: {
        status: "open",
        body: "Request roof photos on HO3-ELENA-2026. Handle FNOL on the carrier site. Do not file. Claim stays inquiry.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(claimDiary)
    .values({
      id: AMS_WAVE7_IDS.camilaClaimDiary,
      tenantId: TENANT_ID,
      claimId: CLAIM_IDS.ruizHoWater,
      policyId: CLAIM_POLICY_ID,
      kind: "carrier_status",
      status: "completed",
      dueAt: new Date("2026-08-30T16:00:00.000Z"),
      completedAt: new Date("2026-08-30T18:00:00.000Z"),
      body: "Checked American Integrity site for AI-CLM-19044. Desk diary only. Not a carrier API.",
    })
    .onConflictDoUpdate({
      target: claimDiary.id,
      set: {
        status: "completed",
        updatedAt: new Date(),
      },
    });

  await db.delete(claimActivity).where(eq(claimActivity.id, AMS_WAVE7_IDS.elenaDiaryActivity));
  await db.insert(claimActivity).values({
    id: AMS_WAVE7_IDS.elenaDiaryActivity,
    tenantId: TENANT_ID,
    claimId: CLAIM_IDS.inquiry,
    eventType: "diary_added",
    body: "Docs requested · HO3-ELENA-2026. Desk diary only — claim status stays inquiry.",
    actor: "Javy",
    createdAt: new Date("2026-09-03T16:20:00.000Z"),
  });

  await db
    .insert(endorsementDrafts)
    .values({
      id: AMS_WAVE7_IDS.elenaEndorsementDraft,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      serviceRequestId: AMS_WAVE2_IDS.elenaEndorsementRequest,
      status: "drafted",
      formCode: "mortgagee",
      wording:
        "Add First Community Bank ISAOA as mortgagee on HO3-ELENA-2026. Desk wording stub only. Do not file.",
      effectiveOn: new Date("2026-09-15T05:00:00.000Z"),
      notes: "Tied to the in-progress CSR endorsement. Policy stays in force.",
    })
    .onConflictDoUpdate({
      target: endorsementDrafts.id,
      set: {
        status: "drafted",
        wording:
          "Add First Community Bank ISAOA as mortgagee on HO3-ELENA-2026. Desk wording stub only. Do not file.",
        notes: "Tied to the in-progress CSR endorsement. Policy stays in force.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE7_IDS.elenaDraftActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Endorsement draft · HO3-ELENA-2026",
      notes: "Mortgagee wording stub. Do not file. Elena stays in force.",
      status: "open",
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dueAt: new Date("2026-09-15T05:00:00.000Z"),
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: activities.title,
        notes: activities.notes,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE7_IDS.elenaDraftLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE7_IDS.elenaDraftLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE7_IDS.elenaDraftActivity,
    kind: "task",
    eventType: "endorsement_drafted",
    body: "Draft mortgagee wording on HO3-ELENA-2026. Policy status unchanged. Do not file.",
    contactId: ELENA_CONTACT_ID,
    policyId: ELENA_POLICY_ID,
    occurredAt: new Date("2026-09-05T17:10:00.000Z"),
  });
}
