import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activities,
  activityLogs,
  certificateHolderContacts,
  certificateRequests,
  renewalQueue,
} from "./schema";
import {
  AMS_WAVE2_IDS,
  AMS_WAVE8_IDS,
  ELENA_CONTACT_ID,
  ELENA_POLICY_ID,
  HALE_CONTACT_ID,
  HALE_POLICY_ID,
  HARBOR_ACCOUNT_ID,
  NAIR_POLICY_ID,
  TENANT_ID,
} from "../fixtures/ids";

export async function seedAmsWave8() {
  await db
    .insert(certificateHolderContacts)
    .values({
      id: AMS_WAVE8_IDS.palmBayHolder,
      tenantId: TENANT_ID,
      accountId: HARBOR_ACCOUNT_ID,
      name: "Palm Bay Marina Dockage",
      email: "certs@palmbaymarina.example",
      phone: "321-555-0144",
      address: "100 Harbor Key Blvd",
      city: "Palm Bay",
      state: "FL",
      zip: "32905",
      notes: "Issued stub already on Harbor. Waiver + PNC on file. Do not re-issue.",
      status: "active",
    })
    .onConflictDoUpdate({
      target: certificateHolderContacts.id,
      set: {
        email: "certs@palmbaymarina.example",
        phone: "321-555-0144",
        status: "active",
        notes: "Issued stub already on Harbor. Waiver + PNC on file. Do not re-issue.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(certificateHolderContacts)
    .values({
      id: AMS_WAVE8_IDS.brevardHolder,
      tenantId: TENANT_ID,
      accountId: HARBOR_ACCOUNT_ID,
      name: "Brevard County Parks",
      email: "coi@brevardparks.example",
      phone: "321-555-0190",
      address: "2725 Judge Fran Jamieson Way",
      city: "Viera",
      state: "FL",
      zip: "32940",
      notes: "Open Harbor COI. Contact record only — does not issue the stub.",
      status: "active",
    })
    .onConflictDoUpdate({
      target: certificateHolderContacts.id,
      set: {
        email: "coi@brevardparks.example",
        phone: "321-555-0190",
        status: "active",
        notes: "Open Harbor COI. Contact record only — does not issue the stub.",
        updatedAt: new Date(),
      },
    });

  await db
    .update(certificateRequests)
    .set({
      holderContactId: AMS_WAVE8_IDS.brevardHolder,
      updatedAt: new Date(),
    })
    .where(eq(certificateRequests.id, AMS_WAVE2_IDS.harborCoiRequest));

  await db
    .insert(renewalQueue)
    .values({
      id: AMS_WAVE8_IDS.haleRenewalQueue,
      tenantId: TENANT_ID,
      policyId: HALE_POLICY_ID,
      stage: "quoting",
      notes: "Heritage proposed $2,547 vs current $2,184. Desk queue stub. Do not bind. Do not file.",
    })
    .onConflictDoUpdate({
      target: renewalQueue.id,
      set: {
        stage: "quoting",
        notes: "Heritage proposed $2,547 vs current $2,184. Desk queue stub. Do not bind. Do not file.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(renewalQueue)
    .values({
      id: AMS_WAVE8_IDS.nairRenewalQueue,
      tenantId: TENANT_ID,
      policyId: NAIR_POLICY_ID,
      stage: "upcoming",
      notes: "PA-FL-22910 in the 90-day window. Proposed is lower. Queue stub only.",
    })
    .onConflictDoUpdate({
      target: renewalQueue.id,
      set: {
        stage: "upcoming",
        notes: "PA-FL-22910 in the 90-day window. Proposed is lower. Queue stub only.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE8_IDS.elenaServiceNoteActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Servicing note · HO3-ELENA-2026",
      notes: "Logged the in-progress CSR endorsement on the service timeline. Do not file. Do not bind Ana.",
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

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE8_IDS.elenaServiceNoteLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE8_IDS.elenaServiceNoteLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE8_IDS.elenaServiceNoteActivity,
    kind: "task",
    eventType: "service_note",
    body: "CSR endorsement still in progress. Mortgagee wording stub is drafted. Service timeline only — Policy stays in force. Do not file.",
    contactId: ELENA_CONTACT_ID,
    policyId: ELENA_POLICY_ID,
    occurredAt: new Date("2026-09-05T18:05:00.000Z"),
  });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE8_IDS.haleQueueActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Renewal queue · HP-FL-88421 · quoting",
      notes: "Hale moved to quoting on the renewal queue stub. Do not bind.",
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

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE8_IDS.haleQueueLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE8_IDS.haleQueueLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE8_IDS.haleQueueActivity,
    kind: "task",
    eventType: "renewal_queue_moved",
    body: "HP-FL-88421 moved to quoting. Desk stub only — no rater, no bind. Policy stays in force.",
    contactId: HALE_CONTACT_ID,
    policyId: HALE_POLICY_ID,
    occurredAt: new Date("2026-09-05T18:10:00.000Z"),
  });

  await db
    .insert(activities)
    .values({
      id: AMS_WAVE8_IDS.palmBayActivity,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Holder contact added · Palm Bay Marina Dockage",
      notes: "Contact record for the issued Harbor stub. Does not issue a COI.",
      status: "completed",
      accountId: HARBOR_ACCOUNT_ID,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: activities.title,
        notes: activities.notes,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE8_IDS.palmBayLog));
  await db.insert(activityLogs).values({
    id: AMS_WAVE8_IDS.palmBayLog,
    tenantId: TENANT_ID,
    activityId: AMS_WAVE8_IDS.palmBayActivity,
    kind: "task",
    eventType: "holder_contact_saved",
    body: "Palm Bay Marina Dockage contact saved (certs@palmbaymarina.example). Does not issue a COI and does not file an endorsement.",
    accountId: HARBOR_ACCOUNT_ID,
    occurredAt: new Date("2026-09-05T18:12:00.000Z"),
  });
}
