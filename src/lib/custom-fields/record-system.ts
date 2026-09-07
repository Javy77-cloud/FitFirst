import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, carriers, contacts, deals, leads, policies } from "@/lib/db/schema";
import type { FieldLayoutModule } from "./modules";
import type { CustomFieldDef } from "./types";

function str(values: Record<string, string>, key: string, systemKey?: string | null) {
  const fromKey = (values[key] ?? "").trim();
  if (fromKey) return fromKey;
  return systemKey ? (values[systemKey] ?? "").trim() : "";
}

function keep<T>(next: string, existing: T): T | string {
  return next || existing;
}

function asDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function fieldMap(fields: readonly CustomFieldDef[]) {
  return Object.fromEntries(fields.map((field) => [field.systemKey || field.key, field]));
}

export async function applyModuleSystemValues(
  module: FieldLayoutModule,
  recordId: string,
  values: Record<string, string>,
  fields: readonly CustomFieldDef[],
) {
  const bySystem = fieldMap(fields);
  void bySystem;
  if (module === "leads") {
    const [existing] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, recordId)));
    if (!existing) return;
    await db
      .update(leads)
      .set({
        firstName: keep(str(values, "first_name", "firstName"), existing.firstName) as string,
        lastName: keep(str(values, "last_name", "lastName"), existing.lastName) as string,
        email: keep(str(values, "email"), existing.email) as typeof existing.email,
        phone: keep(str(values, "phone"), existing.phone) as typeof existing.phone,
        source: keep(str(values, "source"), existing.source) as typeof existing.source,
        notes: keep(str(values, "notes"), existing.notes) as typeof existing.notes,
        middleName: keep(str(values, "middle_name", "middleName"), existing.middleName) as typeof existing.middleName,
        dateOfBirth: keep(str(values, "date_of_birth", "dateOfBirth"), existing.dateOfBirth) as typeof existing.dateOfBirth,
        mailingAddress: keep(
          str(values, "mailing_address", "mailingAddress"),
          existing.mailingAddress,
        ) as typeof existing.mailingAddress,
        city: keep(str(values, "city"), existing.city) as typeof existing.city,
        state: keep(str(values, "state"), existing.state) as typeof existing.state,
        zip: keep(str(values, "zip"), existing.zip) as typeof existing.zip,
        preferredLanguage: keep(
          str(values, "preferred_language", "preferredLanguage"),
          existing.preferredLanguage,
        ) as typeof existing.preferredLanguage,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, recordId));
    return;
  }
  if (module === "contacts") {
    const [existing] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, recordId)));
    if (!existing) return;
    await db
      .update(contacts)
      .set({
        firstName: keep(str(values, "first_name", "firstName"), existing.firstName) as string,
        lastName: keep(str(values, "last_name", "lastName"), existing.lastName) as string,
        email: keep(str(values, "email"), existing.email) as typeof existing.email,
        phone: keep(str(values, "phone"), existing.phone) as typeof existing.phone,
        mailingAddress: keep(
          str(values, "mailing_address", "mailingAddress"),
          existing.mailingAddress,
        ) as typeof existing.mailingAddress,
        city: keep(str(values, "city"), existing.city) as typeof existing.city,
        state: keep(str(values, "state"), existing.state) as typeof existing.state,
        zip: keep(str(values, "zip"), existing.zip) as typeof existing.zip,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, recordId));
    return;
  }
  if (module === "businesses") {
    const [existing] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, recordId)));
    if (!existing) return;
    await db
      .update(accounts)
      .set({
        name: keep(str(values, "business_name", "name"), existing.name) as string,
        phone: keep(str(values, "phone"), existing.phone) as typeof existing.phone,
        email: keep(str(values, "email"), existing.email) as typeof existing.email,
        city: keep(str(values, "city"), existing.city) as typeof existing.city,
        state: keep(str(values, "state"), existing.state) as typeof existing.state,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, recordId));
    return;
  }
  if (module === "policies") {
    const [existing] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, recordId)));
    if (!existing) return;
    const effective = asDate(str(values, "effective_date", "effectiveDate"));
    const expiration = asDate(str(values, "expiration_date", "expirationDate"));
    await db
      .update(policies)
      .set({
        policyNumber: keep(str(values, "policy_number", "policyNumber"), existing.policyNumber) as string,
        status: keep(str(values, "status"), existing.status) as string,
        premium: keep(str(values, "premium"), existing.premium) as typeof existing.premium,
        effectiveDate: effective ?? existing.effectiveDate,
        expirationDate: expiration ?? existing.expirationDate,
        updatedAt: new Date(),
      })
      .where(eq(policies.id, recordId));
    return;
  }
  if (module === "carriers") {
    const [existing] = await db
      .select()
      .from(carriers)
      .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, recordId)));
    if (!existing) return;
    await db
      .update(carriers)
      .set({
        name: keep(str(values, "name"), existing.name) as string,
        naic: keep(str(values, "naic"), existing.naic) as typeof existing.naic,
        territory: keep(str(values, "territory"), existing.territory) as typeof existing.territory,
        customerServicePhone: keep(str(values, "phone"), existing.customerServicePhone) as typeof existing.customerServicePhone,
        underwriterEmail: keep(str(values, "email"), existing.underwriterEmail) as typeof existing.underwriterEmail,
        updatedAt: new Date(),
      })
      .where(eq(carriers.id, recordId));
    return;
  }
  if (module === "deals") {
    const [existing] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, recordId)));
    if (!existing) return;
    const named = str(values, "named_insured", "primaryNamedInsured");
    const notes = values.notes;
    const state = str(values, "state");
    await db
      .update(deals)
      .set({
        primaryNamedInsured: named || existing.primaryNamedInsured,
        notes: notes ?? existing.notes,
        state: state || existing.state,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, recordId));
  }
}
