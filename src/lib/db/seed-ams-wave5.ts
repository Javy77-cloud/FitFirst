import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activities,
  activityLogs,
  certificateRequests,
  issuedCertificates,
  policyAdditionalInterests,
  policyServiceRequests,
  policyTerms,
  reviewTasks,
} from "./schema";
import {
  AMS_WAVE2_IDS,
  AMS_WAVE5_IDS,
  ELENA_POLICY_ID,
  HALE_CONTACT_ID,
  HALE_POLICY_ID,
  HARBOR_CERTIFICATE_ID,
  HARBOR_POLICY_ID,
  TENANT_ID,
} from "../fixtures/ids";
import { packetTaskTitle } from "@/lib/ams/packet-tasks";
import { servicingTaskKind } from "@/lib/domain-ams";

const ELENA_PRIOR_COVERAGES = [
  { key: "cov_a", label: "Coverage A — Dwelling", value: "$385,000" },
  { key: "cov_b", label: "Coverage B — Other structures", value: "$38,500" },
  { key: "cov_c", label: "Coverage C — Personal property", value: "$192,500" },
];

const ELENA_CURRENT_COVERAGES = [
  { key: "cov_a", label: "Coverage A — Dwelling", value: "$385,000" },
  { key: "cov_b", label: "Coverage B — Other structures", value: "$38,500" },
  { key: "cov_c", label: "Coverage C — Personal property", value: "$192,500" },
];

export async function seedAmsWave5() {
  await db
    .insert(policyAdditionalInterests)
    .values([
      {
        id: AMS_WAVE5_IDS.harborBrevardAi,
        tenantId: TENANT_ID,
        policyId: HARBOR_POLICY_ID,
        kind: "additional_interest",
        name: "Brevard County Parks",
        address: "2725 Judge Fran Jamieson Way",
        city: "Viera",
        state: "FL",
        zip: "32940",
        notes: "Certificate holder on the open Harbor COI request. Not issued yet.",
      },
      {
        id: AMS_WAVE5_IDS.harborPalmBayAi,
        tenantId: TENANT_ID,
        policyId: HARBOR_POLICY_ID,
        kind: "certificate_holder",
        name: "Palm Bay Marina Dockage",
        address: "100 Harbour Way",
        city: "Palm Bay",
        state: "FL",
        zip: "32907",
        notes: "Already issued stub COI-20260820-0001. Additional insured on GL-HARBOR-2026.",
      },
    ])
    .onConflictDoUpdate({
      target: policyAdditionalInterests.id,
      set: {
        name: policyAdditionalInterests.name,
        notes: policyAdditionalInterests.notes,
        updatedAt: new Date(),
      },
    });

  await db
    .update(certificateRequests)
    .set({
      interestId: AMS_WAVE5_IDS.harborBrevardAi,
      additionalInsured: "Brevard County Parks",
      specialWording:
        "Additional insured as respects marina operations and slip use only. Desk stub — not a licensed ACORD product.",
      updatedAt: new Date(),
    })
    .where(eq(certificateRequests.id, AMS_WAVE2_IDS.harborCoiRequest));

  await db
    .update(issuedCertificates)
    .set({
      additionalInsured: "Palm Bay Marina Dockage",
      specialWording:
        "Additional insured as respects marina operations only. Desk stub — not a licensed ACORD product.",
      interestId: AMS_WAVE5_IDS.harborPalmBayAi,
    })
    .where(eq(issuedCertificates.id, HARBOR_CERTIFICATE_ID));

  await db
    .update(policyServiceRequests)
    .set({ workDesk: "csr", updatedAt: new Date() })
    .where(eq(policyServiceRequests.id, AMS_WAVE2_IDS.elenaEndorsementRequest));
  await db
    .update(policyServiceRequests)
    .set({ workDesk: "producer", updatedAt: new Date() })
    .where(eq(policyServiceRequests.id, AMS_WAVE2_IDS.haleEndorsementRequest));

  await db
    .insert(reviewTasks)
    .values([
      {
        id: AMS_WAVE5_IDS.haleIdCardTask,
        tenantId: TENANT_ID,
        contactId: HALE_CONTACT_ID,
        policyId: HALE_POLICY_ID,
        kind: servicingTaskKind("id_card"),
        title: packetTaskTitle("id_card", "HP-FL-88421"),
        dueDate: new Date("2026-09-18T16:00:00.000Z"),
        status: "open",
      },
      {
        id: AMS_WAVE5_IDS.haleAorTask,
        tenantId: TENANT_ID,
        contactId: HALE_CONTACT_ID,
        policyId: HALE_POLICY_ID,
        kind: servicingTaskKind("aor"),
        title: packetTaskTitle("aor", "HP-FL-88421"),
        dueDate: new Date("2026-09-18T16:00:00.000Z"),
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
    .values([
      {
        id: AMS_WAVE5_IDS.haleIdCardActivity,
        tenantId: TENANT_ID,
        kind: "task",
        title: packetTaskTitle("id_card", "HP-FL-88421"),
        notes: "ID cards missing on HP-FL-88421. Auto suspense task. Do not cancel Hale.",
        status: "open",
        contactId: HALE_CONTACT_ID,
        policyId: HALE_POLICY_ID,
        dueAt: new Date("2026-09-18T16:00:00.000Z"),
      },
      {
        id: AMS_WAVE5_IDS.haleAorActivity,
        tenantId: TENANT_ID,
        kind: "task",
        title: packetTaskTitle("aor", "HP-FL-88421"),
        notes: "AOR packet missing on HP-FL-88421. Auto suspense task. Do not cancel Hale.",
        status: "open",
        contactId: HALE_CONTACT_ID,
        policyId: HALE_POLICY_ID,
        dueAt: new Date("2026-09-18T16:00:00.000Z"),
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

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE5_IDS.haleIdCardLog));
  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE5_IDS.haleAorLog));
  await db.insert(activityLogs).values([
    {
      id: AMS_WAVE5_IDS.haleIdCardLog,
      tenantId: TENANT_ID,
      activityId: AMS_WAVE5_IDS.haleIdCardActivity,
      kind: "task",
      eventType: "suspense_task",
      body: "ID cards missing on HP-FL-88421. Auto-opened in-app collect task. Policy stays in force.",
      contactId: HALE_CONTACT_ID,
      policyId: HALE_POLICY_ID,
      occurredAt: new Date("2026-09-05T15:20:00.000Z"),
    },
    {
      id: AMS_WAVE5_IDS.haleAorLog,
      tenantId: TENANT_ID,
      activityId: AMS_WAVE5_IDS.haleAorActivity,
      kind: "task",
      eventType: "suspense_task",
      body: "AOR packet missing on HP-FL-88421. Auto-opened in-app collect task. Policy stays in force.",
      contactId: HALE_CONTACT_ID,
      policyId: HALE_POLICY_ID,
      occurredAt: new Date("2026-09-05T15:21:00.000Z"),
    },
  ]);

  await db
    .insert(policyTerms)
    .values({
      id: AMS_WAVE5_IDS.elenaPriorTerm,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      role: "prior",
      termEffective: new Date("2025-09-01T05:00:00.000Z"),
      termExpiration: new Date("2026-09-01T05:00:00.000Z"),
      premium: "2640.00",
      aopDeductible: "$2,500",
      hurricaneDeductible: "2%",
      coverages: ELENA_PRIOR_COVERAGES,
      notes: "Prior HO3 term. Same Policy — not a rewrite.",
      source: "seed",
    })
    .onConflictDoUpdate({
      target: policyTerms.id,
      set: {
        premium: "2640.00",
        notes: "Prior HO3 term. Same Policy — not a rewrite.",
      },
    });

  await db
    .insert(policyTerms)
    .values({
      id: AMS_WAVE5_IDS.elenaCurrentTerm,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      role: "current",
      termEffective: new Date("2026-09-01T05:00:00.000Z"),
      termExpiration: new Date("2027-09-01T05:00:00.000Z"),
      premium: "2840.00",
      aopDeductible: "$2,500",
      hurricaneDeductible: "2%",
      coverages: ELENA_CURRENT_COVERAGES,
      notes: "In-force HO3-ELENA-2026. Cov A $385,000. Ana stays unbound.",
      source: "seed",
    })
    .onConflictDoUpdate({
      target: policyTerms.id,
      set: {
        premium: "2840.00",
        notes: "In-force HO3-ELENA-2026. Cov A $385,000. Ana stays unbound.",
      },
    });
}
