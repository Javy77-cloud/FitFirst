/** Guided Automations pickers. Keep these out of domain.ts — no catalog dupes. */

export const AUTOMATION_TRIGGERS = [
  "deal_stage_change",
  "policy_renewal_window",
  "birthday",
  "closed_won",
] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  deal_stage_change: "Deal stage change",
  policy_renewal_window: "Policy renewal window",
  birthday: "Birthday",
  closed_won: "Closed Won",
};

export const AUTOMATION_TRIGGER_HINT: Record<AutomationTrigger, string> = {
  deal_stage_change: "Fires when a deal moves into a chosen pipeline stage.",
  policy_renewal_window: "Fires when a policy is inside the renewal shop window.",
  birthday: "Fires on the contact’s birthday. Prefer an in-app ping, not a blast.",
  closed_won: "Fires when a deal hits Closed Won. Bind still creates the policy.",
};

export const AUTOMATION_CONDITIONS = [
  "always",
  "line_of_business",
  "days_before",
  "stage_is",
] as const;
export type AutomationCondition = (typeof AUTOMATION_CONDITIONS)[number];

export const AUTOMATION_CONDITION_LABEL: Record<AutomationCondition, string> = {
  always: "Always",
  line_of_business: "Line of business",
  days_before: "Days before (renewal / birthday)",
  stage_is: "Stage is",
};

export const AUTOMATION_ACTIONS = [
  "in_app_notify",
  "create_task",
  "task_and_alert",
  "send_template_email",
] as const;
export type AutomationAction = (typeof AUTOMATION_ACTIONS)[number];

export const AUTOMATION_ACTION_LABEL: Record<AutomationAction, string> = {
  in_app_notify: "In-app alert",
  create_task: "Create task",
  task_and_alert: "Task + in-app alert",
  send_template_email: "Queue draft template (does not send)",
};

export const AUTOMATION_ACTION_HINT: Record<AutomationAction, string> = {
  in_app_notify: "Ping the desk in Alerts / pop-up. Nothing emails Javy or the client.",
  create_task: "Adds an open desk task on the related record. No client mail.",
  task_and_alert: "Creates a desk Task and an in-app Alert together. Preferred for renewals.",
  send_template_email: "Holds a work-email draft. FitFirst does not send client mail from playbooks.",
};

export const PLAYBOOK_VISIBILITIES = ["admin", "agent", "both"] as const;
export type PlaybookVisibility = (typeof PLAYBOOK_VISIBILITIES)[number];

export const PLAYBOOK_VISIBILITY_LABEL: Record<PlaybookVisibility, string> = {
  admin: "Admin only",
  agent: "Agent book",
  both: "Admin + agent",
};

export const PLAYBOOK_VISIBILITY_HINT: Record<PlaybookVisibility, string> = {
  admin: "Javy and other Admins see and run this playbook. Agents do not.",
  agent: "Producers see this playbook and the Tasks / Alerts it fires on their book.",
  both: "Everyone on the desk sees the playbook. Fired work still follows the assignee.",
};

export const SIGNATURE_APPROVAL_STATUSES = ["draft", "pending", "live", "rejected"] as const;
export type SignatureApprovalStatus = (typeof SIGNATURE_APPROVAL_STATUSES)[number];

export const SIGNATURE_STATUS_LABEL: Record<SignatureApprovalStatus, string> = {
  draft: "Draft",
  pending: "Waiting on Admin",
  live: "Live",
  rejected: "Rejected",
};

export const AUTOMATION_DESK_SECTIONS = [
  {
    id: "playbooks",
    href: "/automations/playbooks",
    label: "Playbooks",
    summary: "Named in-desk rules — the existing guided automations plus campaign sequences. Tasks and Alerts only.",
    group: "desk",
  },
  {
    id: "sequences",
    href: "/automations/sequences",
    label: "Campaign sequences",
    summary: "Lead nurture, quote follow-up, 60/30 renewal, cross-sell, review ask — Task stubs.",
    group: "desk",
  },
  {
    id: "templates",
    href: "/automations/templates",
    label: "Email templates",
    summary: "System + custom EN/ES work-email copy. Preview only — nothing sends from this desk.",
    group: "desk",
  },
  {
    id: "builder",
    href: "/automations/builder",
    label: "Guided builder",
    summary: "Admin writes Trigger → Condition → Action. Agents read the playbooks they can see.",
    group: "desk",
  },
  {
    id: "signatures",
    href: "/automations/signatures",
    label: "Email signatures",
    summary: "Agents draft. Admin approves before a signature goes live.",
    group: "desk",
  },
  {
    id: "campaigns",
    href: "/automations/campaigns",
    label: "Paid campaigns",
    summary: "Not offered. FitFirst does not buy Mailchimp, Constant Contact, or SendGrid.",
    group: "desk",
  },
  {
    id: "sms",
    href: "/automations/sms",
    label: "Bulk SMS vendors",
    summary: "Not offered. No Twilio. Use playbooks that create Tasks + Alerts.",
    group: "desk",
  },
] as const;

/** Same Developer Hub surfaces as Settings — cards + tabs on Automations. */
export const AUTOMATION_DEVELOPER_SECTIONS = [
  {
    id: "functions",
    href: "/automations/functions",
    label: "Functions",
    summary: "Custom functions. Run test + REST stub. Same rows as Settings → Developer Hub.",
  },
  {
    id: "macros",
    href: "/automations/macros",
    label: "Macros",
    summary: "Sibling-bot placeholder. Same stub as Settings → Developer Hub → Macros.",
  },
  {
    id: "webhooks",
    href: "/automations/webhooks",
    label: "Webhooks",
    summary: "Outbound desk events + inbound Signals. Local queue, localhost Send test.",
  },
  {
    id: "api-keys",
    href: "/automations/api-keys",
    label: "API Keys",
    summary: "Org keys for Function REST. Secret shown once. Same table as Settings.",
  },
  {
    id: "connections",
    href: "/automations/connections",
    label: "Connections",
    summary: "Named connectors. Authorize is an OAuth wall. No live Zoho writes.",
  },
] as const;

export const AUTOMATION_DEV_SECTIONS = [
  {
    id: "macros",
    href: "/automations/macros",
    label: "Macros",
    summary: "Manual run. At most one email stub, three field updates, and three tasks. Ana is skipped.",
    group: "developer",
  },
  {
    id: "functions",
    href: "/automations/functions",
    label: "Functions",
    summary: "Button / Automation / Schedule / Standalone. Persist the body. Test log. REST with an org API key.",
    group: "developer",
  },
  {
    id: "webhooks",
    href: "/automations/webhooks",
    label: "Webhooks",
    summary: "Outbound desk events + inbound Signals. Localhost POST or a stub attempt.",
    group: "developer",
  },
  {
    id: "api-keys",
    href: "/automations/api-keys",
    label: "API Keys",
    summary: "Org-level keys for Standalone function REST. Secret is hashed and shown once.",
    group: "developer",
  },
  {
    id: "buttons",
    href: "/automations/buttons",
    label: "Custom Buttons",
    summary: "List / detail / mass-action buttons that open a URL, run a function, or a widget stub.",
    group: "developer",
  },
  {
    id: "client-scripts",
    href: "/automations/client-scripts",
    label: "Client Scripts",
    summary: "onLoad / onChange bodies persist. Allowlisted getValue / setValue / showError — no eval.",
    group: "developer",
  },
  {
    id: "connections",
    href: "/automations/connections",
    label: "Connections",
    summary: "Named OAuth connectors. Client secrets encrypt at rest. Authorize stays a wall.",
    group: "developer",
  },
] as const;

export const AUTOMATION_HUB_SECTIONS = [...AUTOMATION_DESK_SECTIONS, ...AUTOMATION_DEV_SECTIONS] as const;

export function isAutomationTrigger(value: string): value is AutomationTrigger {
  return (AUTOMATION_TRIGGERS as readonly string[]).includes(value);
}

export function isAutomationCondition(value: string): value is AutomationCondition {
  return (AUTOMATION_CONDITIONS as readonly string[]).includes(value);
}

export function isAutomationAction(value: string): value is AutomationAction {
  return (AUTOMATION_ACTIONS as readonly string[]).includes(value);
}

export function isSignatureApprovalStatus(value: string): value is SignatureApprovalStatus {
  return (SIGNATURE_APPROVAL_STATUSES as readonly string[]).includes(value);
}

export type GuidedAutomationInput = {
  name: string;
  triggerKind: AutomationTrigger;
  triggerValue: string;
  conditionKind: AutomationCondition;
  conditionValue: string;
  actionKind: AutomationAction;
  actionValue: string;
  visibility: PlaybookVisibility;
  enabled: boolean;
};

export function validateGuidedAutomation(input: {
  name: string;
  triggerKind: string;
  triggerValue: string;
  conditionKind: string;
  conditionValue: string;
  actionKind: string;
  actionValue: string;
  visibility?: string;
}): { ok: true; value: GuidedAutomationInput } | { ok: false; error: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name the automation." };
  if (!isAutomationTrigger(input.triggerKind)) {
    return { ok: false, error: "Pick a trigger." };
  }
  if (!isAutomationCondition(input.conditionKind)) {
    return { ok: false, error: "Pick a condition." };
  }
  if (!isAutomationAction(input.actionKind)) {
    return { ok: false, error: "Pick an action." };
  }
  const actionValue = input.actionValue.trim();
  if (!actionValue) {
    if (input.actionKind === "in_app_notify") {
      return { ok: false, error: "Write the in-app alert the agent should see." };
    }
    if (input.actionKind === "create_task" || input.actionKind === "task_and_alert") {
      return { ok: false, error: "Name the task this rule should create." };
    }
    return { ok: false, error: "Name the draft template hold — nothing will send." };
  }
  if (input.conditionKind === "line_of_business" && !input.conditionValue.trim()) {
    return { ok: false, error: "Pick a line of business." };
  }
  if (input.conditionKind === "days_before" && !input.conditionValue.trim()) {
    return { ok: false, error: "Enter how many days before." };
  }
  if (input.conditionKind === "stage_is" && !input.conditionValue.trim()) {
    return { ok: false, error: "Pick the pipeline stage." };
  }
  const visibilityRaw = (input.visibility ?? "both").trim();
  const visibility: PlaybookVisibility = isPlaybookVisibility(visibilityRaw)
    ? visibilityRaw
    : "both";
  return {
    ok: true,
    value: {
      name,
      triggerKind: input.triggerKind,
      triggerValue: input.triggerValue.trim(),
      conditionKind: input.conditionKind,
      conditionValue: input.conditionValue.trim(),
      actionKind: input.actionKind,
      actionValue,
      visibility,
      enabled: true,
    },
  };
}

export function preferredActionFor(trigger: AutomationTrigger): AutomationAction {
  if (trigger === "policy_renewal_window") return "task_and_alert";
  if (trigger === "closed_won" || trigger === "birthday" || trigger === "deal_stage_change") {
    return "in_app_notify";
  }
  return "create_task";
}

export function isPlaybookVisibility(value: string): value is PlaybookVisibility {
  return (PLAYBOOK_VISIBILITIES as readonly string[]).includes(value);
}
