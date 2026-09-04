import { eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db, sql } from "./index";
import { alerts, eoAuditLogs } from "./schema";
import { loadEoGapFlags } from "@/lib/eo-audit/load";
import {
  ADMIN_NAME,
  ADMIN_USER_ID,
  AGENT_NAME,
  AGENT_USER_ID,
  ELENA_CALL_ID,
  ELENA_CONTACT_ID,
  ELENA_DEAL_ID,
  ELENA_MEETING_ID,
  ELENA_POLICY_ID,
  ELENA_QUOTE_PDF_AI_ID,
  EO_ALERT_IDS,
  EO_AUDIT_IDS,
  HARBOR_ACCOUNT_ID,
  HARBOR_CONTACT_ID,
  HARBOR_DEAL_ID,
  HARBOR_POLICY_ID,
} from "@/lib/fixtures/ids";

const SEED_AUDIT_IDS = Object.values(EO_AUDIT_IDS);
const SEED_ALERT_IDS = Object.values(EO_ALERT_IDS);

export async function seedEoAudit() {
  await sql`SELECT set_config('fitfirst.allow_eo_audit_mutate', 'on', false)`;
  await db.delete(eoAuditLogs).where(inArray(eoAuditLogs.id, SEED_AUDIT_IDS));

  await db.insert(eoAuditLogs).values([
    {
      id: EO_AUDIT_IDS.elenaEmailOut,
      tenantId: DEFAULT_TENANT_ID,
      occurredAt: new Date("2026-09-01T16:00:00.000Z"),
      actorId: AGENT_USER_ID,
      actorName: AGENT_NAME,
      action: "email",
      summary: "Sent HO3 bind confirmation to Elena Ruiz",
      entityType: "policy",
      entityId: ELENA_POLICY_ID,
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      activityId: "44444444-4444-4444-8444-444444444461",
      meta: { direction: "outbound", subject: "HO3 bind confirmation" },
    },
    {
      id: EO_AUDIT_IDS.elenaEmailIn,
      tenantId: DEFAULT_TENANT_ID,
      occurredAt: new Date("2026-09-02T14:30:00.000Z"),
      actorId: null,
      actorName: "Elena Ruiz",
      action: "email",
      summary: "Received reply on HO3 bind confirmation",
      entityType: "policy",
      entityId: ELENA_POLICY_ID,
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      meta: { direction: "inbound" },
    },
    {
      id: EO_AUDIT_IDS.harborSmsOut,
      tenantId: DEFAULT_TENANT_ID,
      occurredAt: new Date("2026-08-20T15:00:00.000Z"),
      actorId: AGENT_USER_ID,
      actorName: AGENT_NAME,
      action: "sms",
      summary: "Sent COI notice to Harbor Key Marine",
      entityType: "account",
      entityId: HARBOR_ACCOUNT_ID,
      contactId: HARBOR_CONTACT_ID,
      accountId: HARBOR_ACCOUNT_ID,
      policyId: HARBOR_POLICY_ID,
      dealId: HARBOR_DEAL_ID,
      meta: { direction: "outbound" },
    },
    {
      id: EO_AUDIT_IDS.elenaCall,
      tenantId: DEFAULT_TENANT_ID,
      occurredAt: new Date("2026-09-02T16:15:00.000Z"),
      actorId: AGENT_USER_ID,
      actorName: AGENT_NAME,
      action: "call",
      summary: "Logged follow-up call on Melbourne HO3",
      entityType: "policy",
      entityId: ELENA_POLICY_ID,
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      activityId: ELENA_CALL_ID,
      meta: { direction: "outbound", outcome: "reached" },
    },
    {
      id: EO_AUDIT_IDS.elenaMeeting,
      tenantId: DEFAULT_TENANT_ID,
      occurredAt: new Date("2026-09-03T14:00:00.000Z"),
      actorId: ADMIN_USER_ID,
      actorName: ADMIN_NAME,
      action: "meeting",
      summary: "In-office review of Elena Ruiz HO3 file",
      entityType: "deal",
      entityId: ELENA_DEAL_ID,
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      activityId: ELENA_MEETING_ID,
      meta: { meetingType: "in_office" },
    },
    {
      id: EO_AUDIT_IDS.elenaDocView,
      tenantId: DEFAULT_TENANT_ID,
      occurredAt: new Date("2026-09-03T15:40:00.000Z"),
      actorId: AGENT_USER_ID,
      actorName: AGENT_NAME,
      action: "doc_view",
      summary: "Viewed American Integrity quote PDF on Ruiz · Melbourne HO3",
      entityType: "document",
      entityId: ELENA_QUOTE_PDF_AI_ID,
      contactId: ELENA_CONTACT_ID,
      dealId: ELENA_DEAL_ID,
      documentId: ELENA_QUOTE_PDF_AI_ID,
      meta: { filename: "american-integrity-quote-2840.pdf", download: false },
    },
    {
      id: EO_AUDIT_IDS.elenaPiiReveal,
      tenantId: DEFAULT_TENANT_ID,
      occurredAt: new Date("2026-09-03T16:05:00.000Z"),
      actorId: ADMIN_USER_ID,
      actorName: ADMIN_NAME,
      action: "reveal_pii",
      summary: "Revealed SSN on Elena Ruiz (last4 only in vault log)",
      entityType: "contact",
      entityId: ELENA_CONTACT_ID,
      contactId: ELENA_CONTACT_ID,
      meta: { fieldKey: "ssn", last4: "4444" },
    },
    {
      id: EO_AUDIT_IDS.elenaPolicyChange,
      tenantId: DEFAULT_TENANT_ID,
      occurredAt: new Date("2026-09-02T18:00:00.000Z"),
      actorId: ADMIN_USER_ID,
      actorName: ADMIN_NAME,
      action: "policy_change",
      summary: "Confirmed HO3-ELENA-2026 Active after bind — no coverage change",
      entityType: "policy",
      entityId: ELENA_POLICY_ID,
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      meta: { status: { from: "bound", to: "active" } },
    },
  ]);

  const flags = await loadEoGapFlags();
  await db.delete(alerts).where(inArray(alerts.id, SEED_ALERT_IDS));

  const byKind = {
    renewal_silent_90: flags.filter((row) => row.kind === "renewal_silent_90"),
    bound_missing_signed_app: flags.filter((row) => row.kind === "bound_missing_signed_app"),
    quote_sent_no_followup: flags.filter((row) => row.kind === "quote_sent_no_followup"),
  } as const;

  const alertSeeds = [
    byKind.renewal_silent_90[0]
      ? {
          id: EO_ALERT_IDS.renewalSilent,
          title: `E&O · ${byKind.renewal_silent_90.length} silent before renewal`,
          body: `${byKind.renewal_silent_90[0].recordLabel}. Open Compliance. In-app only — nothing emailed Javy.`,
          entityType: "policy" as const,
          entityId: byKind.renewal_silent_90[0].entityId,
          kind: "eo_gap",
          severity: "warning",
        }
      : null,
    byKind.bound_missing_signed_app[0]
      ? {
          id: EO_ALERT_IDS.boundSignedApp,
          title: `E&O · ${byKind.bound_missing_signed_app.length} Bound without signed app`,
          body: `${byKind.bound_missing_signed_app[0].recordLabel}. Open Compliance. In-app only — nothing emailed Javy.`,
          entityType: "policy" as const,
          entityId: byKind.bound_missing_signed_app[0].entityId,
          kind: "eo_gap",
          severity: "high",
        }
      : null,
    byKind.quote_sent_no_followup[0]
      ? {
          id: EO_ALERT_IDS.quoteFollowup,
          title: `E&O · ${byKind.quote_sent_no_followup.length} Quote Sent with no follow-up`,
          body: `${byKind.quote_sent_no_followup[0].recordLabel}. Ana stays unbound. In-app only — nothing emailed Javy.`,
          entityType: "deal" as const,
          entityId: byKind.quote_sent_no_followup[0].entityId,
          kind: "eo_gap",
          severity: "warning",
        }
      : null,
  ].filter(Boolean);

  if (alertSeeds.length) {
    await db.insert(alerts).values(
      alertSeeds.map((row) => ({
        id: row!.id,
        tenantId: DEFAULT_TENANT_ID,
        kind: row!.kind,
        title: row!.title,
        body: row!.body,
        severity: row!.severity,
        entityType: row!.entityType,
        entityId: row!.entityId,
        userId: ADMIN_USER_ID,
        recipientUserId: ADMIN_USER_ID,
      })),
    );
  }
}
