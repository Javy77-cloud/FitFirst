"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts, leads } from "@/lib/db/schema";

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
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id));
  revalidatePath(`/contacts/${id}`);
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
      ein: str(formData, "ein") || existing.ein,
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
}

export async function updateLeadRecord(formData: FormData) {
  const id = str(formData, "leadId");
  if (!id) return;
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, id)));
  if (!existing) return;
  await db
    .update(leads)
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
      notes: str(formData, "notes") || existing.notes,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id));
  revalidatePath(`/leads/${id}`);
}
