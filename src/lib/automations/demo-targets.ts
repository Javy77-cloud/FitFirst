import {
  ADMIN_NAME,
  ADMIN_USER_ID,
  AGENT_NAME,
  AGENT_USER_ID,
  CONTACT_ID,
  DEAL_ID,
  DEMO_CONTACT_HALE,
  ELENA_CONTACT_ID,
  ELENA_DEAL_ID,
  ELENA_POLICY_ID,
  HALE_CONTACT_ID,
  HALE_POLICY_ID,
} from "@/lib/fixtures/ids";
import { alertTargetUserId } from "./engine";
import type { PlaybookVisibility } from "./types";

export type DemoFireTarget = {
  related: {
    contactId?: string | null;
    policyId?: string | null;
    dealId?: string | null;
    accountId?: string | null;
    leadId?: string | null;
  };
  assigneeName: string;
  alertUserId: string | null;
  summary: string;
};

/** Stable demo records. Ana stays shopping / Cov A $321,000. */
export function demoTargetForPlaybook(input: {
  triggerKind: string;
  triggerValue?: string | null;
  visibility: PlaybookVisibility;
}): DemoFireTarget {
  const alertUserId = alertTargetUserId({
    visibility: input.visibility,
    adminUserId: ADMIN_USER_ID,
    agentUserId: AGENT_USER_ID,
  });
  const days = (input.triggerValue ?? "").trim();

  if (input.triggerKind === "closed_won") {
    return {
      related: {
        contactId: ELENA_CONTACT_ID,
        policyId: ELENA_POLICY_ID,
        dealId: ELENA_DEAL_ID,
      },
      assigneeName: AGENT_NAME,
      alertUserId: alertUserId ?? AGENT_USER_ID,
      summary: "Closed Won · Elena Ruiz HO3-ELENA-2026. Confirm the bind packet in-desk.",
    };
  }

  if (input.triggerKind === "policy_renewal_window" && days === "30") {
    return {
      related: { contactId: HALE_CONTACT_ID, policyId: HALE_POLICY_ID },
      assigneeName: ADMIN_NAME,
      alertUserId: alertUserId ?? ADMIN_USER_ID,
      summary: "Renewal 30 · Marcus Hale HP-FL-88421. Shop the Heritage compare — in-app only.",
    };
  }

  if (input.triggerKind === "policy_renewal_window") {
    return {
      related: {
        contactId: ELENA_CONTACT_ID,
        policyId: ELENA_POLICY_ID,
        dealId: ELENA_DEAL_ID,
      },
      assigneeName: AGENT_NAME,
      alertUserId: alertUserId ?? AGENT_USER_ID,
      summary: "Renewal 60 · Elena Ruiz HO3-ELENA-2026. Shop task + Alert — nothing emailed.",
    };
  }

  if (input.triggerKind === "deal_stage_change") {
    return {
      related: { contactId: CONTACT_ID, dealId: DEAL_ID },
      assigneeName: AGENT_NAME,
      alertUserId: alertUserId ?? AGENT_USER_ID,
      summary:
        "Quote Sent · Ana Dib HO3 still shopping. Coverage A $321,000. Follow in Alerts — do not bind.",
    };
  }

  return {
    related: { contactId: DEMO_CONTACT_HALE },
    assigneeName: ADMIN_NAME,
    alertUserId,
    summary: "Birthday window · Robert Hale. In-app ping only — no card in the mail.",
  };
}
