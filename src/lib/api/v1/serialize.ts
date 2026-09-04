function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function serializeContact(row: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mailingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  dateOfBirth?: string | null;
  language?: string | null;
  maritalStatus?: string | null;
  notes?: string | null;
  status?: string | null;
  clientStatus?: string | null;
  lifetimePolicyCount?: number | null;
  activePolicyCount?: number | null;
  policyCount?: number | null;
  ownerId?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}) {
  const lifetime = row.lifetimePolicyCount ?? row.policyCount ?? 0;
  const inForce = row.activePolicyCount ?? 0;
  return {
    id: row.id,
    first_name: row.firstName,
    last_name: row.lastName,
    email: row.email,
    phone: row.phone,
    mailing_address: row.mailingAddress,
    city: row.city,
    state: row.state,
    zip: row.zip,
    date_of_birth: row.dateOfBirth ?? null,
    language: row.language ?? null,
    marital_status: row.maritalStatus ?? null,
    notes: row.notes ?? null,
    status: row.status ?? "active",
    client_status: row.clientStatus ?? null,
    lifetime_policy_count: lifetime,
    active_policy_count: inForce,
    owner_id: row.ownerId ?? null,
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
  };
}

export function serializePolicy(row: {
  policy: {
    id: string;
    policyNumber: string;
    lineOfBusiness: string;
    status: string;
    premium: string | null;
    effectiveDate: Date;
    expirationDate: Date;
    contactId: string | null;
    accountId: string | null;
    dealId: string | null;
    carrierId: string | null;
    producer: string | null;
    policyType: string | null;
    policySubType: string | null;
    ownerId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  contact?: { firstName: string; lastName: string } | null;
  account?: { name: string } | null;
  carrier?: { name: string } | null;
}) {
  const { policy } = row;
  const contactName = row.contact
    ? `${row.contact.lastName}, ${row.contact.firstName}`
    : null;
  return {
    id: policy.id,
    policy_number: policy.policyNumber,
    line_of_business: policy.lineOfBusiness,
    policy_type: policy.policyType,
    policy_sub_type: policy.policySubType,
    status: policy.status,
    premium: policy.premium,
    effective_date: iso(policy.effectiveDate),
    expiration_date: iso(policy.expirationDate),
    contact_id: policy.contactId,
    contact_name: contactName,
    account_id: policy.accountId,
    account_name: row.account?.name ?? null,
    deal_id: policy.dealId,
    carrier_id: policy.carrierId,
    carrier_name: row.carrier?.name ?? null,
    producer: policy.producer,
    owner_id: policy.ownerId,
    created_at: iso(policy.createdAt),
    updated_at: iso(policy.updatedAt),
  };
}

export function serializeDeal(row: {
  deal: {
    id: string;
    title: string;
    pipelineStage: string;
    lineOfBusiness: string;
    state: string;
    notes: string | null;
    contactId: string | null;
    accountId: string | null;
    leadId: string | null;
    boundAt: Date | null;
    ownerId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  contact?: { firstName: string; lastName: string } | null;
  account?: { name: string } | null;
  lead?: { firstName: string; lastName: string } | null;
}) {
  const { deal } = row;
  return {
    id: deal.id,
    title: deal.title,
    pipeline_stage: deal.pipelineStage,
    line_of_business: deal.lineOfBusiness,
    state: deal.state,
    notes: deal.notes,
    contact_id: deal.contactId,
    contact_name: row.contact ? `${row.contact.lastName}, ${row.contact.firstName}` : null,
    account_id: deal.accountId,
    account_name: row.account?.name ?? null,
    lead_id: deal.leadId,
    lead_name: row.lead ? `${row.lead.lastName}, ${row.lead.firstName}` : null,
    bound_at: iso(deal.boundAt),
    owner_id: deal.ownerId,
    created_at: iso(deal.createdAt),
    updated_at: iso(deal.updatedAt),
  };
}

export function serializeActivity(row: {
  activity: {
    id: string;
    kind: string;
    title: string;
    notes: string | null;
    status: string;
    dueAt: Date | null;
    startAt: Date | null;
    endAt: Date | null;
    outcome: string | null;
    assignee: string | null;
    contactId: string | null;
    accountId: string | null;
    dealId: string | null;
    policyId: string | null;
    leadId: string | null;
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  contact?: { firstName: string; lastName: string } | null;
  policy?: { policyNumber: string } | null;
  business?: { name: string } | null;
}) {
  const { activity } = row;
  return {
    id: activity.id,
    kind: activity.kind,
    title: activity.title,
    notes: activity.notes,
    status: activity.status,
    due_at: iso(activity.dueAt),
    start_at: iso(activity.startAt),
    end_at: iso(activity.endAt),
    outcome: activity.outcome,
    assignee: activity.assignee,
    contact_id: activity.contactId,
    contact_name: row.contact ? `${row.contact.lastName}, ${row.contact.firstName}` : null,
    account_id: activity.accountId,
    account_name: row.business?.name ?? null,
    deal_id: activity.dealId,
    policy_id: activity.policyId,
    policy_number: row.policy?.policyNumber ?? null,
    lead_id: activity.leadId,
    created_by_user_id: activity.createdByUserId,
    created_at: iso(activity.createdAt),
    updated_at: iso(activity.updatedAt),
  };
}

export function serializeCommission(row: {
  commission: {
    id: string;
    agentId: string | null;
    policyId: string | null;
    carrierId: string | null;
    lineOfBusiness: string | null;
    premium: string | null;
    ratePct: string | null;
    amount: string | null;
    status: string;
    dueDate: Date | null;
    paidDate: Date | null;
    period: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  policy?: { policyNumber: string; ownerId: string | null } | null;
}) {
  const { commission } = row;
  return {
    id: commission.id,
    agent_id: commission.agentId,
    policy_id: commission.policyId,
    policy_number: row.policy?.policyNumber ?? null,
    carrier_id: commission.carrierId,
    line_of_business: commission.lineOfBusiness,
    premium: commission.premium,
    rate_pct: commission.ratePct,
    amount: commission.amount,
    status: commission.status,
    due_date: iso(commission.dueDate),
    paid_date: iso(commission.paidDate),
    period: commission.period,
    owner_id: row.policy?.ownerId ?? null,
    created_at: iso(commission.createdAt),
    updated_at: iso(commission.updatedAt),
  };
}

export const CONTACT_CSV_HEADERS = [
  "id",
  "first_name",
  "last_name",
  "email",
  "phone",
  "mailing_address",
  "city",
  "state",
  "zip",
  "date_of_birth",
  "language",
  "status",
  "client_status",
  "lifetime_policy_count",
  "active_policy_count",
  "owner_id",
  "created_at",
  "updated_at",
] as const;

export const POLICY_CSV_HEADERS = [
  "id",
  "policy_number",
  "line_of_business",
  "status",
  "premium",
  "effective_date",
  "expiration_date",
  "contact_id",
  "contact_name",
  "account_id",
  "account_name",
  "deal_id",
  "carrier_id",
  "carrier_name",
  "producer",
  "owner_id",
  "created_at",
] as const;

export const COMMISSION_CSV_HEADERS = [
  "id",
  "policy_id",
  "policy_number",
  "carrier_id",
  "line_of_business",
  "premium",
  "rate_pct",
  "amount",
  "status",
  "due_date",
  "paid_date",
  "period",
  "agent_id",
  "created_at",
] as const;
