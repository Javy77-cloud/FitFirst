"use server";

import { revalidatePath } from "next/cache";
import { and, eq, or, ne, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contactAccounts, contactCoapplicants, contacts } from "@/lib/db/schema";
import { executeMerge } from "@/lib/merge/execute";
import { MergeLockError } from "@/lib/merge/lock";
import { listFieldDefs, writeRecordValues } from "@/lib/custom-fields/store";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import { writeSsn } from "@/lib/pii/write";
import { emitDeskEvent } from "@/lib/developer-hub/events";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function updateContactTags(formData: FormData) {
  const id = String(formData.get("contactId") ?? "");
  const tags = String(formData.get("tags") ?? "")
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  await db
    .update(contacts)
    .set({ tags, updatedAt: new Date() })
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, id)));
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/campaigns");
}

/** Bidirectional co-applicant link (stores one directed row; UI reads both directions). */
export async function linkContactCoapplicant(formData: FormData) {
  const contactId = str(formData, "contactId");
  const linkedContactId = str(formData, "linkedContactId");
  if (!contactId || !linkedContactId || contactId === linkedContactId) {
    return { ok: false as const, error: "Pick a different contact." };
  }
  const [a] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)));
  const [b] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, linkedContactId)));
  if (!a || !b) return { ok: false as const, error: "Contact not found." };

  const existing = await db
    .select()
    .from(contactCoapplicants)
    .where(
      and(
        eq(contactCoapplicants.tenantId, DEFAULT_TENANT_ID),
        or(
          and(
            eq(contactCoapplicants.contactId, contactId),
            eq(contactCoapplicants.linkedContactId, linkedContactId),
          ),
          and(
            eq(contactCoapplicants.contactId, linkedContactId),
            eq(contactCoapplicants.linkedContactId, contactId),
          ),
        ),
      ),
    );
  if (existing.length === 0) {
    await db.insert(contactCoapplicants).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId,
      linkedContactId,
    });
  }
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/contacts/${linkedContactId}`);
  return { ok: true as const };
}

export async function unlinkContactCoapplicant(formData: FormData) {
  const contactId = str(formData, "contactId");
  const linkedContactId = str(formData, "linkedContactId");
  if (!contactId || !linkedContactId) return { ok: false as const };
  await db
    .delete(contactCoapplicants)
    .where(
      and(
        eq(contactCoapplicants.tenantId, DEFAULT_TENANT_ID),
        or(
          and(
            eq(contactCoapplicants.contactId, contactId),
            eq(contactCoapplicants.linkedContactId, linkedContactId),
          ),
          and(
            eq(contactCoapplicants.contactId, linkedContactId),
            eq(contactCoapplicants.linkedContactId, contactId),
          ),
        ),
      ),
    );
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/contacts/${linkedContactId}`);
  return { ok: true as const };
}

export async function linkContactBusiness(formData: FormData) {
  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  if (!contactId || !accountId) return { ok: false as const, error: "Pick a business." };
  const [acct] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, accountId)));
  if (!acct) return { ok: false as const, error: "Business not found." };
  const existing = await db
    .select()
    .from(contactAccounts)
    .where(
      and(
        eq(contactAccounts.tenantId, DEFAULT_TENANT_ID),
        eq(contactAccounts.contactId, contactId),
        eq(contactAccounts.accountId, accountId),
      ),
    );
  if (existing.length === 0) {
    await db.insert(contactAccounts).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId,
      accountId,
      role: "principal",
    });
  }
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/accounts/${accountId}`);
  return { ok: true as const };
}

export async function unlinkContactBusiness(formData: FormData) {
  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  if (!contactId || !accountId) return { ok: false as const };
  await db
    .delete(contactAccounts)
    .where(
      and(
        eq(contactAccounts.tenantId, DEFAULT_TENANT_ID),
        eq(contactAccounts.contactId, contactId),
        eq(contactAccounts.accountId, accountId),
      ),
    );
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/accounts/${accountId}`);
  return { ok: true as const };
}

/** Survivor = current contact; archive the other. */
export async function mergeContactIntoSurvivor(formData: FormData) {
  const keeperId = str(formData, "keeperId");
  const duplicateId = str(formData, "duplicateId");
  if (!keeperId || !duplicateId || keeperId === duplicateId) {
    return { ok: false as const, error: "Pick a different contact to merge." };
  }
  try {
    await executeMerge({ entityType: "contact", keeperId, duplicateId });
  } catch (error) {
    if (error instanceof MergeLockError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${keeperId}`);
  revalidatePath("/merge");
  return { ok: true as const, keeperId };
}

/** Popup create — returns id, does not redirect (caller router.refresh). */
export async function createContactPopup(formData: FormData) {
  const firstName = str(formData, "firstName") || "Unknown";
  const middleName = str(formData, "middleName") || null;
  const lastName = str(formData, "lastName") || "Client";
  const email = str(formData, "email") || null;
  const phone = str(formData, "phone") || null;
  const forceCreate = str(formData, "forceCreate") === "1";
  const source = str(formData, "source") || "manual";
  const referral = str(formData, "referral") || null;
  const lifeNotes = str(formData, "lifeNotes") || null;
  const healthNotes = str(formData, "healthNotes") || null;
  const pcNotes = str(formData, "pcNotes") || null;

  if (!forceCreate && (email || phone)) {
    const rows = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, DEFAULT_TENANT_ID),
          isNull(contacts.archivedAt),
          isNull(contacts.mergedIntoId),
        ),
      );
    const emailNorm = (email ?? "").trim().toLowerCase();
    const phoneDigits = (phone ?? "").replace(/\D/g, "");
    const hit = rows.find((row) => {
      const rowEmail = (row.email ?? "").trim().toLowerCase();
      const rowPhone = (row.phone ?? "").replace(/\D/g, "");
      if (emailNorm && rowEmail && emailNorm === rowEmail) return true;
      if (phoneDigits.length >= 7 && rowPhone.length >= 7 && phoneDigits === rowPhone) return true;
      return false;
    });
    if (hit) {
      return {
        ok: false as const,
        duplicate: true as const,
        existingId: hit.id,
        existingLabel: `${hit.lastName}, ${hit.firstName}`,
      };
    }
  }

  const [row] = await db
    .insert(contacts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      firstName,
      lastName,
      email,
      phone,
      source,
      lifeNotes,
      healthNotes,
      notes: [referral ? `Referral: ${referral}` : "", pcNotes ? `P&C: ${pcNotes}` : ""]
        .filter(Boolean)
        .join("\n") || null,
      ...writeSsn(null),
    })
    .returning();

  const defs = await listFieldDefs("contacts").catch(() => []);
  const custom: Record<string, string> = {};
  if (middleName) custom.middle_name = middleName;
  if (referral) custom.referral = referral;
  if (pcNotes) custom.pc_notes = pcNotes;
  const fromForm = customValuesFromForm(formData, defs);
  Object.assign(custom, fromForm);
  if (Object.keys(custom).length) {
    await writeRecordValues(row.id, custom, "contacts");
  }

  await emitDeskEvent("record.created", {
    entityType: "contact",
    entityId: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
  });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${row.id}`);
  return { ok: true as const, id: row.id };
}

export async function searchContactsForLink(query: string, excludeId?: string) {
  const q = query.trim().toLowerCase();
  const clauses = [
    eq(contacts.tenantId, DEFAULT_TENANT_ID),
    isNull(contacts.archivedAt),
    isNull(contacts.mergedIntoId),
  ];
  if (excludeId) clauses.push(ne(contacts.id, excludeId));
  const rows = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(and(...clauses))
    .limit(80);
  if (!q) return rows.slice(0, 20);
  return rows
    .filter((row) => {
      const hay = `${row.firstName} ${row.lastName} ${row.email ?? ""} ${row.phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 20);
}

export async function searchBusinessesForLink(query: string) {
  const q = query.trim().toLowerCase();
  const rows = await db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.tenantId, DEFAULT_TENANT_ID))
    .limit(80);
  if (!q) return rows.slice(0, 20);
  return rows.filter((row) => row.name.toLowerCase().includes(q)).slice(0, 20);
}
