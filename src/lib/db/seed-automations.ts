import { eq } from "drizzle-orm";
import { AGENCY_BRAND } from "@/lib/domain";
import { deleteSeededPlaybookFires, firePlaybook } from "@/lib/automations/fire";
import { demoTargetForPlaybook } from "@/lib/automations/demo-targets";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { db } from "./index";
import { emailSignatures, guidedAutomations } from "./schema";
import {
  ADMIN_NAME,
  ADMIN_USER_ID,
  AGENT_NAME,
  AGENT_USER_ID,
  AUTOMATION_ALERT_IDS,
  AUTOMATION_RUN_IDS,
  AUTOMATION_TASK_IDS,
  CONTACT_ID,
  DEAL_ID,
  DEMO_CONTACT_HALE,
  ELENA_CONTACT_ID,
  ELENA_DEAL_ID,
  ELENA_POLICY_ID,
  EMAIL_SIGNATURE_ID,
  GUIDED_AUTOMATION_IDS,
  HALE_CONTACT_ID,
  HALE_POLICY_ID,
  MAYA_SIGNATURE_DRAFT_ID,
  TENANT_ID,
} from "../fixtures/ids";

const SIGNATURE_EN = `Javier
${AGENCY_BRAND.name}
${AGENCY_BRAND.phone}

— Example signature. Edit this for your voice. —`;

const SIGNATURE_ES = `Javier
${AGENCY_BRAND.name}
${AGENCY_BRAND.phone}

— Firma de ejemplo. Edítala con tu voz. —`;

export async function seedAutomationsHub() {
  await db
    .insert(emailSignatures)
    .values({
      id: EMAIL_SIGNATURE_ID,
      tenantId: TENANT_ID,
      name: "Agency default",
      bodyEn: SIGNATURE_EN,
      bodyEs: SIGNATURE_ES,
      isDefault: true,
      isExampleCopy: true,
      approvalStatus: "live",
    })
    .onConflictDoNothing({ target: emailSignatures.id });

  await db
    .insert(emailSignatures)
    .values({
      id: MAYA_SIGNATURE_DRAFT_ID,
      tenantId: TENANT_ID,
      name: "Maya Chen — producer",
      bodyEn: `Maya Chen
Licensed agent · ${AGENCY_BRAND.name}
maya@fitfirst.local

— Waiting on Admin before this close goes live. —`,
      bodyEs: `Maya Chen
Agente licenciada · ${AGENCY_BRAND.name}
maya@fitfirst.local

— Esperando aprobación de Admin. —`,
      isDefault: false,
      isExampleCopy: true,
      ownerUserId: AGENT_USER_ID,
      approvalStatus: "pending",
      submittedAt: new Date("2026-09-03T15:00:00.000Z"),
    })
    .onConflictDoNothing({ target: emailSignatures.id });

  await db
    .insert(guidedAutomations)
    .values([
      {
        id: GUIDED_AUTOMATION_IDS.closedWonNotify,
        tenantId: TENANT_ID,
        name: "Closed Won — ping producer",
        triggerKind: "closed_won",
        triggerValue: "",
        conditionKind: "always",
        conditionValue: "",
        actionKind: "in_app_notify",
        actionValue: "Closed Won just landed. Confirm the bind packet and the new Policy.",
        visibility: "both",
        enabled: true,
        isExample: true,
      },
      {
        id: GUIDED_AUTOMATION_IDS.renewalTask,
        tenantId: TENANT_ID,
        name: "Renewal 60 — shop task + alert",
        triggerKind: "policy_renewal_window",
        triggerValue: "60",
        conditionKind: "days_before",
        conditionValue: "60",
        actionKind: "task_and_alert",
        actionValue: "Shop this renewal 60 days out",
        visibility: "agent",
        enabled: true,
        isExample: true,
      },
      {
        id: GUIDED_AUTOMATION_IDS.quoteSentNotify,
        tenantId: TENANT_ID,
        name: "Quote Sent — Ana shop nudge",
        triggerKind: "deal_stage_change",
        triggerValue: "quote_sent",
        conditionKind: "stage_is",
        conditionValue: "quote_sent",
        actionKind: "in_app_notify",
        actionValue:
          "Ana Dib HO3 is still Quote Sent. Coverage A $321,000. Follow in Alerts — do not bind.",
        visibility: "agent",
        enabled: true,
        isExample: true,
      },
      {
        id: GUIDED_AUTOMATION_IDS.renewal30Nudge,
        tenantId: TENANT_ID,
        name: "Renewal 30 — Hale shop nudge",
        triggerKind: "policy_renewal_window",
        triggerValue: "30",
        conditionKind: "days_before",
        conditionValue: "30",
        actionKind: "task_and_alert",
        actionValue: "Shop Hale HO 30 days out — Heritage compare is up",
        visibility: "admin",
        enabled: true,
        isExample: true,
      },
      {
        id: GUIDED_AUTOMATION_IDS.birthdayPing,
        tenantId: TENANT_ID,
        name: "Birthday — in-app ping",
        triggerKind: "birthday",
        triggerValue: "",
        conditionKind: "always",
        conditionValue: "",
        actionKind: "in_app_notify",
        actionValue: "Birthday window. Wish them in-desk — no card blast.",
        visibility: "both",
        enabled: true,
        isExample: true,
      },
    ])
    .onConflictDoNothing({ target: guidedAutomations.id });

  for (const row of [
    {
      id: GUIDED_AUTOMATION_IDS.closedWonNotify,
      name: "Closed Won — ping producer",
      actionKind: "in_app_notify",
      actionValue: "Closed Won just landed. Confirm the bind packet and the new Policy.",
      visibility: "both",
    },
    {
      id: GUIDED_AUTOMATION_IDS.renewalTask,
      name: "Renewal 60 — shop task + alert",
      actionKind: "task_and_alert",
      actionValue: "Shop this renewal 60 days out",
      visibility: "agent",
    },
    {
      id: GUIDED_AUTOMATION_IDS.quoteSentNotify,
      name: "Quote Sent — Ana shop nudge",
      actionKind: "in_app_notify",
      actionValue:
        "Ana Dib HO3 is still Quote Sent. Coverage A $321,000. Follow in Alerts — do not bind.",
      visibility: "agent",
    },
  ] as const) {
    await db
      .update(guidedAutomations)
      .set({
        name: row.name,
        actionKind: row.actionKind,
        actionValue: row.actionValue,
        visibility: row.visibility,
        updatedAt: new Date(),
      })
      .where(eq(guidedAutomations.id, row.id));
  }

  await deleteSeededPlaybookFires({
    runIds: Object.values(AUTOMATION_RUN_IDS),
    activityIds: Object.values(AUTOMATION_TASK_IDS),
    alertIds: Object.values(AUTOMATION_ALERT_IDS),
  });

  await firePlaybook({
    playbookId: GUIDED_AUTOMATION_IDS.closedWonNotify,
    related: {
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
    },
    assigneeName: AGENT_NAME,
    alertUserId: AGENT_USER_ID,
    audience: "both",
    summary: "Closed Won · Elena Ruiz HO3-ELENA-2026. Confirm the bind packet in-desk.",
    firedAt: DESK_AS_OF,
    ids: {
      alertId: AUTOMATION_ALERT_IDS.elenaClosedWon,
      runId: AUTOMATION_RUN_IDS.elenaClosedWon,
    },
  });

  await firePlaybook({
    playbookId: GUIDED_AUTOMATION_IDS.renewalTask,
    related: {
      contactId: ELENA_CONTACT_ID,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
    },
    assigneeName: AGENT_NAME,
    alertUserId: AGENT_USER_ID,
    audience: "agent",
    summary: "Renewal 60 · Elena Ruiz HO3-ELENA-2026. Task + Alert for Maya.",
    firedAt: DESK_AS_OF,
    ids: {
      activityId: AUTOMATION_TASK_IDS.elenaRenewal60,
      alertId: AUTOMATION_ALERT_IDS.elenaRenewal60,
      runId: AUTOMATION_RUN_IDS.elenaRenewal60,
    },
  });

  await firePlaybook({
    playbookId: GUIDED_AUTOMATION_IDS.quoteSentNotify,
    related: { contactId: CONTACT_ID, dealId: DEAL_ID },
    assigneeName: AGENT_NAME,
    alertUserId: AGENT_USER_ID,
    audience: "agent",
    summary: demoTargetForPlaybook({
      triggerKind: "deal_stage_change",
      visibility: "agent",
    }).summary,
    firedAt: DESK_AS_OF,
    ids: {
      alertId: AUTOMATION_ALERT_IDS.anaQuoteSent,
      runId: AUTOMATION_RUN_IDS.anaQuoteSent,
    },
  });

  await firePlaybook({
    playbookId: GUIDED_AUTOMATION_IDS.renewal30Nudge,
    related: { contactId: HALE_CONTACT_ID, policyId: HALE_POLICY_ID },
    assigneeName: ADMIN_NAME,
    alertUserId: ADMIN_USER_ID,
    audience: "admin",
    summary: "Renewal 30 · Marcus Hale HP-FL-88421. Admin shop nudge.",
    firedAt: DESK_AS_OF,
    ids: {
      activityId: AUTOMATION_TASK_IDS.haleRenewal30,
      alertId: AUTOMATION_ALERT_IDS.haleRenewal30,
      runId: AUTOMATION_RUN_IDS.haleRenewal30,
    },
  });

  await firePlaybook({
    playbookId: GUIDED_AUTOMATION_IDS.birthdayPing,
    related: { contactId: DEMO_CONTACT_HALE },
    assigneeName: ADMIN_NAME,
    alertUserId: null,
    audience: "both",
    summary: "Birthday · Robert Hale (desk as-of). In-app only.",
    firedAt: DESK_AS_OF,
    ids: {
      alertId: AUTOMATION_ALERT_IDS.haleBirthday,
      runId: AUTOMATION_RUN_IDS.haleBirthday,
    },
  });
}
