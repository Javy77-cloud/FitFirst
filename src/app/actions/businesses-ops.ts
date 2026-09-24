"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { replaceEin, writeEin } from "@/lib/pii/write";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { normalizeTags, parseTagsFromForm } from "@/lib/tags/module-tags";
import { listFieldDefs, saveLayoutForModule, writeRecordValues, loadLayoutForModule } from "@/lib/custom-fields/store";
import { businessCardLayout, businessClassicLayout } from "@/lib/custom-fields/modules";
import { layoutTemplateKind, type LayoutTemplateKind } from "@/lib/custom-fields/layout-template";
import { applyModuleSystemValues } from "@/lib/custom-fields/record-system";
import { formatPhoneStandard } from "@/lib/phone/format";
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

/** Layout / system keys → accounts columns for blur-save. */
const FIELD_MAP: Record<string, string> = {
  ein: "ein",
  entity_type: "entityType",
  industry: "industry",
  naics: "naics",
  annual_sales: "annualSales",
  employee_count: "employeeCount",
  payroll: "payrollW2",
  payroll_w2: "payrollW2",
  payroll_1099: "payroll1099",
  years_in_business: "yearsInBusiness",
  phone: "phone",
  email: "email",
  name: "name",
  business_name: "name",
  dba: "dba",
  legal_name: "legalName",
  website: "website",
  source: "source",
  referral: "referral",
  mailing_address: "mailingAddress",
  city: "city",
  state: "state",
  zip: "zip",
  notes: "notes",
  life_notes: "lifeNotes",
  health_notes: "healthNotes",
  pc_notes: "pcNotes",
  operations: "operationsDescription",
};

/** Blur-save any Business layout field (system + custom). */
export async function updateAccountField(input: {
  accountId: string;
  fieldKey: string;
  value: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const accountId = (input.accountId ?? "").trim();
  const fieldKey = (input.fieldKey ?? "").trim();
  const raw = input.value ?? "";
  const value = raw.trim();
  if (!accountId || !fieldKey) return { ok: false, error: "Missing Field." };

  const [existing] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, accountId)));
  if (!existing) return { ok: false, error: "Business Not Found." };

  const defs = await listFieldDefs("businesses").catch(() => []);
  await writeRecordValues(accountId, { [fieldKey]: raw }, "businesses");

  const column = FIELD_MAP[fieldKey];
  if (column === "name" || fieldKey === "business_name" || fieldKey === "name") {
    const next = value || existing.name;
    if (!next.trim()) return { ok: false, error: "Name Is Required." };
    await db.update(accounts).set({ name: next, updatedAt: new Date() }).where(eq(accounts.id, accountId));
  } else if (fieldKey === "ein") {
    await db
      .update(accounts)
      .set({
        ...replaceEin(raw, {
          ein: null,
          einEnc: existing.einEnc,
          einIv: existing.einIv,
          einLast4: existing.einLast4,
          einLookup: existing.einLookup,
        }),
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId));
  } else if (column === "annualSales" || column === "payrollW2" || column === "payroll1099") {
    const money = value ? keepMoney(raw, existing[column as "annualSales"]) : null;
    await db.update(accounts).set({ [column]: money, updatedAt: new Date() }).where(eq(accounts.id, accountId));
  } else if (column === "employeeCount" || column === "yearsInBusiness") {
    const n = value ? keepInt(raw, existing[column as "employeeCount"]) : null;
    await db.update(accounts).set({ [column]: n, updatedAt: new Date() }).where(eq(accounts.id, accountId));
  } else if (column === "phone") {
    const phone = value ? formatPhoneStandard(value) || value : null;
    await db.update(accounts).set({ phone, updatedAt: new Date() }).where(eq(accounts.id, accountId));
  } else if (column) {
    await db
      .update(accounts)
      .set({ [column]: value || null, updatedAt: new Date() })
      .where(eq(accounts.id, accountId));
  } else {
    await applyModuleSystemValues("businesses", accountId, { [fieldKey]: raw }, defs);
  }

  revalidatePath(`/accounts/${accountId}`);
  revalidatePath(`/businesses/${accountId}`);
  revalidatePath("/accounts");
  return { ok: true };
}

/** Read popup camelCase, snake, or layout `field_*` names. */
function field(form: FormData, ...keys: string[]) {
  for (const key of keys) {
    const v = str(form, key);
    if (v) return v;
    const fromLayout = str(form, `field_${key}`);
    if (fromLayout) return fromLayout;
  }
  return "";
}

function moneyOrNull(raw: string) {
  if (!raw.trim()) return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? cleaned : null;
}

function intOrNull(raw: string) {
  if (!raw.trim()) return null;
  const n = Number(raw.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Shared insert used by popup + full-layout New Business page. */
async function insertBusinessFromForm(formData: FormData) {
  const name =
    field(formData, "name", "business_name", "legalName", "legal_name") ||
    field(formData, "dba");
  if (!name) return { ok: false as const, error: "Business name is required." };

  const legalName =
    field(formData, "legalName", "legal_name") || name;
  const dba = field(formData, "dba") || null;
  const ein = field(formData, "ein") || null;
  const entityType = field(formData, "entityType", "entity_type") || null;
  const industry = field(formData, "industry") || null;
  const phone = field(formData, "phone") || null;
  const email = field(formData, "email") || null;
  const website = field(formData, "website") || null;
  const mailingAddress =
    field(formData, "mailingAddress", "mailing_address") || null;
  const city = field(formData, "city") || null;
  const state = field(formData, "state") || "FL";
  const zip = field(formData, "zip") || null;
  const source = field(formData, "source") || "manual";
  const referral = field(formData, "referral") || null;
  const lifeNotes = field(formData, "lifeNotes", "life_notes") || null;
  const healthNotes = field(formData, "healthNotes", "health_notes") || null;
  const pcNotes = field(formData, "pcNotes", "pc_notes") || null;
  const notes = field(formData, "notes") || null;
  const naics = field(formData, "naics") || null;
  const operationsDescription =
    field(formData, "operations", "operationsDescription", "operations_description") || null;
  const employeeCount = intOrNull(field(formData, "employee_count", "employeeCount"));
  const yearsInBusiness = intOrNull(field(formData, "years_in_business", "yearsInBusiness"));
  const annualSales = moneyOrNull(field(formData, "annual_sales", "annualSales"));
  const payrollW2 = moneyOrNull(field(formData, "payroll_w2", "payrollW2", "payroll"));
  const payroll1099 = moneyOrNull(field(formData, "payroll_1099", "payroll1099"));
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
      notes,
      naics,
      operationsDescription,
      employeeCount,
      yearsInBusiness,
      annualSales,
      payrollW2,
      payroll1099,
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

/** Popup create — returns id, does not redirect (caller router.refresh / push). */
export async function createBusinessPopup(formData: FormData) {
  return insertBusinessFromForm(formData);
}

/** Full-layout New Business (`/accounts/new`) — redirects to the new record. */
export async function createBusiness(formData: FormData) {
  const result = await insertBusinessFromForm(formData);
  const { flashAction } = await import("@/lib/flash-action");
  if (!result.ok) {
    flashAction("/accounts/new", result.error, "error");
  }
  flashAction(`/accounts/${result.id}?saved=1`, "business-saved");
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

/** Which Business layout template is active for this agency (from saved columns). */
export async function readBusinessLayoutTemplate(): Promise<LayoutTemplateKind> {
  const layout = await loadLayoutForModule("businesses");
  return layoutTemplateKind(layout);
}

/** Classic / Card layout templates — persist per agency via businesses module layout. */
export async function applyBusinessLayoutTemplate(formData: FormData) {
  const kind = str(formData, "template") === "classic" ? "classic" : "card";
  const layout = kind === "classic" ? businessClassicLayout() : businessCardLayout();
  await saveLayoutForModule("businesses", layout);
  revalidatePath("/accounts");
  revalidatePath("/settings/field-builder");
  return { ok: true as const, template: kind as LayoutTemplateKind };
}

/** Persist Account Coverage → Elsewhere rows (line / carrier / renewal / rough premium). */
export async function updateAccountElsewhereCoverage(input: {
  accountId: string;
  rows: import("@/lib/db/schema").ElsewhereCoverageRow[] | string;
}) {
  const accountId = String(input.accountId ?? "").trim();
  if (!accountId) return { ok: false as const, error: "Missing account." };

  const { parseElsewhereCoverage } = await import("@/lib/coverage/elsewhere-coverage");
  const { ensureElsewhereCoverageColumn } = await import("@/lib/db/ensure-elsewhere-coverage");
  await ensureElsewhereCoverageColumn().catch(() => false);

  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, accountId)));
  if (!existing) return { ok: false as const, error: "Account not found." };

  const rows = parseElsewhereCoverage(input.rows);
  await db
    .update(accounts)
    .set({ elsewhereCoverage: rows, updatedAt: new Date() })
    .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, accountId)));

  await emitDeskEvent("record.updated", { entityType: "account", entityId: accountId });
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/accounts");
  return { ok: true as const };
}
