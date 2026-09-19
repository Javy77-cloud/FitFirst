"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, OCCUPANCIES, type Occupancy } from "@/lib/domain";
import { defaultOccupancyForLine } from "@/lib/locations";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { flashStay } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function occupancyFrom(form: FormData): Occupancy {
  const raw = str(form, "occupancy");
  if ((OCCUPANCIES as readonly string[]).includes(raw)) return raw as Occupancy;
  return defaultOccupancyForLine(str(form, "line") || "HO");
}

export async function createLocation(formData: FormData) {
  const contactId = str(formData, "contactId") || null;
  const accountId = str(formData, "accountId") || str(formData, "businessId") || null;
  if (!contactId && !accountId) {
    throw new Error("A location must belong to a contact or an account.");
  }

  const street = str(formData, "street");
  const city = str(formData, "city");
  const zip = str(formData, "zip");
  if (!street || !city || !zip) {
    throw new Error("Street, city, and ZIP are required.");
  }

  await db.insert(locations).values({
    tenantId: DEFAULT_TENANT_ID,
    contactId,
    accountId,
    kind: "property",
    label: str(formData, "label") || street,
    address1: street,
    street,
    city,
    state: str(formData, "state") || "FL",
    zip,
    occupancy: occupancyFrom(formData),
  });

  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (accountId) {
    revalidatePath(`/accounts/${accountId}`);
    revalidatePath(`/businesses/${accountId}`);
  }
  revalidatePath("/contacts");
  revalidatePath("/accounts");
  revalidatePath("/businesses");
  revalidatePath("/policies");
  flashStay(formData, contactId ? `/contacts/${contactId}` : `/accounts/${accountId}`, "location-saved");
}

export async function findOrCreateLocationFromAddress(input: {
  contactId?: string | null;
  businessId?: string | null;
  accountId?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  occupancy?: string | null;
}) {
  const street = input.street?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const zip = input.zip?.trim() ?? "";
  const accountId = input.accountId ?? input.businessId ?? null;
  if (!street || !city || !zip) return null;
  if (!input.contactId && !accountId) return null;

  const occupancy = (input.occupancy?.trim() || defaultOccupancyForLine("HO")) as Occupancy;

  const existing = await db
    .select()
    .from(locations)
    .where(
      and(
        eq(locations.tenantId, DEFAULT_TENANT_ID),
        eq(locations.street, street),
        eq(locations.city, city),
        eq(locations.zip, zip),
        input.contactId ? eq(locations.contactId, input.contactId) : eq(locations.accountId, accountId!),
      ),
    );

  if (existing[0]) return existing[0];

  const [row] = await db
    .insert(locations)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: input.contactId ?? null,
      accountId,
      kind: "property",
      label: street,
      address1: street,
      street,
      city,
      state: input.state?.trim() || "FL",
      zip,
      occupancy,
    })
    .returning();
  return row;
}
