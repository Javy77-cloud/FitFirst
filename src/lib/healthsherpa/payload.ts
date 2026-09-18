import { healthSherpaProductForPlan } from "./sheet";

export type HealthSherpaProduct = "medicare" | "marketplace";
export type HealthSherpaEvent = "enrollment_submitted" | "policy_status";

export type HealthSherpaContactFields = {
  hsContactId: string | null;
  externalId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  sex: string | null;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  mailingStreet: string | null;
  mailingCity: string | null;
  mailingState: string | null;
  mailingZip: string | null;
  medicareNumber: string | null;
  partAStart: string | null;
  partBStart: string | null;
  medicaidEligible: boolean | null;
  extraHelp: boolean | null;
};

export type HealthSherpaParsedPayload = {
  product: HealthSherpaProduct;
  event: HealthSherpaEvent;
  applicationId: string | null;
  confirmationNumber: string | null;
  carrierName: string | null;
  planName: string | null;
  planType: string | null;
  policySubType: string | null;
  effectiveDate: string | null;
  premiumCents: number | null;
  state: string | null;
  zip: string | null;
  contact: HealthSherpaContactFields;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  if (value == null) return null;
  const out = String(value).trim();
  return out || null;
}

function boolish(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value == null) return null;
  const lower = String(value).trim().toLowerCase();
  if (lower === "true" || lower === "yes" || lower === "1") return true;
  if (lower === "false" || lower === "no" || lower === "0") return false;
  return null;
}

function cents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}

function dollarsToCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  }
  return null;
}

function medicarePlanLabel(planType: string | null): string {
  const key = (planType ?? "").toLowerCase();
  if (key === "mapd" || key === "ma") return "Medicare Advantage";
  if (key === "med_supp" || key === "medigap") return "Medicare Supplement";
  if (key === "pdp") return "Medicare";
  return "Medicare";
}

function readContact(raw: Record<string, unknown> | null): HealthSherpaContactFields {
  const row = raw ?? {};
  const first =
    text(row.first_name) ??
    text(row.firstName) ??
    text(row.given_name) ??
    "";
  const last =
    text(row.last_name) ??
    text(row.lastName) ??
    text(row.family_name) ??
    "";
  return {
    hsContactId: text(row.id) ?? text(row.contact_id),
    externalId: text(row.external_id) ?? text(row.externalId),
    firstName: first,
    lastName: last,
    email: text(row.email),
    phone:
      text(row.phone_number) ??
      text(row.phone) ??
      text(row.primary_phone),
    dateOfBirth: text(row.birth_date) ?? text(row.date_of_birth) ?? text(row.dob),
    sex: text(row.sex),
    street:
      text(row.primary_address_street) ??
      text(row.address_1) ??
      text(row.street),
    unit: text(row.primary_address_unit_number) ?? text(row.address_2),
    city: text(row.primary_address_city) ?? text(row.city),
    state: text(row.primary_address_state) ?? text(row.state),
    zip:
      text(row.primary_address_zip_code) ??
      text(row.zip) ??
      text(row.zip_code),
    mailingStreet: text(row.mailing_address_street),
    mailingCity: text(row.mailing_address_city),
    mailingState: text(row.mailing_address_state),
    mailingZip: text(row.mailing_address_zip_code),
    medicareNumber: text(row.medicare_number),
    partAStart: text(row.part_a_effective_date) ?? text(row.medicare_part_a_effective_date),
    partBStart: text(row.part_b_effective_date) ?? text(row.medicare_part_b_effective_date),
    medicaidEligible: boolish(row.medicaid_eligible),
    extraHelp: boolish(row.needs_extra_help) ?? boolish(row.extra_help),
  };
}

function firstMember(root: Record<string, unknown>): Record<string, unknown> | null {
  const members = root.members;
  if (Array.isArray(members) && members.length) {
    return asRecord(members[0]);
  }
  const policies = root.policies;
  if (Array.isArray(policies) && policies.length) {
    const policy = asRecord(policies[0]);
    const nested = policy && Array.isArray(policy.members) ? asRecord(policy.members[0]) : null;
    if (nested) return nested;
  }
  return null;
}

function firstPolicy(root: Record<string, unknown>): Record<string, unknown> | null {
  if (Array.isArray(root.policies) && root.policies.length) {
    return asRecord(root.policies[0]);
  }
  return asRecord(root.policy);
}

function parseOfficialAcaPayload(root: Record<string, unknown>): HealthSherpaParsedPayload | null {
  const eventType = text(root.event_type) ?? text(root.event) ?? text(root.policy_status);
  const applicationId = text(root.application_id) ?? text(root.applicationId);
  const member = firstMember(root);
  const policy = firstPolicy(root);
  const looksAca = Boolean(
    text(root.event_type) ||
      text(root.policy_status) ||
      applicationId ||
      member ||
      (Array.isArray(root.policies) && root.policies.length) ||
      root.transaction_id != null,
  );
  if (!looksAca) return null;

  const contactRaw =
    member ??
    asRecord(root.contact) ??
    asRecord(root.applicant) ??
    asRecord(asRecord(root.household)?.primary);
  const first = text(contactRaw?.first_name) ?? text(contactRaw?.firstName);
  const last = text(contactRaw?.last_name) ?? text(contactRaw?.lastName);
  if (!first || !last) return null;

  const event: HealthSherpaEvent =
    eventType && /policy|sync|effectuat|cancelled|terminated/i.test(eventType)
      ? "policy_status"
      : "enrollment_submitted";
  const agent = asRecord(policy?.agent_of_record);
  const premium =
    dollarsToCents(policy?.gross_premium) ??
    dollarsToCents(policy?.premium) ??
    dollarsToCents(root.gross_premium);

  return {
    product: "marketplace",
    event,
    applicationId,
    confirmationNumber:
      text(policy?.policy_id) ??
      text(root.transaction_id) ??
      text(policy?.confirmation_number),
    carrierName: text(policy?.issuer_name) ?? text(root.issuer_hios_id) ?? text(agent?.email),
    planName: text(policy?.plan_name) ?? text(policy?.plan_hios_id),
    planType: text(policy?.plan_type) ?? text(root.policy_status) ?? "Marketplace",
    policySubType: "Marketplace",
    effectiveDate: text(policy?.effective_date) ?? text(root.event_timestamp),
    premiumCents: premium,
    state: text(policy?.state) ?? text(contactRaw?.state),
    zip: text(policy?.zip) ?? text(contactRaw?.zip),
    contact: readContact({
      ...contactRaw,
      external_id: text(contactRaw?.external_id) ?? text(root.external_id),
      date_of_birth: text(contactRaw?.date_of_birth) ?? text(contactRaw?.birth_date),
    }),
  };
}

/**
 * Parse a HealthSherpa Medicare submission or a Marketplace / ACA webhook.
 * Returns null when the body is not an enrollment event (empty / ping / unknown).
 */
export function parseHealthSherpaPayload(input: unknown): HealthSherpaParsedPayload | null {
  const root = asRecord(input);
  if (!root) return null;

  const medicareApp = asRecord(root.medicare_application);
  if (medicareApp) {
    const contact = readContact(asRecord(root.contact));
    const planType = text(medicareApp.plan_type);
    return {
      product: "medicare",
      event: "enrollment_submitted",
      applicationId: text(medicareApp.id),
      confirmationNumber: text(medicareApp.confirmation_number),
      carrierName: text(medicareApp.carrier_name),
      planName: text(medicareApp.plan_name),
      planType,
      policySubType: medicarePlanLabel(planType),
      effectiveDate: text(medicareApp.effective_date),
      premiumCents: cents(medicareApp.total_premium_cents),
      state: text(medicareApp.state) ?? contact.state,
      zip: text(medicareApp.zip_code) ?? contact.zip,
      contact,
    };
  }

  const officialAca = parseOfficialAcaPayload(root);
  if (officialAca) return officialAca;

  const application =
    asRecord(root.application) ??
    asRecord(root.enrollment) ??
    asRecord(root.policy);
  const contactRaw =
    asRecord(root.contact) ??
    asRecord(root.applicant) ??
    asRecord(asRecord(root.household)?.primary) ??
    asRecord(application?.contact);
  if (!application && !contactRaw) return null;

  const first = text(contactRaw?.first_name) ?? text(contactRaw?.firstName);
  const last = text(contactRaw?.last_name) ?? text(contactRaw?.lastName);
  if (!first || !last) return null;

  const eventRaw = text(root.event) ?? text(root.type) ?? text(application?.status);
  const event: HealthSherpaEvent =
    eventRaw && /policy|effectuat|cancelled|terminated/i.test(eventRaw)
      ? "policy_status"
      : "enrollment_submitted";
  const planHint =
    text(application?.plan_type) ??
    text(application?.metal_level) ??
    text(root.market) ??
    "Marketplace";
  const product =
    healthSherpaProductForPlan(planHint) === "medicare" ? "medicare" : "marketplace";

  return {
    product,
    event,
    applicationId:
      text(application?.id) ??
      text(application?.application_id) ??
      text(root.application_id),
    confirmationNumber:
      text(application?.confirmation_number) ??
      text(application?.policy_number),
    carrierName: text(application?.carrier_name) ?? text(application?.carrier),
    planName: text(application?.plan_name) ?? text(application?.plan),
    planType: planHint,
    policySubType: product === "marketplace" ? "Marketplace" : medicarePlanLabel(planHint),
    effectiveDate: text(application?.effective_date) ?? text(application?.coverage_start),
    premiumCents:
      cents(application?.total_premium_cents) ??
      (application?.premium != null ? Math.round(Number(application.premium) * 100) : null),
    state: text(application?.state) ?? text(contactRaw?.state),
    zip: text(application?.zip) ?? text(contactRaw?.zip),
    contact: readContact(contactRaw),
  };
}

export function mailingLine(contact: HealthSherpaContactFields): string | null {
  const street = [contact.street, contact.unit].filter(Boolean).join(" ").trim();
  return street || null;
}
