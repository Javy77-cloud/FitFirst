"use server";

import { revalidatePath } from "next/cache";
import { and, eq, or, ne, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contactAccounts, contactCoapplicants, contacts } from "@/lib/db/schema";
import { executeMerge } from "@/lib/merge/execute";
import { MergeLockError } from "@/lib/merge/lock";
import { listFieldDefs, saveLayoutForModule, writeRecordValues, loadLayoutForModule } from "@/lib/custom-fields/store";
import { applyModuleSystemValues } from "@/lib/custom-fields/record-system";
import {
  customFieldKeyFor,
  systemColumnForFieldKey,
} from "@/lib/contacts/contact-field-patch";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import { writeSsn } from "@/lib/pii/write";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { contactCardLayout, contactClassicLayout } from "@/lib/contacts/contact-field-catalog";
import { scheduleContactCoverageNotices } from "@/lib/coverage/schedule-notices";
import { layoutTemplateKind, type LayoutTemplateKind } from "@/lib/custom-fields/layout-template";
import { fieldPreview } from "@/lib/merge/preview";

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

/** Survivor = current contact; archive the other. Optional picks JSON: { email: "duplicate", ... }. */
export async function mergeContactIntoSurvivor(formData: FormData) {
  const keeperId = str(formData, "keeperId");
  const duplicateId = str(formData, "duplicateId");
  if (!keeperId || !duplicateId || keeperId === duplicateId) {
    return { ok: false as const, error: "Pick a different contact to merge." };
  }
  const picksRaw = str(formData, "picks");
  let picks: Record<string, "keeper" | "duplicate"> = {};
  if (picksRaw) {
    try {
      picks = JSON.parse(picksRaw) as Record<string, "keeper" | "duplicate">;
    } catch {
      picks = {};
    }
  }
  try {
    // Apply explicit duplicate→keeper field picks before archive merge.
    if (Object.keys(picks).length > 0) {
      const [keeper] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, keeperId)));
      const [duplicate] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, duplicateId)));
      if (keeper && duplicate) {
        const patch: Record<string, unknown> = {};
        const systemKeys = [
          "email",
          "phone",
          "mailingAddress",
          "city",
          "state",
          "zip",
          "dateOfBirth",
          "notes",
          "lifeNotes",
          "healthNotes",
          "source",
        ] as const;
        for (const key of systemKeys) {
          if (picks[key] === "duplicate") {
            patch[key] = (duplicate as Record<string, unknown>)[key];
          }
        }
        if (Object.keys(patch).length) {
          await db
            .update(contacts)
            .set({ ...patch, updatedAt: new Date() } as never)
            .where(eq(contacts.id, keeperId));
        }
      }
    }
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
  scheduleContactCoverageNotices(row.id);
  return { ok: true as const, id: row.id };
}


/** Blur-save a single contact field (system column and/or custom value). */
export async function updateContactField(input: {
  contactId: string;
  fieldKey: string;
  value: string;
}) {
  const contactId = String(input.contactId ?? "").trim();
  const fieldKey = String(input.fieldKey ?? "").trim();
  const raw = String(input.value ?? "");
  const value = raw.trim();
  if (!contactId || !fieldKey) return { ok: false as const, error: "Missing field." };

  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)));
  if (!existing) return { ok: false as const, error: "Contact not found." };

  const customKey = customFieldKeyFor(fieldKey);
  const column = systemColumnForFieldKey(fieldKey);

  // Required identity fields never blank.
  if (column === "firstName" || column === "lastName") {
    if (!value) return { ok: false as const, error: "Name is required." };
  }

  const defs = await listFieldDefs("contacts");
  const patch = { [customKey]: value };
  await writeRecordValues(contactId, patch, "contacts");

  if (column) {
    const nextValue =
      column === "firstName" || column === "lastName"
        ? value
        : value || null;
    await db
      .update(contacts)
      .set({ [column]: nextValue, updatedAt: new Date() } as never)
      .where(eq(contacts.id, contactId));
  } else {
    await applyModuleSystemValues("contacts", contactId, patch, defs);
  }

  await emitDeskEvent("record.updated", { entityType: "contact", entityId: contactId });
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  if (
    customKey === "cross_selling_opportunity" ||
    customKey === "existing_coverage_types" ||
    customKey === "coverage_carrier_of_record"
  ) {
    scheduleContactCoverageNotices(contactId);
  }
  return { ok: true as const };
}

/** Save Coverage types + us/other carrier-of-record together so gaps stay honest. */
export async function updateContactCoverageRecord(input: {
  contactId: string;
  existingCoverageTypes: string;
  carrierOfRecord: string;
}) {
  const contactId = String(input.contactId ?? "").trim();
  if (!contactId) return { ok: false as const, error: "Missing contact." };

  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)));
  if (!existing) return { ok: false as const, error: "Contact not found." };

  await writeRecordValues(
    contactId,
    {
      existing_coverage_types: String(input.existingCoverageTypes ?? ""),
      coverage_carrier_of_record: String(input.carrierOfRecord ?? ""),
    },
    "contacts",
  );
  await emitDeskEvent("record.updated", { entityType: "contact", entityId: contactId });
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  scheduleContactCoverageNotices(contactId);
  return { ok: true as const };
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


/** Which Contacts layout template is active for this agency (from saved columns). */
export async function readContactLayoutTemplate(): Promise<LayoutTemplateKind> {
  const layout = await loadLayoutForModule("contacts");
  return layoutTemplateKind(layout);
}

/** Classic / Card layout templates — persist per agency (tenant) via contacts module layout. */
export async function applyContactLayoutTemplate(formData: FormData) {
  const kind = str(formData, "template") === "classic" ? "classic" : "card";
  const layout = kind === "classic" ? contactClassicLayout() : contactCardLayout();
  await saveLayoutForModule("contacts", layout);
  revalidatePath("/contacts");
  revalidatePath("/settings/field-builder");
  return { ok: true as const, template: kind as LayoutTemplateKind };
}

/** Side-by-side merge preview for overflow Merge dialog. */
export async function loadContactMergePreview(keeperId: string, duplicateId: string) {
  const [keeper] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, keeperId)));
  const [duplicate] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, duplicateId)));
  if (!keeper || !duplicate) return { ok: false as const, error: "Contact not found." };
  const rows = fieldPreview(
    "contact",
    keeper as unknown as Record<string, unknown>,
    duplicate as unknown as Record<string, unknown>,
  );
  return {
    ok: true as const,
    keeper: {
      id: keeper.id,
      firstName: keeper.firstName,
      lastName: keeper.lastName,
      email: keeper.email,
      phone: keeper.phone,
    },
    duplicate: {
      id: duplicate.id,
      firstName: duplicate.firstName,
      lastName: duplicate.lastName,
      email: duplicate.email,
      phone: duplicate.phone,
    },
    rows,
  };
}
