import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activities,
  activityLogs,
  carrierDownloadConnections,
  certificateRequests,
  policyServiceRequests,
} from "./schema";
import {
  AMS_WAVE2_IDS,
  DESK_AGENT_IDS,
  ELENA_CONTACT_ID,
  ELENA_POLICY_ID,
  HALE_POLICY_ID,
  HARBOR_ACCOUNT_ID,
  HARBOR_POLICY_ID,
  TENANT_ID,
} from "../fixtures/ids";
import { CARRIER_DOWNLOAD_NOT_CONNECTED, CARRIER_DOWNLOAD_STUB_REASON } from "@/lib/domain-ams";

export async function seedAmsWave2() {
  await db
    .insert(policyServiceRequests)
    .values([
      {
        id: AMS_WAVE2_IDS.elenaEndorsementRequest,
        tenantId: TENANT_ID,
        policyId: ELENA_POLICY_ID,
        kind: "endorsement",
        status: "in_progress",
        reason: "additional_interest",
        summary: "Lender asked for a mortgagee endorsement. Same HO3 — do not rewrite.",
        effectiveDate: new Date("2026-09-10T12:00:00.000Z"),
        coverageA: null,
        premium: null,
        requestedBy: DESK_AGENT_IDS.javy,
        requestedByName: "Javy Garcia",
      },
      {
        id: AMS_WAVE2_IDS.haleEndorsementRequest,
        tenantId: TENANT_ID,
        policyId: HALE_POLICY_ID,
        kind: "endorsement",
        status: "requested",
        reason: "coverage_change",
        summary: "Insured asked to raise Coverage A before the 10/1 renewal.",
        effectiveDate: new Date("2026-09-20T12:00:00.000Z"),
        coverageA: 285000,
        premium: "2547.00",
        requestedBy: DESK_AGENT_IDS.javy,
        requestedByName: "Javy Garcia",
      },
    ])
    .onConflictDoUpdate({
      target: policyServiceRequests.id,
      set: { updatedAt: new Date() },
    });

  await db
    .insert(certificateRequests)
    .values({
      id: AMS_WAVE2_IDS.harborCoiRequest,
      tenantId: TENANT_ID,
      accountId: HARBOR_ACCOUNT_ID,
      policyId: HARBOR_POLICY_ID,
      holderName: "Brevard County Parks",
      holderAddress: "2725 Judge Fran Jamieson Way\nViera, FL 32940",
      jobLocation: "Harbor Key marina operations",
      status: "requested",
      notes: "New holder. Do not reuse Palm Bay Marina Dockage.",
      requestedBy: DESK_AGENT_IDS.javy,
      requestedByName: "Javy Garcia",
    })
    .onConflictDoUpdate({
      target: certificateRequests.id,
      set: {
        holderName: "Brevard County Parks",
        status: "requested",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(carrierDownloadConnections)
    .values([
      {
        id: AMS_WAVE2_IDS.ivansConnection,
        tenantId: TENANT_ID,
        provider: "ivans",
        status: CARRIER_DOWNLOAD_NOT_CONNECTED,
        lastAttemptAt: null,
        lastError: null,
        notes: CARRIER_DOWNLOAD_STUB_REASON,
      },
      {
        id: AMS_WAVE2_IDS.al3Connection,
        tenantId: TENANT_ID,
        provider: "al3",
        status: CARRIER_DOWNLOAD_NOT_CONNECTED,
        lastAttemptAt: null,
        lastError: null,
        notes: CARRIER_DOWNLOAD_STUB_REASON,
      },
    ])
    .onConflictDoUpdate({
      target: carrierDownloadConnections.id,
      set: {
        status: CARRIER_DOWNLOAD_NOT_CONNECTED,
        notes: CARRIER_DOWNLOAD_STUB_REASON,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(activities)
    .values([
      {
        id: AMS_WAVE2_IDS.elenaRequestActivity,
        tenantId: TENANT_ID,
        kind: "task",
        title: "Endorsement in progress",
        notes: "Lender mortgagee endorsement requested on HO3-ELENA-2026. Not filed yet.",
        status: "open",
        contactId: ELENA_CONTACT_ID,
        policyId: ELENA_POLICY_ID,
        dueAt: new Date("2026-09-12T16:00:00.000Z"),
      },
      {
        id: AMS_WAVE2_IDS.harborCoiActivity,
        tenantId: TENANT_ID,
        kind: "task",
        title: "COI requested · Brevard County Parks",
        notes: "Certificate stub requested. Not a licensed ACORD product.",
        status: "open",
        accountId: HARBOR_ACCOUNT_ID,
        policyId: HARBOR_POLICY_ID,
        dueAt: new Date("2026-09-08T16:00:00.000Z"),
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

  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE2_IDS.elenaRequestLog));
  await db.delete(activityLogs).where(eq(activityLogs.id, AMS_WAVE2_IDS.harborCoiLog));
  await db.insert(activityLogs).values([
    {
      id: AMS_WAVE2_IDS.elenaRequestLog,
      tenantId: TENANT_ID,
      activityId: AMS_WAVE2_IDS.elenaRequestActivity,
      kind: "task",
      eventType: "service_requested",
      body: "Endorsement requested on HO3-ELENA-2026. Status: in progress. Policy not rewritten.",
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      occurredAt: new Date("2026-09-03T17:00:00.000Z"),
    },
    {
      id: AMS_WAVE2_IDS.harborCoiLog,
      tenantId: TENANT_ID,
      activityId: AMS_WAVE2_IDS.harborCoiActivity,
      kind: "task",
      eventType: "coi_requested",
      body: "COI stub requested for Brevard County Parks. Not a licensed ACORD product.",
      accountId: HARBOR_ACCOUNT_ID,
      policyId: HARBOR_POLICY_ID,
      occurredAt: new Date("2026-09-03T17:10:00.000Z"),
    },
  ]);
}
