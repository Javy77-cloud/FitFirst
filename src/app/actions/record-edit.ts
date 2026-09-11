"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { leadValuesFromForm } from "@/lib/crm/lead-fields";
import { normalizeRecordSource } from "@/lib/crm/sources";
import { db } from "@/lib/db";
import { accounts, contacts, deals, leads } from "@/lib/db/schema";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { replaceEin, replaceSsn } from "@/lib/pii/write";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import { listFieldDefs, writeRecordValues } from "@/lib/custom-fields/store";
import { flashAction } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Save fields already on the record. Never blank the values the desk already has. */
export async function updateContactRecord(formData: FormData) {
  const id = str(formData, "contactId");
  if (!id) return;
  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, id)));
  if (!existing) return;
  await db
    .update(contacts)
    .set({
      firstName: str(formData, "firstName") || existing.firstName,
      lastName: str(formData, "lastName") || existing.lastName,
      phone: str(formData, "phone") || existing.phone,
      email: str(formData, "email") || existing.email,
      mailingAddress: str(formData, "mailingAddress") || existing.mailingAddress,
      city: str(formData, "city") || existing.city,
      state: str(formData, "state") || existing.state,
      zip: str(formData, "zip") || existing.zip,
      dateOfBirth: str(formData, "dateOfBirth") || existing.dateOfBirth,
      ...replaceSsn(str(formData, "ssn"), {
        ssnEnc: existing.ssnEnc,
        ssnIv: existing.ssnIv,
        ssnLast4: existing.ssnLast4,
      }),
      source: normalizeRecordSource(str(formData, "source"), existing.source),
      ...(str(formData, "saveOptOuts") === "1"
        ? {
            emailOptOut: formData.get("emailOptOut") === "on",
            smsOptOut: formData.get("smsOptOut") === "on",
            emailOptedOutAt:
              formData.get("emailOptOut") === "on"
                ? (existing.emailOptedOutAt ?? new Date())
                : null,
            smsOptedOutAt:
              formData.get("smsOptOut") === "on" ? (existing.smsOptedOutAt ?? new Date()) : null,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id));
  await emitDeskEvent("record.updated", { entityType: "contact", entityId: id });
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
  flashAction(`/contacts/${id}`, "Contact updated");
}

export async function updateAccountRecord(formData: FormData) {
  const id = str(formData, "accountId");
  if (!id) return;
  const [existing] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, id)));
  if (!existing) return;
  await db
    .update(accounts)
    .set({
      name: str(formData, "name") || existing.name,
      ...replaceEin(str(formData, "ein"), {
        ein: null,
        einEnc: existing.einEnc,
        einIv: existing.einIv,
        einLast4: existing.einLast4,
        einLookup: existing.einLookup,
      }),
      phone: str(formData, "phone") || existing.phone,
      email: str(formData, "email") || existing.email,
      mailingAddress: str(formData, "mailingAddress") || existing.mailingAddress,
      city: str(formData, "city") || existing.city,
      state: str(formData, "state") || existing.state,
      zip: str(formData, "zip") || existing.zip,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id));
  revalidatePath(`/accounts/${id}`);
  flashAction(`/accounts/${id}`, "Business updated");
}

export async function updateLeadRecord(formData: FormData) {
  const id = str(formData, "leadId");
  if (!id) return;
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, id)));
  if (!existing) return;
  const values = leadValuesFromForm(formData);
  await db
    .update(leads)
    .set({
      firstName: values.firstName || existing.firstName,
      middleName: values.middleName ?? existing.middleName,
      lastName: values.lastName || existing.lastName,
      phone: values.phone || existing.phone,
      email: values.email || existing.email,
      mailingAddress: values.mailingAddress || existing.mailingAddress,
      city: values.city || existing.city,
      state: values.state || existing.state,
      zip: values.zip || existing.zip,
      dateOfBirth: values.dateOfBirth || existing.dateOfBirth,
      insuranceTypeDesired: values.insuranceTypeDesired || existing.insuranceTypeDesired,
      preferredLanguage: values.preferredLanguage || existing.preferredLanguage,
      status: values.status || existing.status,
      temperature: values.temperature || existing.temperature,
      source: values.source || existing.source,
      notes: values.notes || existing.notes,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id));
  const defs = await listFieldDefs("leads").catch(() => []);
  const custom = customValuesFromForm(formData, defs);
  if (Object.keys(custom).length) {
    await writeRecordValues(id, custom, "leads");
  }
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  flashAction("/leads", "lead-saved");
}

export async function updateDealRecord(formData: FormData) {
  const id = str(formData, "dealId");
  if (!id) return;
  const [existing] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, id)));
  if (!existing) return;
  await db
    .update(deals)
    .set({
      source: normalizeRecordSource(str(formData, "source"), existing.source),
      updatedAt: new Date(),
    })
    .where(eq(deals.id, id));
  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
  flashAction(`/deals/${id}`, "deal-updated");
}
