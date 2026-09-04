import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
import { writeEin } from "@/lib/pii/write";
import { CONTACT_ID, TENANT_ID } from "../fixtures/ids";
import { db } from "./index";
import { accounts, carriers, contacts, policies } from "./schema";

type Wave1Contact = {
  zoho_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  dob: string | null;
  mobile: string | null;
  lang: string | null;
  status: string | null;
  since: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  marital: string | null;
};

type Wave1Business = {
  zoho_id: string;
  legal_name: string;
  dba: string | null;
  primary_contact_zoho_id: string;
  employee_count: number | null;
  annual_sales: number | null;
  payroll_total: number | null;
  fein: string | null;
  wc_class_code: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  operations: string | null;
  client_since: string | null;
  is_example: boolean;
};

type Wave1Policy = {
  source_id: string;
  zoho_id: string | null;
  contact_zoho_id: string;
  business_zoho_id: string | null;
  status: string;
  form_type: string;
  line_of_business: string;
  carrier_name: string;
  policy_number: string;
  premium: number;
  billing_frequency: string | null;
  effective_date: string;
  original_effective_date: string;
  term_months: number;
  producer: string | null;
  premises_street: string | null;
  premises_city: string | null;
  premises_state: string | null;
  premises_zip: string | null;
};

function uuidFromSeed(kind: string, key: string): string {
  const hex = createHash("sha256").update(`fitfirst:wave1:${kind}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`);
}

function addMonths(start: Date, months: number): Date {
  const d = new Date(start.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function isExcludedContact(row: Wave1Contact): boolean {
  const first = row.first_name.trim().toLowerCase();
  const last = row.last_name.trim().toLowerCase();
  return first === "ana" && last === "dib";
}

function isExcludedBusiness(row: Wave1Business): boolean {
  return /javier garcia/i.test(row.legal_name);
}

async function loadFixture<T>(name: string): Promise<T> {
  const file = path.join(process.cwd(), "prisma", "seed", name);
  return JSON.parse(await readFile(file, "utf8")) as T;
}

async function upsertCarrier(name: string, line: string): Promise<string> {
  const existing = await db
    .select()
    .from(carriers)
    .where(and(eq(carriers.tenantId, TENANT_ID), sql`lower(${carriers.name}) = ${name.toLowerCase()}`));
  if (existing[0]) {
    const written = new Set(existing[0].writtenLines ?? []);
    if (!written.has(line)) {
      written.add(line);
      await db
        .update(carriers)
        .set({ writtenLines: [...written], updatedAt: new Date() })
        .where(eq(carriers.id, existing[0].id));
    }
    return existing[0].id;
  }
  const id = uuidFromSeed("carrier", name.toLowerCase());
  await db.insert(carriers).values({
    id,
    tenantId: TENANT_ID,
    name,
    writtenLines: [line],
    portalStatus: "open",
    active: true,
    fixtureTag: "wave1-zoho-book",
  });
  return id;
}

export async function seedWave1ZohoBook() {
  const contactRows = (await loadFixture<Wave1Contact[]>("wave1-contacts.json")).filter(
    (row) => !isExcludedContact(row),
  );
  const businessRows = (await loadFixture<Wave1Business[]>("wave1-businesses.json")).filter(
    (row) => !isExcludedBusiness(row),
  );
  const policyRows = await loadFixture<Wave1Policy[]>("wave1-policies.json");

  const contactIds = new Map<string, string>();

  for (const row of contactRows) {
    const [existing] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, TENANT_ID), eq(contacts.zohoId, row.zoho_id)));
    if (existing?.id === CONTACT_ID) continue;

    const id = existing?.id ?? uuidFromSeed("contact", row.zoho_id);
    const values = {
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.mobile,
      mailingAddress: row.street,
      city: row.city,
      state: row.state,
      zip: row.zip,
      dateOfBirth: row.dob,
      language: row.lang,
      maritalStatus: row.marital,
      clientStatus: row.status,
      tenureStart: parseDay(row.since),
      zohoId: row.zoho_id,
      sourceId: row.zoho_id,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(contacts).set(values).where(eq(contacts.id, existing.id));
      contactIds.set(row.zoho_id, existing.id);
    } else {
      await db.insert(contacts).values({
        id,
        tenantId: TENANT_ID,
        ...values,
      });
      contactIds.set(row.zoho_id, id);
    }
  }

  const accountIds = new Map<string, string>();

  for (const row of businessRows) {
    const officerId = contactIds.get(row.primary_contact_zoho_id) ?? null;
    const [existing] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, TENANT_ID), eq(accounts.zohoId, row.zoho_id)));
    const id = existing?.id ?? uuidFromSeed("account", row.zoho_id);
    const values = {
      name: row.legal_name,
      legalName: row.legal_name,
      dba: row.dba,
      ...writeEin(row.fein),
      employeeCount: row.employee_count,
      annualSales: row.annual_sales == null ? null : String(row.annual_sales),
      payrollTotal: row.payroll_total == null ? null : String(row.payroll_total),
      wcClassCode: row.wc_class_code,
      operations: row.operations,
      operationsDescription: row.operations,
      primaryAddress1: row.street,
      primaryCity: row.city,
      primaryState: row.state,
      primaryZip: row.zip,
      mailingSameAsPrimary: true,
      officerContactId: officerId,
      phone: row.phone,
      email: row.email,
      isExample: row.is_example,
      clientSince: parseDay(row.client_since),
      zohoId: row.zoho_id,
      sourceId: row.zoho_id,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(accounts).set(values).where(eq(accounts.id, existing.id));
      accountIds.set(row.zoho_id, existing.id);
    } else {
      await db.insert(accounts).values({
        id,
        tenantId: TENANT_ID,
        ...values,
      });
      accountIds.set(row.zoho_id, id);
    }

    if (officerId) {
      await db
        .update(contacts)
        .set({ accountId: accountIds.get(row.zoho_id), updatedAt: new Date() })
        .where(eq(contacts.id, officerId));
    }
  }

  for (const row of policyRows) {
    const contactId = contactIds.get(row.contact_zoho_id);
    if (!contactId || contactId === CONTACT_ID) continue;
    const accountId = row.business_zoho_id ? (accountIds.get(row.business_zoho_id) ?? null) : null;
    const carrierId = await upsertCarrier(row.carrier_name, row.line_of_business);
    const effective = parseDay(row.effective_date);
    if (!effective) continue;
    const original = parseDay(row.original_effective_date) ?? effective;
    const expiration = addMonths(effective, row.term_months || 12);

    const [existing] = row.zoho_id
      ? await db
          .select()
          .from(policies)
          .where(and(eq(policies.tenantId, TENANT_ID), eq(policies.zohoId, row.zoho_id)))
      : [];
    const [existingBySource] = existing
      ? [existing]
      : await db
          .select()
          .from(policies)
          .where(and(eq(policies.tenantId, TENANT_ID), eq(policies.sourceId, row.source_id)));
    const found = existing ?? existingBySource;

    const values = {
      contactId,
      accountId,
      carrierId,
      policyNumber: row.policy_number,
      lineOfBusiness: row.line_of_business,
      formType: row.form_type,
      status: row.status,
      effectiveDate: effective,
      expirationDate: expiration,
      originalEffectiveDate: original,
      premium: String(row.premium),
      billingFrequency: row.billing_frequency,
      termMonths: row.term_months,
      producer: row.producer,
      premisesAddress: row.premises_street,
      premisesCity: row.premises_city,
      premisesState: row.premises_state,
      premisesZip: row.premises_zip,
      zohoId: row.zoho_id,
      sourceId: row.source_id,
      updatedAt: new Date(),
    };

    if (found) {
      await db.update(policies).set(values).where(eq(policies.id, found.id));
    } else {
      await db.insert(policies).values({
        id: uuidFromSeed("policy", row.zoho_id ?? row.source_id),
        tenantId: TENANT_ID,
        ...values,
      });
    }
  }

  await recomputePolicyCounts([...contactIds.values()], [...accountIds.values()]);

  return {
    contacts: contactRows.length,
    businesses: businessRows.length,
    policies: policyRows.length,
  };
}

async function recomputePolicyCounts(contactIdList: string[], accountIdList: string[]) {
  if (contactIdList.length > 0) {
    const rows = await db
      .select({
        contactId: policies.contactId,
        lifetime: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${policies.status} = 'active')`,
      })
      .from(policies)
      .where(and(eq(policies.tenantId, TENANT_ID), inArray(policies.contactId, contactIdList)))
      .groupBy(policies.contactId);

    const byId = new Map(rows.map((r) => [r.contactId, r]));
    for (const id of contactIdList) {
      if (id === CONTACT_ID) continue;
      const counts = byId.get(id);
      const lifetime = Number(counts?.lifetime ?? 0);
      const active = Number(counts?.active ?? 0);
      await db
        .update(contacts)
        .set({
          policyCount: lifetime,
          lifetimePolicyCount: lifetime,
          activePolicyCount: active,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, id));
    }
  }

  if (accountIdList.length > 0) {
    const rows = await db
      .select({
        accountId: policies.accountId,
        lifetime: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${policies.status} = 'active')`,
        pending: sql<number>`count(*) filter (where ${policies.status} = 'pending')`,
      })
      .from(policies)
      .where(and(eq(policies.tenantId, TENANT_ID), inArray(policies.accountId, accountIdList)))
      .groupBy(policies.accountId);

    const byId = new Map(rows.map((r) => [r.accountId, r]));
    for (const id of accountIdList) {
      const counts = byId.get(id);
      const lifetime = Number(counts?.lifetime ?? 0);
      const active = Number(counts?.active ?? 0);
      const pending = Number(counts?.pending ?? 0);
      await db
        .update(accounts)
        .set({
          lifetimePolicyCount: lifetime,
          activePolicyCount: active,
          boundPolicyCount: active,
          pendingPolicyCount: pending,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, id));
    }
  }
}
