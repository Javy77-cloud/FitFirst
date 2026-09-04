"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { drivers, policies, vehicles } from "@/lib/db/schema";
import { writeLicense } from "@/lib/pii/write";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function num(form: FormData, key: string) {
  const v = str(form, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function optionalId(form: FormData, key: string) {
  const v = str(form, key);
  return v || null;
}

function revalidateSchedule(form: FormData) {
  const returnTo = str(form, "returnTo");
  const policyId = optionalId(form, "policyId");
  const dealId = optionalId(form, "dealId");
  const accountContactId = optionalId(form, "accountContactId");
  if (returnTo) revalidatePath(returnTo);
  if (policyId) revalidatePath(`/policies/${policyId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (accountContactId) revalidatePath(`/contacts/${accountContactId}`);
  revalidatePath("/contacts");
  revalidatePath("/policies");
}

export async function addVehicle(formData: FormData) {
  const policyId = optionalId(formData, "policyId");
  const dealId = optionalId(formData, "dealId");
  const quoteSheetId = optionalId(formData, "quoteSheetId");
  const riskId = optionalId(formData, "riskId");
  if (!policyId && !dealId && !quoteSheetId) {
    throw new Error("A vehicle needs an Auto policy or Auto quote sheet (deal).");
  }

  const [{ next } = { next: 0 }] = await db
    .select({ next: sql<number>`coalesce(max(${vehicles.sortOrder}), -1) + 1` })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, DEFAULT_TENANT_ID),
        policyId ? eq(vehicles.policyId, policyId) : dealId ? eq(vehicles.dealId, dealId) : sql`true`,
      ),
    );

  await db.insert(vehicles).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    dealId,
    quoteSheetId,
    riskId,
    year: num(formData, "year"),
    make: str(formData, "make") || null,
    model: str(formData, "model") || null,
    vin: str(formData, "vin") || null,
    usage: str(formData, "usage") || null,
    garagingZip: str(formData, "garagingZip") || null,
    garagingAddress: str(formData, "garagingAddress") || null,
    sortOrder: Number(next ?? 0),
  });

  revalidateSchedule(formData);
}

export async function deleteVehicle(formData: FormData) {
  const id = str(formData, "vehicleId");
  if (!id) return;
  await db
    .delete(vehicles)
    .where(and(eq(vehicles.tenantId, DEFAULT_TENANT_ID), eq(vehicles.id, id)));
  revalidateSchedule(formData);
}

export async function addDriver(formData: FormData) {
  const policyId = optionalId(formData, "policyId");
  const dealId = optionalId(formData, "dealId");
  const quoteSheetId = optionalId(formData, "quoteSheetId");
  const riskId = optionalId(formData, "riskId");
  if (!policyId && !dealId && !quoteSheetId) {
    throw new Error("A driver needs an Auto policy or Auto quote sheet (deal).");
  }

  const firstName = str(formData, "firstName") || "Driver";
  const lastName = str(formData, "lastName") || "Unknown";
  const dobRaw = str(formData, "dateOfBirth");
  const dateOfBirth = dobRaw ? new Date(`${dobRaw}T00:00:00.000Z`) : null;

  const [{ next } = { next: 0 }] = await db
    .select({ next: sql<number>`coalesce(max(${drivers.sortOrder}), -1) + 1` })
    .from(drivers)
    .where(
      and(
        eq(drivers.tenantId, DEFAULT_TENANT_ID),
        policyId ? eq(drivers.policyId, policyId) : dealId ? eq(drivers.dealId, dealId) : sql`true`,
      ),
    );

  await db.insert(drivers).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    dealId,
    quoteSheetId,
    riskId,
    contactId: optionalId(formData, "contactId"),
    firstName,
    lastName,
    dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().slice(0, 10) : null,
    ...writeLicense(str(formData, "licenseNumber") || null),
    licenseState: str(formData, "licenseState") || null,
    sortOrder: Number(next ?? 0),
  });

  revalidateSchedule(formData);
}

export async function deleteDriver(formData: FormData) {
  const id = str(formData, "driverId");
  if (!id) return;
  await db.delete(drivers).where(and(eq(drivers.tenantId, DEFAULT_TENANT_ID), eq(drivers.id, id)));
  revalidateSchedule(formData);
}

export async function attachScheduleToPolicy(policyId: string, dealId: string) {
  await db
    .update(vehicles)
    .set({ policyId, updatedAt: new Date() })
    .where(and(eq(vehicles.tenantId, DEFAULT_TENANT_ID), eq(vehicles.dealId, dealId)));
  await db
    .update(drivers)
    .set({ policyId, updatedAt: new Date() })
    .where(and(eq(drivers.tenantId, DEFAULT_TENANT_ID), eq(drivers.dealId, dealId)));
  const [policy] = await db.select().from(policies).where(eq(policies.id, policyId));
  if (policy?.contactId) revalidatePath(`/contacts/${policy.contactId}`);
}
