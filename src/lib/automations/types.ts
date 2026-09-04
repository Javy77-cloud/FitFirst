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
  "send_template_email",
] as const;
export type AutomationAction = (typeof AUTOMATION_ACTIONS)[number];

export const AUTOMATION_ACTION_LABEL: Record<AutomationAction, string> = {
  in_app_notify: "In-app notify",
  create_task: "Create task",
  send_template_email: "Send template email",
};

export const AUTOMATION_ACTION_HINT: Record<AutomationAction, string> = {
  in_app_notify: "Javy preference — ping the agent in Alerts. Nothing emails the broker.",
  create_task: "Adds an open desk task. No client mail.",
  send_template_email: "Queues a work-email template. Still a stub send.",
};

export const SIGNATURE_APPROVAL_STATUSES = ["draft", "pending", "live", "rejected"] as const;
export type SignatureApprovalStatus = (typeof SIGNATURE_APPROVAL_STATUSES)[number];

export const SIGNATURE_STATUS_LABEL: Record<SignatureApprovalStatus, string> = {
  draft: "Draft",
  pending: "Waiting on Admin",
  live: "Live",
  rejected: "Rejected",
};

export const AUTOMATION_HUB_SECTIONS = [
  {
    id: "sequences",
    href: "/automations/sequences",
    label: "Campaign sequences",
    summary: "Lead nurture, quote follow-up, 60/30 renewal, cross-sell, review ask — Task + email stubs.",
  },
  {
    id: "campaigns",
    href: "/automations/campaigns",
    label: "Email campaigns",
    summary: "Mailchimp, Constant Contact, or SendGrid — only if the agency connected one.",
  },
  {
    id: "sms",
    href: "/automations/sms",
    label: "Bulk SMS",
    summary: "Needs a Twilio / RingCentral / Lightspeed stub. Guided empty state until then.",
  },
  {
    id: "templates",
    href: "/automations/templates",
    label: "Work email templates",
    summary: "Same library as Settings. Agents read; Admin edits.",
  },
  {
    id: "builder",
    href: "/automations/builder",
    label: "Guided builder",
    summary: "Trigger → Condition → Action. Save a named rule. Prefer in-app notify.",
  },
  {
    id: "signatures",
    href: "/automations/signatures",
    label: "Email signatures",
    summary: "Agents draft. Admin approves before a signature goes live.",
  },
] as const;

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
    if (input.actionKind === "create_task") {
      return { ok: false, error: "Name the task this rule should create." };
    }
    return { ok: false, error: "Pick the work-email template to send." };
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
      enabled: true,
    },
  };
}

export function preferredActionFor(trigger: AutomationTrigger): AutomationAction {
  if (trigger === "closed_won" || trigger === "birthday" || trigger === "deal_stage_change") {
    return "in_app_notify";
  }
  return "create_task";
}
