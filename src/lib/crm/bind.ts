import type { DealStage, LineOfBusiness } from "@/lib/domain";

export const QUOTE_CREATES_POLICY = false;

export const CRM_ONLY_LINES = ["LIFE", "HEALTH"] as const;
export type CrmOnlyLine = (typeof CRM_ONLY_LINES)[number];

export const REVIEW_OFFSETS = [
  { kind: "30_day", days: 30, label: "30-day" },
  { kind: "60_day", days: 60, label: "60-day" },
  { kind: "90_day", days: 90, label: "90-day" },
  { kind: "expiration", days: 350, label: "Expiration" },
] as const;

export type ReviewOffsetKind = (typeof REVIEW_OFFSETS)[number]["kind"];

export const LINE_LABELS: Record<LineOfBusiness, string> = {
  HO: "Homeowners",
  AUTO: "Auto",
  FLOOD: "Flood",
  UMBRELLA: "Umbrella",
  GL: "General liability",
  BOP: "BOP",
  LIFE: "Life (CRM only)",
  HEALTH: "Health (CRM only)",
  RV: "Rec / RV",
  WC: "Workers Comp",
};

export function isCrmOnlyLine(line: string): line is CrmOnlyLine {
  return line === "LIFE" || line === "HEALTH";
}

export const ACCOUNT_KINDS = ["personal", "commercial"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const COMMERCIAL_LINES = ["GL", "WC", "BOP", "CA"] as const;

export function isCommercialLine(line: string): boolean {
  const u = (line ?? "").trim().toUpperCase();
  return (
    (COMMERCIAL_LINES as readonly string[]).includes(u as (typeof COMMERCIAL_LINES)[number]) ||
    u === "COMMERCIAL_AUTO" ||
    u === "WORKERS_COMP"
  );
}

export function defaultAccountKind(line: string): AccountKind {
  return isCommercialLine(line) ? "commercial" : "personal";
}

export function parseAccountKind(value: string | null | undefined): AccountKind {
  return value === "commercial" ? "commercial" : "personal";
}

export function accountDisplayName(account: {
  accountKind?: string | null;
  legalName?: string | null;
  firstName: string;
  lastName: string;
}): string {
  if (account.accountKind === "commercial" && account.legalName?.trim()) {
    return account.legalName.trim();
  }
  return `${account.lastName}, ${account.firstName}`;
}

export function nextActivePolicyCount(input: {
  currentActive: number;
  replacingSameLine: boolean;
}): number {
  if (input.replacingSameLine) return Math.max(input.currentActive, 1);
  return input.currentActive + 1;
}

export function addUtcDays(from: Date, days: number): Date {
  const next = new Date(from.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addUtcYears(from: Date, years: number): Date {
  const next = new Date(from.getTime());
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

export class BindBlockedError extends Error {
  constructor(message = "Deal is already bound") {
    super(message);
    this.name = "BindBlockedError";
  }
}

export function assertCanBind(pipelineStage: string): asserts pipelineStage is Exclude<
  DealStage,
  "bound"
> {
  if (pipelineStage === "bound") {
    throw new BindBlockedError(
      "This deal is already bound. Bind is the only path that creates a policy, and it runs once.",
    );
  }
}

export type BindLeadInput = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

export type BindContactInput = {
  id: string;
  policyCount: number;
  activePolicyCount?: number;
  accountKind?: string | null;
  legalName?: string | null;
  tenureStart: Date | null;
  lifeNotes: string | null;
  healthNotes: string | null;
};

export type BindRiskInput = {
  id: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  address1: string | null;
  coverageA: number | null;
};

export type BindDealInput = {
  id: string;
  pipelineStage: string;
  lineOfBusiness: string;
  contactId: string | null;
  notes: string | null;
};

export type BindPlanInput = {
  deal: BindDealInput;
  lead: BindLeadInput | null;
  contact: BindContactInput | null;
  risk: BindRiskInput | null;
  policyNumber: string;
  premium: string | null;
  carrierId: string | null;
  accountKind?: AccountKind;
  legalName?: string | null;
  replacingSameLine?: boolean;
  now: Date;
};

export type BindAlertPlan = {
  kind: string;
  title: string;
  body: string;
  severity: "info" | "warning";
  entityType: "policy" | "contact";
};

export type BindTaskPlan = {
  kind: ReviewOffsetKind;
  title: string;
  dueDate: Date;
};

export type BindPlan = {
  createContact: boolean;
  nextPolicyCount: number;
  nextActivePolicyCount: number;
  replacingSameLine: boolean;
  accountKind: AccountKind;
  tenureStart: Date;
  contactDraft: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    mailingAddress: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    tenureStart: Date;
    policyCount: number;
    activePolicyCount: number;
    accountKind: AccountKind;
    legalName: string | null;
    lifeNotes: string | null;
    healthNotes: string | null;
  };
  policy: {
    policyNumber: string;
    lineOfBusiness: string;
    status: "active";
    effectiveDate: Date;
    expirationDate: Date;
    premium: string | null;
    coverageA: number | null;
    carrierId: string | null;
    riskId: string | null;
  };
  history: {
    eventType: "bind";
    body: string;
  };
  tasks: BindTaskPlan[];
  alerts: BindAlertPlan[];
};

function crmNotesForLine(line: string, dealNotes: string | null) {
  const notes = dealNotes?.trim() || null;
  return {
    lifeNotes: line === "LIFE" ? notes : null,
    healthNotes: line === "HEALTH" ? notes : null,
  };
}

export function planBind(input: BindPlanInput): BindPlan {
  assertCanBind(input.deal.pipelineStage);

  const createContact = !input.deal.contactId;
  const tenureStart = input.contact?.tenureStart ?? input.now;
  const nextPolicyCount = (input.contact?.policyCount ?? 0) + 1;
  const replacingSameLine = Boolean(input.replacingSameLine);
  const accountKind =
    input.accountKind ??
    (input.contact?.accountKind
      ? parseAccountKind(input.contact.accountKind)
      : defaultAccountKind(input.deal.lineOfBusiness));
  const nextActive = nextActivePolicyCount({
    currentActive: input.contact?.activePolicyCount ?? 0,
    replacingSameLine,
  });
  const names = input.lead ?? {
    firstName: "Bound",
    lastName: "Client",
    email: null,
    phone: null,
  };
  const legalName =
    accountKind === "commercial"
      ? (input.legalName?.trim() ||
          input.contact?.legalName?.trim() ||
          `${names.firstName} ${names.lastName}`.trim() ||
          names.lastName)
      : (input.contact?.legalName ?? null);
  const lineNotes = crmNotesForLine(input.deal.lineOfBusiness, input.deal.notes);
  const expirationDate = addUtcYears(input.now, 1);
  const premium = input.premium && input.premium.trim() !== "" ? input.premium.trim() : null;

  const tasks: BindTaskPlan[] = REVIEW_OFFSETS.map((offset) => ({
    kind: offset.kind,
    title: `${offset.label} review · ${input.policyNumber}`,
    dueDate: addUtcDays(input.now, offset.days),
  }));

  const insured = accountDisplayName({
    accountKind,
    legalName,
    firstName: names.firstName,
    lastName: names.lastName,
  });
  const accountLabel = accountKind === "commercial" ? "business" : "contact";
  const alerts: BindAlertPlan[] = [
    {
      kind: "bind",
      title: `Bound ${input.deal.lineOfBusiness} ${input.policyNumber}`,
      body: `${insured}: ${accountLabel} and one ${input.deal.lineOfBusiness} policy created from bind. Quotes did not create this policy. Alerts stay in the desk — nothing emails the agent.`,
      severity: "info",
      entityType: "policy",
    },
    {
      kind: "review",
      title: `30/60/90 reviews scheduled · ${input.policyNumber}`,
      body: `Open ${insured} for tenure, lifetime and active policy counts, and the 30/60/90 plus expiration tasks.`,
      severity: "info",
      entityType: "contact",
    },
  ];

  return {
    createContact,
    nextPolicyCount,
    nextActivePolicyCount: nextActive,
    replacingSameLine,
    accountKind,
    tenureStart,
    contactDraft: {
      firstName: names.firstName,
      lastName: names.lastName,
      email: names.email,
      phone: names.phone,
      mailingAddress: input.risk?.address1 ?? null,
      city: input.risk?.city ?? null,
      state: input.risk?.state ?? "FL",
      zip: input.risk?.zip ?? null,
      tenureStart,
      policyCount: createContact ? 1 : nextPolicyCount,
      activePolicyCount: nextActive,
      accountKind,
      legalName,
      lifeNotes: input.contact?.lifeNotes ?? lineNotes.lifeNotes,
      healthNotes: input.contact?.healthNotes ?? lineNotes.healthNotes,
    },
    policy: {
      policyNumber: input.policyNumber,
      lineOfBusiness: input.deal.lineOfBusiness,
      status: "active",
      effectiveDate: input.now,
      expirationDate,
      premium,
      coverageA: input.risk?.coverageA ?? null,
      carrierId: input.carrierId,
      riskId: input.risk?.id ?? null,
    },
    history: {
      eventType: "bind",
      body: `Bound ${input.deal.lineOfBusiness} ${input.policyNumber} on ${accountLabel} ${insured}. One policy per line; quotes did not create this policy.`,
    },
    tasks,
    alerts,
  };
}

export function stubPolicyNumber(now = new Date()): string {
  return `FF-${now.getTime().toString().slice(-8)}`;
}
