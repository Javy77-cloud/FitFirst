import { AGENCY_BRAND } from "@/lib/domain";
import { db } from "./index";
import { emailSignatures, guidedAutomations } from "./schema";
import {
  AGENT_USER_ID,
  EMAIL_SIGNATURE_ID,
  GUIDED_AUTOMATION_IDS,
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
        enabled: true,
        isExample: true,
      },
      {
        id: GUIDED_AUTOMATION_IDS.renewalTask,
        tenantId: TENANT_ID,
        name: "Renewal window — shop task",
        triggerKind: "policy_renewal_window",
        triggerValue: "60",
        conditionKind: "days_before",
        conditionValue: "60",
        actionKind: "create_task",
        actionValue: "Shop this renewal 60 days out",
        enabled: true,
        isExample: true,
      },
      {
        id: GUIDED_AUTOMATION_IDS.quoteSentNotify,
        tenantId: TENANT_ID,
        name: "Quote Sent — in-app nudge",
        triggerKind: "deal_stage_change",
        triggerValue: "quote_sent",
        conditionKind: "stage_is",
        conditionValue: "quote_sent",
        actionKind: "in_app_notify",
        actionValue: "Quote Sent — follow the client. Stay in Alerts, not a blast email.",
        enabled: true,
        isExample: true,
      },
    ])
    .onConflictDoNothing({ target: guidedAutomations.id });
}
