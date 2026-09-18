import { and, eq, ne } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, healthsherpaEnrollments, quoteSheets } from "@/lib/db/schema";
import {
  HEALTHSHERPA_ACA_LOGIN_URL,
  HEALTHSHERPA_ACA_NEEDS_PARTNER,
  HEALTHSHERPA_ACA_READY,
  HEALTHSHERPA_AGENT_EMAIL_MISSING,
  HEALTHSHERPA_KEYS_MISSING,
  HEALTHSHERPA_MANUAL_LINES_NOTE,
} from "./copy";
import { syncHealthSherpaContact, type HealthSherpaContactBody } from "./client";
import { healthSherpaAcaQuote, healthSherpaAcaStatus } from "./aca";
import { healthSherpaProductForPlan, isUsingHealthSherpa, USING_HEALTHSHERPA_KEY } from "./sheet";
import { loadHealthSherpaAcaCredentials, loadHealthSherpaMedicareCredentials } from "./vault";

export type HealthSherpaSyncResult =
  | { ok: true; redirectUrl: string | null; contactId: string | null; message: string }
  | { ok: false; code: string; message: string };

export type HealthSherpaContactRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  mailingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: string | null;
  sourceId: string | null;
};

function sheetValue(
  values: Record<string, { value?: string } | undefined> | null | undefined,
  key: string,
): string | null {
  const raw = values?.[key]?.value?.trim();
  return raw || null;
}

function yesNoBool(raw: string | null): boolean | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower === "yes" || lower === "true") return true;
  if (lower === "no" || lower === "false") return false;
  return undefined;
}

function ageFromDob(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - parsed.getUTCFullYear();
  const month = now.getUTCMonth() - parsed.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < parsed.getUTCDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export async function syncContactToHealthSherpa(input: {
  contact: HealthSherpaContactRecord;
  agentEmail: string;
  dealId?: string | null;
  extras?: Partial<
    Pick<
      HealthSherpaContactBody,
      | "medicare_number"
      | "medicare_part_a_effective_date"
      | "medicare_part_b_effective_date"
      | "extra_help"
      | "medicaid_eligible"
      | "notes"
    >
  >;
  notes?: string[];
}): Promise<HealthSherpaSyncResult> {
  const firstName = input.contact.firstName?.trim() || "";
  const lastName = input.contact.lastName?.trim() || "";
  if (!firstName || !lastName) {
    return {
      ok: false,
      code: "identity",
      message: "Add first and last name before syncing.",
    };
  }

  const existingLink = await db
    .select()
    .from(healthsherpaEnrollments)
    .where(
      and(
        eq(healthsherpaEnrollments.tenantId, DEFAULT_TENANT_ID),
        eq(healthsherpaEnrollments.contactId, input.contact.id),
        ne(healthsherpaEnrollments.event, "bulk_oneshot"),
      ),
    )
    .limit(1);

  const body: HealthSherpaContactBody = {
    external_id: input.contact.id,
    first_name: firstName,
    last_name: lastName,
    email: input.contact.email ?? undefined,
    phone: input.contact.phone ?? undefined,
    birth_date: input.contact.dateOfBirth ?? undefined,
    address_1: input.contact.mailingAddress ?? undefined,
    city: input.contact.city ?? undefined,
    state: input.contact.state ?? undefined,
    zip: input.contact.zip ?? undefined,
    medicare_number: input.extras?.medicare_number,
    medicare_part_a_effective_date: input.extras?.medicare_part_a_effective_date,
    medicare_part_b_effective_date: input.extras?.medicare_part_b_effective_date,
    extra_help: input.extras?.extra_help,
    medicaid_eligible: input.extras?.medicaid_eligible,
    notes: input.notes ?? input.extras?.notes,
  };

  const result = await syncHealthSherpaContact({
    agentEmail: input.agentEmail,
    hsContactId:
      existingLink[0]?.hsContactId ??
      (input.contact.source === "healthsherpa" ? input.contact.sourceId : null),
    contact: body,
  });
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  const hsContactId = result.data.contactId;
  if (hsContactId) {
    await db
      .update(contacts)
      .set({ source: "healthsherpa", sourceId: hsContactId, updatedAt: new Date() })
      .where(eq(contacts.id, input.contact.id));
  }

  const linkValues = {
    product: "medicare" as const,
    event: "sync",
    hsContactId,
    hsExternalId: input.contact.id,
    contactId: input.contact.id,
    dealId: input.dealId ?? existingLink[0]?.dealId ?? null,
    updatedAt: new Date(),
  };
  if (existingLink[0]) {
    await db.update(healthsherpaEnrollments).set(linkValues).where(eq(healthsherpaEnrollments.id, existingLink[0].id));
  } else {
    await db.insert(healthsherpaEnrollments).values({
      tenantId: DEFAULT_TENANT_ID,
      ...linkValues,
    });
  }

  return {
    ok: true,
    redirectUrl: result.data.redirectUrl,
    contactId: hsContactId,
    message: result.data.redirectUrl
      ? "Contact synced. Opening the HealthSherpa quote page."
      : "Contact synced. HealthSherpa did not return a quote URL — open Medicare and confirm the county.",
  };
}

export async function syncDealToHealthSherpa(input: {
  dealId: string;
  agentEmail: string;
}): Promise<HealthSherpaSyncResult> {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, input.dealId)))
    .limit(1);
  if (!deal) return { ok: false, code: "missing_deal", message: "Deal not found." };

  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(
      and(
        eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
        eq(quoteSheets.dealId, deal.id),
        eq(quoteSheets.line, "health"),
      ),
    )
    .limit(1);
  const values = sheet?.values ?? {};
  const planType = sheetValue(values, "plan_type") ?? deal.policySubType ?? deal.quotingForm;
  const product = healthSherpaProductForPlan(planType);
  if (product === "manual") {
    return { ok: false, code: "manual_only", message: HEALTHSHERPA_MANUAL_LINES_NOTE };
  }
  if (product === "marketplace") {
    return syncMarketplaceDeal({ deal, values });
  }

  const creds = await loadHealthSherpaMedicareCredentials();
  if (!creds) {
    return { ok: false, code: "not_configured", message: HEALTHSHERPA_KEYS_MISSING };
  }

  const agentEmail = input.agentEmail.trim() || creds.agentEmail || "";
  if (!agentEmail) {
    return {
      ok: false,
      code: "agent_email",
      message: HEALTHSHERPA_AGENT_EMAIL_MISSING,
    };
  }

  let contact = deal.contactId
    ? (
        await db
          .select()
          .from(contacts)
          .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, deal.contactId)))
          .limit(1)
      )[0] ?? null
    : null;

  const firstName = contact?.firstName?.trim() || (deal.primaryNamedInsured ?? "").split(" ")[0] || "";
  const lastName =
    contact?.lastName?.trim() ||
    (deal.primaryNamedInsured ?? "").split(" ").slice(1).join(" ") ||
    "";
  if (!firstName || !lastName) {
    return {
      ok: false,
      code: "identity",
      message: "Add first and last name on Deal Details (or link a contact) before syncing.",
    };
  }

  if (!contact) {
    const [created] = await db
      .insert(contacts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        firstName,
        lastName,
        email: null,
        phone: null,
        source: "healthsherpa",
        status: "active",
      })
      .returning();
    contact = created ?? null;
    if (contact) {
      await db.update(deals).set({ contactId: contact.id, updatedAt: new Date() }).where(eq(deals.id, deal.id));
    }
  }
  if (!contact) return { ok: false, code: "contact", message: "Could not create a contact for this deal." };

  return syncContactToHealthSherpa({
    contact: {
      ...contact,
      firstName,
      lastName,
    },
    agentEmail,
    dealId: deal.id,
    extras: {
      medicare_number: sheetValue(values, "medicare_number") ?? undefined,
      medicare_part_a_effective_date: sheetValue(values, "part_a_start") ?? undefined,
      medicare_part_b_effective_date: sheetValue(values, "part_b_start") ?? undefined,
      extra_help: yesNoBool(sheetValue(values, "lis_extra_help")),
      medicaid_eligible: yesNoBool(sheetValue(values, "medicaid_eligibility")),
      notes: isUsingHealthSherpa(sheetValue(values, USING_HEALTHSHERPA_KEY))
        ? [`Synced from FitFirst deal ${deal.id}`]
        : undefined,
    },
  });
}

async function syncMarketplaceDeal(input: {
  deal: {
    id: string;
    contactId: string | null;
    primaryNamedInsured: string | null;
  };
  values: Record<string, { value?: string } | undefined>;
}): Promise<HealthSherpaSyncResult> {
  const creds = await loadHealthSherpaAcaCredentials();
  if (!creds) {
    const aca = await healthSherpaAcaStatus();
    return { ok: false, code: "aca_needs_partner", message: aca.message || HEALTHSHERPA_ACA_NEEDS_PARTNER };
  }

  let contact = input.deal.contactId
    ? (
        await db
          .select()
          .from(contacts)
          .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, input.deal.contactId)))
          .limit(1)
      )[0] ?? null
    : null;

  const firstName = contact?.firstName?.trim() || (input.deal.primaryNamedInsured ?? "").split(" ")[0] || "";
  const lastName =
    contact?.lastName?.trim() ||
    (input.deal.primaryNamedInsured ?? "").split(" ").slice(1).join(" ") ||
    "";
  if (!firstName || !lastName) {
    return {
      ok: false,
      code: "identity",
      message: "Add first and last name on Deal Details (or link a contact) before opening Marketplace.",
    };
  }

  if (!contact) {
    const [created] = await db
      .insert(contacts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        firstName,
        lastName,
        email: null,
        phone: null,
        source: "healthsherpa",
        status: "active",
      })
      .returning();
    contact = created ?? null;
    if (contact) {
      await db
        .update(deals)
        .set({ contactId: contact.id, updatedAt: new Date() })
        .where(eq(deals.id, input.deal.id));
    }
  }
  if (!contact) return { ok: false, code: "contact", message: "Could not create a contact for this deal." };

  const zip = (contact.zip ?? "").replace(/\D/g, "").slice(0, 5);
  const age = ageFromDob(contact.dateOfBirth);
  const incomeRaw = sheetValue(input.values, "household_income");
  const income = incomeRaw ? Number(incomeRaw.replace(/[^0-9.]/g, "")) : NaN;
  const tobacco = sheetValue(input.values, "tobacco_status");
  const quote =
    zip.length === 5 && age != null
      ? await healthSherpaAcaQuote({
          zip,
          fips: sheetValue(input.values, "fips") ?? sheetValue(input.values, "county_fips"),
          state: contact.state,
          householdIncome: Number.isFinite(income) ? income : null,
          applicants: [
            {
              age,
              relationship: "primary",
              smoker: Boolean(tobacco && /current|yes|true/i.test(tobacco)),
            },
          ],
        })
      : null;

  const existingLink = await db
    .select()
    .from(healthsherpaEnrollments)
    .where(
      and(
        eq(healthsherpaEnrollments.tenantId, DEFAULT_TENANT_ID),
        eq(healthsherpaEnrollments.contactId, contact.id),
      ),
    )
    .limit(1);
  const linkValues = {
    product: "marketplace" as const,
    event: "sync",
    hsExternalId: contact.id,
    contactId: contact.id,
    dealId: input.deal.id,
    updatedAt: new Date(),
  };
  if (existingLink[0]) {
    await db.update(healthsherpaEnrollments).set(linkValues).where(eq(healthsherpaEnrollments.id, existingLink[0].id));
  } else {
    await db.insert(healthsherpaEnrollments).values({
      tenantId: DEFAULT_TENANT_ID,
      ...linkValues,
    });
  }

  const quoteNote = quote?.ok
    ? quote.message
    : quote
      ? `${quote.message} ${HEALTHSHERPA_ACA_READY}`
      : zip.length === 5
        ? "Add date of birth to run QuoteConnect. Opening HealthSherpa Marketplace."
        : "Add a 5-digit ZIP to run QuoteConnect. Opening HealthSherpa Marketplace.";

  return {
    ok: true,
    redirectUrl: HEALTHSHERPA_ACA_LOGIN_URL,
    contactId: contact.id,
    message: quoteNote,
  };
}

export async function loadDealHealthSherpaEnrollment(dealId: string) {
  try {
    const [row] = await db
      .select()
      .from(healthsherpaEnrollments)
      .where(
        and(eq(healthsherpaEnrollments.tenantId, DEFAULT_TENANT_ID), eq(healthsherpaEnrollments.dealId, dealId)),
      )
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}
