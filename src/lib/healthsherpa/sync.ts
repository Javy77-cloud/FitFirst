import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, healthsherpaEnrollments, quoteSheets } from "@/lib/db/schema";
import {
  HEALTHSHERPA_ACA_NEEDS_PARTNER,
  HEALTHSHERPA_KEYS_MISSING,
  HEALTHSHERPA_MANUAL_LINES_NOTE,
} from "./copy";
import { syncHealthSherpaContact, type HealthSherpaContactBody } from "./client";
import { healthSherpaAcaStatus } from "./aca";
import { healthSherpaProductForPlan, isUsingHealthSherpa, USING_HEALTHSHERPA_KEY } from "./sheet";
import { loadHealthSherpaMedicareCredentials } from "./vault";

export type HealthSherpaSyncResult =
  | { ok: true; redirectUrl: string | null; contactId: string | null; message: string }
  | { ok: false; code: string; message: string };

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
    const aca = await healthSherpaAcaStatus();
    return { ok: false, code: "aca_needs_partner", message: aca.message || HEALTHSHERPA_ACA_NEEDS_PARTNER };
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
      message: "Add the HealthSherpa agent email on the vault row (or HEALTHSHERPA_AGENT_EMAIL).",
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

  const body: HealthSherpaContactBody = {
    external_id: contact.id,
    first_name: firstName,
    last_name: lastName,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    birth_date: contact.dateOfBirth ?? undefined,
    address_1: contact.mailingAddress ?? undefined,
    city: contact.city ?? undefined,
    state: contact.state ?? undefined,
    zip: contact.zip ?? undefined,
    medicare_number: sheetValue(values, "medicare_number") ?? undefined,
    medicare_part_a_effective_date: sheetValue(values, "part_a_start") ?? undefined,
    medicare_part_b_effective_date: sheetValue(values, "part_b_start") ?? undefined,
    extra_help: yesNoBool(sheetValue(values, "lis_extra_help")),
    medicaid_eligible: yesNoBool(sheetValue(values, "medicaid_eligibility")),
    notes: isUsingHealthSherpa(sheetValue(values, USING_HEALTHSHERPA_KEY))
      ? [`Synced from FitFirst deal ${deal.id}`]
      : undefined,
  };

  const result = await syncHealthSherpaContact({
    agentEmail,
    hsContactId: existingLink[0]?.hsContactId ?? (contact.source === "healthsherpa" ? contact.sourceId : null),
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
      .where(eq(contacts.id, contact.id));
  }

  const linkValues = {
    product: "medicare" as const,
    event: "sync",
    hsContactId,
    hsExternalId: contact.id,
    contactId: contact.id,
    dealId: deal.id,
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
