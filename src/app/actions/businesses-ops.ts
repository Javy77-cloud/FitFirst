"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { replaceEin, writeEin } from "@/lib/pii/write";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { normalizeTags, parseTagsFromForm } from "@/lib/tags/module-tags";
import { listFieldDefs, writeRecordValues } from "@/lib/custom-fields/store";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import { executeMerge } from "@/lib/merge/execute";
import { MergeLockError } from "@/lib/merge/lock";
import { fieldPreview } from "@/lib/merge/preview";

function keepInt(next: string, existing: number | null): number | null {
  if (!next.trim()) return null;
  const n = Number(next.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : existing;
}

function keepMoney(next: string, existing: string | null): string | null {
  if (!next.trim()) return null;
  const cleaned = next.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? cleaned : existing;
}

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

const FIELD_MAP = {
  ein: "ein",
  entity_type: "entityType",
  industry: "industry",
  naics: "naics",
  annual_sales: "annualSales",
  employee_count: "employeeCount",
  payroll: "payrollW2",
  payroll_w2: "payrollW2",
  years_in_business: "yearsInBusiness",
  phone: "phone",
  email: "email",
  name: "name",
  dba: "dba",
  website: "website",
  source: "source",
  referral: "referral",
} as const;

type FieldKey = keyof typeof FIELD_MAP;

export async function updateAccountField(input: {
  accountId: string;
  fieldKey: string;
  value: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const accountId = (input.accountId ?? "").trim();
  const fieldKey = (input.fieldKey ?? "").trim() as FieldKey;
  if (!accountId || !(fieldKey in FIELD_MAP)) {
    return { ok: false, error: "Unknown Field." };
  }
  const [existing] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, accountId)));
  if (!existing) return { ok: false, error: "Business Not Found." };

  const raw = input.value ?? "";
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (fieldKey === "ein") {
    Object.assign(
      patch,
      replaceEin(raw, {
        ein: null,
        einEnc: existing.einEnc,
        einIv: existing.einIv,
        einLast4: existing.einLast4,
        einLookup: existing.einLookup,
      }),
    );
  } else if (fieldKey === "annual_sales" || fieldKey === "payroll" || fieldKey === "payroll_w2") {
    patch[FIELD_MAP[fieldKey]] = keepMoney(raw, existing[FIELD_MAP[fieldKey] as "annualSales"]);
  } else if (fieldKey === "employee_count" || fieldKey === "years_in_business") {
    patch[FIELD_MAP[fieldKey]] = keepInt(raw, existing[FIELD_MAP[fieldKey] as "employeeCount"]);
  } else if (fieldKey === "name") {
    const next = raw.trim();
    if (!next) return { ok: false, error: "Name Is Required." };
    patch.name = next;
  } else {
    patch[FIELD_MAP[fieldKey]] = raw.trim() || null;
  }

  await db.update(accounts).set(patch).where(eq(accounts.id, accountId));
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath(`/businesses/${accountId}`);
  return { ok: true };
}

/** Popup create — returns id, does not redirect (caller router.refresh / push). */
export async function createBusinessPopup(formData: FormData) {
  const name =
    str(formData, "name") ||
    str(formData, "legalName") ||
    str(formData, "business_name") ||
    str(formData, "legal_name");
  if (!name) return { ok: false as const, error: "Business name is required." };

  const legalName = str(formData, "legalName") || str(formData, "legal_name") || name;
  const dba = str(formData, "dba") || null;
  const ein = str(formData, "ein") || null;
  const entityType = str(formData, "entityType") || str(formData, "entity_type") || null;
  const industry = str(formData, "industry") || null;
  const phone = str(formData, "phone") || null;
  const email = str(formData, "email") || null;
  const website = str(formData, "website") || null;
  const mailingAddress =
    str(formData, "mailingAddress") || str(formData, "mailing_address") || null;
  const city = str(formData, "city") || null;
  const state = str(formData, "state") || "FL";
  const zip = str(formData, "zip") || null;
  const source = str(formData, "source") || "manual";
  const referral = str(formData, "referral") || null;
  const lifeNotes = str(formData, "lifeNotes") || str(formData, "life_notes") || null;
  const healthNotes = str(formData, "healthNotes") || str(formData, "health_notes") || null;
  const pcNotes = str(formData, "pcNotes") || str(formData, "pc_notes") || null;
  const tags = normalizeTags(parseTagsFromForm(formData));

  const [row] = await db
    .insert(accounts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      name,
      legalName,
      dba,
      ...writeEin(ein),
      entityType,
      industry,
      phone,
      email,
      website,
      mailingAddress,
      city,
      state,
      zip,
      source,
      referral,
      lifeNotes,
      healthNotes,
      pcNotes,
      tags,
    })
    .returning();

  const defs = await listFieldDefs("businesses").catch(() => []);
  const custom = customValuesFromForm(formData, defs);
  if (Object.keys(custom).length) {
    await writeRecordValues(row.id, custom, "businesses");
  }

  await emitDeskEvent("record.created", {
    entityType: "account",
    entityId: row.id,
    name: row.name,
  });
  revalidatePath("/accounts");
  revalidatePath("/businesses");
  revalidatePath(`/accounts/${row.id}`);
  return { ok: true as const, id: row.id };
}

/** Search active businesses for Merge dialog (excludes archived / self). */
export async function searchBusinessesForMerge(query: string, excludeId?: string) {
  const q = query.trim().toLowerCase();
  const clauses = [
    eq(accounts.tenantId, DEFAULT_TENANT_ID),
    isNull(accounts.archivedAt),
    isNull(accounts.mergedIntoId),
  ];
  if (excludeId) clauses.push(ne(accounts.id, excludeId));
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      dba: accounts.dba,
      email: accounts.email,
      phone: accounts.phone,
      city: accounts.city,
      state: accounts.state,
    })
    .from(accounts)
    .where(and(...clauses))
    .limit(80);
  if (!q) return rows.slice(0, 20);
  return rows
    .filter((row) => {
      const hay = `${row.name} ${row.dba ?? ""} ${row.email ?? ""} ${row.phone ?? ""} ${row.city ?? ""}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 20);
}

/** Side-by-side merge preview for Business overflow Merge dialog. */
export async function loadBusinessMergePreview(keeperId: string, duplicateId: string) {
  const [keeper] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, keeperId)));
  const [duplicate] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, duplicateId)));
  if (!keeper || !duplicate) return { ok: false as const, error: "Business Not Found." };
  if (keeper.archivedAt || keeper.mergedIntoId || duplicate.archivedAt || duplicate.mergedIntoId) {
    return { ok: false as const, error: "Cannot Merge An Archived Business." };
  }
  const rows = fieldPreview(
    "account",
    keeper as unknown as Record<string, unknown>,
    duplicate as unknown as Record<string, unknown>,
  );
  return {
    ok: true as const,
    keeper: {
      id: keeper.id,
      name: keeper.name,
      dba: keeper.dba,
      email: keeper.email,
      phone: keeper.phone,
    },
    duplicate: {
      id: duplicate.id,
      name: duplicate.name,
      dba: duplicate.dba,
      email: duplicate.email,
      phone: duplicate.phone,
    },
    rows,
  };
}

/**
 * Merge duplicate business into survivor.
 * Linked contacts / policies / deals / locations / timeline move to survivor;
 * duplicate is archived (not deleted). Empty-only field fill on survivor.
 */
export async function mergeBusinessIntoSurvivor(formData: FormData) {
  const keeperId = str(formData, "keeperId");
  const duplicateId = str(formData, "duplicateId");
  if (!keeperId || !duplicateId || keeperId === duplicateId) {
    return { ok: false as const, error: "Pick A Different Business To Merge." };
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
    if (Object.keys(picks).length > 0) {
      const [keeper] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, keeperId)));
      const [duplicate] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, duplicateId)));
      if (keeper && duplicate) {
        const patch: Record<string, unknown> = {};
        const systemKeys = [
          "name",
          "legalName",
          "dba",
          "email",
          "phone",
          "mailingAddress",
          "city",
          "state",
          "zip",
          "website",
          "entityType",
          "industry",
          "naics",
          "employeeCount",
          "annualSales",
          "payrollW2",
          "yearsInBusiness",
          "source",
          "referral",
          "notes",
          "lifeNotes",
          "healthNotes",
          "pcNotes",
        ] as const;
        for (const key of systemKeys) {
          if (picks[key] === "duplicate") {
            const val = (duplicate as Record<string, unknown>)[key];
            // Never blank out survivor name.
            if (key === "name" && (val == null || String(val).trim() === "")) continue;
            patch[key] = val;
          }
        }
        if (Object.keys(patch).length) {
          await db
            .update(accounts)
            .set({ ...patch, updatedAt: new Date() } as never)
            .where(eq(accounts.id, keeperId));
        }
      }
    }
    await executeMerge({ entityType: "account", keeperId, duplicateId });
  } catch (error) {
    if (error instanceof MergeLockError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }

  revalidatePath("/accounts");
  revalidatePath("/businesses");
  revalidatePath(`/accounts/${keeperId}`);
  revalidatePath(`/businesses/${keeperId}`);
  revalidatePath(`/accounts/${duplicateId}`);
  revalidatePath("/merge");
  return { ok: true as const, keeperId };
}

