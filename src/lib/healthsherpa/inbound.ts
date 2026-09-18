import { and, eq, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  alerts,
  contacts,
  deals,
  healthsherpaEnrollments,
  policies,
} from "@/lib/db/schema";
import { findExistingContactMatch } from "@/lib/crm/existing-contact-match";
import { listDealLookup } from "@/lib/db/queries";
import { mailingLine, parseHealthSherpaPayload, type HealthSherpaParsedPayload } from "./payload";
import { fitFirstMatchId } from "./match-id";

export type HealthSherpaInboundResult = {
  accepted: boolean;
  reason: string;
  product?: HealthSherpaParsedPayload["product"];
  contactId?: string;
  dealId?: string | null;
  policyId?: string | null;
  enrollmentId?: string;
};

function addYear(date: Date): Date {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (us) {
    const parsed = new Date(Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2])));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function yesNo(value: boolean | null): string | null {
  if (value == null) return null;
  return value ? "yes" : "no";
}

function appendNote(existing: string | null | undefined, line: string): string {
  const current = (existing ?? "").trim();
  if (!current) return line;
  if (current.includes(line)) return current;
  return `${current}\n${line}`;
}

async function matchDeal(input: {
  contactId: string;
  externalId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
}): Promise<string | null> {
  const dealId = fitFirstMatchId(input.externalId);
  if (dealId) {
    const [bySource] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)))
      .limit(1);
    if (bySource) return bySource.id;
  }
  try {
    const rows = await listDealLookup();
    const linked = rows.filter((row) => row.contactId === input.contactId);
    const named = rows.filter((row) => {
      const party = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim().toLowerCase();
      const wanted = `${input.firstName} ${input.lastName}`.trim().toLowerCase();
      const emailOk = input.email && row.email && row.email.toLowerCase() === input.email.toLowerCase();
      return emailOk || (wanted.length > 1 && party === wanted);
    });
    const health = [...linked, ...named].filter((row) => String(row.lineOfBusiness).toUpperCase() === "HEALTH");
    const pool = health.length ? health : linked.length ? linked : named;
    const unique = [...new Map(pool.map((row) => [row.id, row])).values()];
    if (unique.length === 1) return unique[0]!.id;
  } catch {
    /* lookup optional */
  }
  return null;
}

async function upsertContact(parsed: HealthSherpaParsedPayload): Promise<string> {
  const incoming = parsed.contact;
  const [byHs] = incoming.hsContactId
    ? await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.tenantId, DEFAULT_TENANT_ID),
            eq(contacts.source, "healthsherpa"),
            eq(contacts.sourceId, incoming.hsContactId),
          ),
        )
        .limit(1)
    : [];
  const fitfirstId = fitFirstMatchId(incoming.externalId);
  const [byExternal] =
    !byHs && fitfirstId
      ? await db
          .select()
          .from(contacts)
          .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, fitfirstId)))
          .limit(1)
      : [];
  const rows = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(eq(contacts.tenantId, DEFAULT_TENANT_ID));
  const matched =
    byHs ??
    byExternal ??
    findExistingContactMatch(rows, {
      firstName: incoming.firstName,
      lastName: incoming.lastName,
      email: incoming.email,
      phone: incoming.phone,
    })?.contact;

  const patch = {
    firstName: incoming.firstName,
    lastName: incoming.lastName,
    email: incoming.email ?? undefined,
    phone: incoming.phone ?? undefined,
    dateOfBirth: incoming.dateOfBirth ?? undefined,
    mailingAddress: mailingLine(incoming) ?? incoming.mailingStreet ?? undefined,
    city: incoming.city ?? incoming.mailingCity ?? undefined,
    state: incoming.state ?? incoming.mailingState ?? undefined,
    zip: incoming.zip ?? incoming.mailingZip ?? undefined,
    source: "healthsherpa" as const,
    sourceId: incoming.hsContactId ?? incoming.externalId ?? undefined,
    updatedAt: new Date(),
  };

  if (matched) {
    const [full] = await db
      .select({ healthNotes: contacts.healthNotes })
      .from(contacts)
      .where(eq(contacts.id, matched.id))
      .limit(1);
    const note = `HealthSherpa ${parsed.event} ${parsed.confirmationNumber ?? parsed.applicationId ?? ""}`.trim();
    await db
      .update(contacts)
      .set({
        ...patch,
        healthNotes: appendNote(full?.healthNotes, note),
      })
      .where(eq(contacts.id, matched.id));
    return matched.id;
  }

  const [created] = await db
    .insert(contacts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      firstName: incoming.firstName,
      lastName: incoming.lastName,
      email: incoming.email,
      phone: incoming.phone,
      dateOfBirth: incoming.dateOfBirth,
      mailingAddress: mailingLine(incoming) ?? incoming.mailingStreet,
      city: incoming.city ?? incoming.mailingCity,
      state: incoming.state ?? incoming.mailingState,
      zip: incoming.zip ?? incoming.mailingZip,
      source: "healthsherpa",
      sourceId: incoming.hsContactId ?? incoming.externalId,
      healthNotes: `HealthSherpa ${parsed.event} ${parsed.confirmationNumber ?? parsed.applicationId ?? ""}`.trim(),
      status: "active",
    })
    .returning({ id: contacts.id });
  return created!.id;
}

async function upsertPolicy(input: {
  parsed: HealthSherpaParsedPayload;
  contactId: string;
  dealId: string | null;
}): Promise<string | null> {
  const parsed = input.parsed;
  const policyNumber =
    parsed.confirmationNumber ??
    (parsed.applicationId ? `HS-${parsed.applicationId.slice(0, 8)}` : null);
  if (!policyNumber) return null;

  const existing = parsed.applicationId
    ? await db
        .select({ id: policies.id })
        .from(policies)
        .where(
          and(
            eq(policies.tenantId, DEFAULT_TENANT_ID),
            or(eq(policies.sourceId, parsed.applicationId), eq(policies.policyNumber, policyNumber)),
          ),
        )
        .limit(1)
    : await db
        .select({ id: policies.id })
        .from(policies)
        .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.policyNumber, policyNumber)))
        .limit(1);

  const effective = parseDate(parsed.effectiveDate) ?? new Date();
  const expiration = addYear(effective);
  const premium =
    parsed.premiumCents != null ? (parsed.premiumCents / 100).toFixed(2) : null;
  const values = {
    contactId: input.contactId,
    dealId: input.dealId,
    policyNumber,
    lineOfBusiness: "HEALTH",
    insuranceType: "Health",
    policySubType: parsed.policySubType,
    status: "unpublished" as const,
    publishedAt: null,
    effectiveDate: effective,
    expirationDate: expiration,
    premium,
    sourceId: parsed.applicationId,
    sourceProduct: parsed.product === "medicare" ? "health_ma" : "health_marketplace",
    mintPayload: {
      status: "unpublished" as const,
      product: parsed.policySubType,
      mintedAt: new Date().toISOString(),
      fields: [
        { key: "carrier_name", label: "Carrier", value: parsed.carrierName ?? "", confidence: 1, source: "healthsherpa", flagged: false, confirmed: true },
        { key: "plan_name", label: "Plan", value: parsed.planName ?? "", confidence: 1, source: "healthsherpa", flagged: false, confirmed: true },
        { key: "medicare_number", label: "Medicare number", value: parsed.contact.medicareNumber ?? "", confidence: 1, source: "healthsherpa", flagged: false, confirmed: true },
        { key: "part_a_start", label: "Part A start", value: parsed.contact.partAStart ?? "", confidence: 1, source: "healthsherpa", flagged: false, confirmed: true },
        { key: "part_b_start", label: "Part B start", value: parsed.contact.partBStart ?? "", confidence: 1, source: "healthsherpa", flagged: false, confirmed: true },
        { key: "medicaid_eligibility", label: "Medicaid eligibility", value: yesNo(parsed.contact.medicaidEligible) ?? "", confidence: 1, source: "healthsherpa", flagged: false, confirmed: true },
        { key: "lis_extra_help", label: "LIS / Extra Help", value: yesNo(parsed.contact.extraHelp) ?? "", confidence: 1, source: "healthsherpa", flagged: false, confirmed: true },
      ],
    },
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db.update(policies).set(values).where(eq(policies.id, existing[0].id));
    return existing[0].id;
  }
  const [created] = await db
    .insert(policies)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      ...values,
    })
    .returning({ id: policies.id });
  return created?.id ?? null;
}

export async function ingestHealthSherpaWebhook(payload: unknown): Promise<HealthSherpaInboundResult> {
  let parsed: HealthSherpaParsedPayload | null;
  try {
    parsed = parseHealthSherpaPayload(payload);
  } catch {
    return { accepted: false, reason: "HealthSherpa payload could not be parsed." };
  }
  if (!parsed) {
    return {
      accepted: false,
      reason:
        "Payload was not a HealthSherpa enrollment submission. Manual enrollments in HealthSherpa may not fire this webhook.",
    };
  }
  if (!parsed.contact.firstName || !parsed.contact.lastName) {
    return { accepted: false, reason: "Enrollment contact is missing first or last name." };
  }

  const contactId = await upsertContact(parsed);
  const dealId = await matchDeal({
    contactId,
    externalId: parsed.contact.externalId,
    firstName: parsed.contact.firstName,
    lastName: parsed.contact.lastName,
    email: parsed.contact.email,
  });
  const policyId = await upsertPolicy({ parsed, contactId, dealId });

  if (dealId) {
    const [deal] = await db
      .select({ contactId: deals.contactId })
      .from(deals)
      .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)))
      .limit(1);
    if (deal && !deal.contactId) {
      await db.update(deals).set({ contactId, updatedAt: new Date() }).where(eq(deals.id, dealId));
    }
  }

  const existing = parsed.applicationId
    ? await db
        .select({ id: healthsherpaEnrollments.id })
        .from(healthsherpaEnrollments)
        .where(
          and(
            eq(healthsherpaEnrollments.tenantId, DEFAULT_TENANT_ID),
            eq(healthsherpaEnrollments.hsApplicationId, parsed.applicationId),
          ),
        )
        .limit(1)
    : [];

  const linkValues = {
    product: parsed.product,
    event: parsed.event,
    hsContactId: parsed.contact.hsContactId,
    hsApplicationId: parsed.applicationId,
    hsExternalId: parsed.contact.externalId,
    confirmationNumber: parsed.confirmationNumber,
    contactId,
    dealId,
    policyId,
    payload: (payload && typeof payload === "object" ? payload : { raw: payload }) as Record<string, unknown>,
    updatedAt: new Date(),
  };

  let enrollmentId: string;
  if (existing[0]) {
    await db
      .update(healthsherpaEnrollments)
      .set(linkValues)
      .where(eq(healthsherpaEnrollments.id, existing[0].id));
    enrollmentId = existing[0].id;
  } else {
    const [created] = await db
      .insert(healthsherpaEnrollments)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        ...linkValues,
      })
      .returning({ id: healthsherpaEnrollments.id });
    enrollmentId = created!.id;
  }

  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "signal",
    title:
      parsed.event === "policy_status"
        ? `HealthSherpa ${parsed.product === "marketplace" ? "Marketplace" : "Medicare"} policy update · ${parsed.confirmationNumber ?? parsed.applicationId ?? "enrollment"}`
        : `HealthSherpa ${parsed.product === "marketplace" ? "Marketplace" : "Medicare"} enrollment submitted · ${parsed.confirmationNumber ?? parsed.planName ?? "application"}`,
    body: `${parsed.contact.firstName} ${parsed.contact.lastName} · ${parsed.carrierName ?? "HealthSherpa"} ${parsed.planName ?? parsed.policySubType ?? ""}`.trim(),
    severity: "info",
    entityType: dealId ? "deal" : "contact",
    entityId: dealId ?? contactId,
  });

  return {
    accepted: true,
    reason: "Enrollment stored as an unpublished Health policy.",
    product: parsed.product,
    contactId,
    dealId,
    policyId,
    enrollmentId,
  };
}
