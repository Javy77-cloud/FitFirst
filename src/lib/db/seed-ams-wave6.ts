import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activities,
  activityLogs,
  certificateRequests,
  issuedCertificates,
  policyNotices,
  reviewTasks,
} from "./schema";
import {
  AMS_WAVE2_IDS,
  AMS_WAVE4_IDS,
  AMS_WAVE6_IDS,
  HALE_CONTACT_ID,
  HALE_POLICY_ID,
  HARBOR_CERTIFICATE_ID,
  TENANT_ID,
} from "../fixtures/ids";

export async function seedAmsWave6() {
  await db
    .update(reviewTasks)
    .set({ status: "open" })
    .where(eq(reviewTasks.id, AMS_WAVE4_IDS.elenaAorTask));

  await db
    .update(certificateRequests)
    .set({
      waiverOfSubrogation: false,
      primaryNoncontributory: false,
      updatedAt: new Date(),
    })
    .where(eq(certificateRequests.id, AMS_WAVE2_IDS.harborCoiRequest));

  await db
    .update(issuedCertificates)
    .set({
      waiverOfSubrogation: true,
      primaryNoncontributory: true,
    })
    .where(eq(issuedCertificates.id, HARBOR_CERTIFICATE_ID));

  await db
    .insert(policyNotices)
    .values({
      id: AMS_WAVE6_IDS.haleNonRenewNotice,
      tenantId: TENANT_ID,
      policyId: HALE_POLICY_ID,
      kind: "non_renewal",
      status: "drafted",
      reason: "Carrier appetite — draft only. Do not mail. Do not file.",
      effectiveOn: new Date("2026-10-15T05:00:00.000Z"),
      notes: "HP-FL-88421 stays in force. Notice diary only.",
    })
    .onConflictDoUpdate({
      target: policyNotices.id,
      set: {
        status: "drafted",
        reason: "Carrier appetite — draft only. Do not mail. Do not file.",
        notes: "HP-FL-88421 stays in force. Notice diary only.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE6_IDS.haleNoticeActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Non-renewal notice · HP-FL-88421",
      notes: "Draft notice only. Do not mail. Do not file. Hale stays in force.",
      status: "open",
      contactId: HALE_CONTACT_ID,
      policyId: HALE_POLICY_ID,
      dueAt: new Date("2026-10-15T05:00:00.000Z"),
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: activities.title,
        notes: activities.notes,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE6_IDS.haleNoticeLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE6_IDS.haleNoticeLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE6_IDS.haleNoticeActivity,
    kind: "task",
    eventType: "notice_drafted",
    body: "Draft non-renewal notice on HP-FL-88421. Policy status unchanged. Do not file.",
    contactId: HALE_CONTACT_ID,
    policyId: HALE_POLICY_ID,
    occurredAt: new Date("2026-09-05T16:40:00.000Z"),
  });
}
