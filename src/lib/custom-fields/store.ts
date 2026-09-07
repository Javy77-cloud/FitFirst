import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID, LINES } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  deskCustomFields,
  deskCustomFieldValues,
  deskFieldLayouts,
  type DeskCustomField,
} from "@/lib/db/schema";
import type { ConvertLead } from "@/lib/crm/convert";
import { catalogForLines, CORE_FIELDS, defaultFieldsForLine, DEAL_LAYOUT_LINES } from "./defaults";
import { needsEssentialDealMigration, stripLegacyDealLayout } from "./layout";
import {
  defaultFieldsForModule,
  defaultLayoutForModule,
  MODULE_LAYOUT_LINE,
  type FieldLayoutModule,
} from "./modules";
import { dealValuesFromLead } from "./transfer";
import { pickSavedModuleLayout, resolveLayoutFields } from "./resolve-layout";
import type { CustomFieldDef, FieldLayout } from "./types";
import { defaultFieldPermissions, parseFieldPermissions, parseLayout } from "./types";
import { listFieldPicklists } from "./picklist-store";
import { resolveFieldOptions } from "./picklists";

export function toFieldDef(row: DeskCustomField): CustomFieldDef {
  return {
    key: row.key,
    label: row.label,
    type: row.type as CustomFieldDef["type"],
    options: row.options ?? [],
    formula: row.formula,
    lookupModule: row.lookupModule,
    systemKey: row.systemKey,
    required: Boolean(row.required),
    defaultValue: row.defaultValue ?? null,
    picklistId: row.picklistId ?? null,
    permissions: parseFieldPermissions(row.permissions),
  };
}

async function insertMissingFields(module: FieldLayoutModule, fields: CustomFieldDef[]) {
  for (const field of fields) {
    await db
      .insert(deskCustomFields)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        module,
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options ?? [],
        formula: field.formula ?? null,
        lookupModule: field.lookupModule ?? null,
        systemKey: field.systemKey ?? null,
        required: field.required ?? false,
        defaultValue: field.defaultValue ?? null,
        picklistId: field.picklistId ?? null,
        permissions: field.permissions ?? defaultFieldPermissions(),
      })
      .onConflictDoNothing({
        target: [deskCustomFields.tenantId, deskCustomFields.module, deskCustomFields.key],
      });
  }
}

async function insertMissingDealFields(fields: CustomFieldDef[]) {
  await insertMissingFields("deals", fields);
}

export async function ensureDealFieldCatalog() {
  const existing = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "deals")));
  if (existing.length === 0) {
    await insertMissingDealFields(catalogForLines(DEAL_LAYOUT_LINES));
  } else {
    await insertMissingDealFields(CORE_FIELDS);
  }
  const rows = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "deals")));
  return applyPicklists(rows.map(toFieldDef));
}

async function applyPicklists(fields: CustomFieldDef[]): Promise<CustomFieldDef[]> {
  const lists = await listFieldPicklists().catch(() => []);
  return fields.map((field) =>
    field.picklistId ? { ...field, options: resolveFieldOptions(field, lists) } : field,
  );
}

export async function listDealFieldDefs(): Promise<CustomFieldDef[]> {
  return listFieldDefs("deals");
}

export async function ensureModuleFieldCatalog(module: FieldLayoutModule) {
  if (module === "deals") return ensureDealFieldCatalog();
  const existing = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, module)));
  if (existing.length === 0) {
    await insertMissingFields(module, defaultFieldsForModule(module));
  }
  const rows = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, module)));
  return applyPicklists(rows.map(toFieldDef));
}

export async function listFieldDefs(module: FieldLayoutModule = "deals"): Promise<CustomFieldDef[]> {
  try {
    return await ensureModuleFieldCatalog(module);
  } catch {
    return module === "deals" ? catalogForLines(DEAL_LAYOUT_LINES) : defaultFieldsForModule(module);
  }
}

export async function upsertFieldDef(field: CustomFieldDef, module: FieldLayoutModule = "deals") {
  await db
    .insert(deskCustomFields)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module,
      key: field.key,
      label: field.label,
      type: field.type,
      options: field.options ?? [],
      formula: field.formula ?? null,
      lookupModule: field.lookupModule ?? null,
      systemKey: field.systemKey ?? null,
      required: field.required ?? false,
      defaultValue: field.defaultValue ?? null,
      picklistId: field.picklistId ?? null,
      permissions: field.permissions ?? defaultFieldPermissions(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [deskCustomFields.tenantId, deskCustomFields.module, deskCustomFields.key],
      set: {
        label: field.label,
        type: field.type,
        options: field.options ?? [],
        formula: field.formula ?? null,
        lookupModule: field.lookupModule ?? null,
        systemKey: field.systemKey ?? null,
        required: field.required ?? false,
        defaultValue: field.defaultValue ?? null,
        picklistId: field.picklistId ?? null,
        permissions: field.permissions ?? defaultFieldPermissions(),
        updatedAt: new Date(),
      },
    });
}

export async function deleteFieldDef(key: string, module: FieldLayoutModule = "deals") {
  await db
    .delete(deskCustomFields)
    .where(
      and(
        eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID),
        eq(deskCustomFields.module, module),
        eq(deskCustomFields.key, key),
      ),
    );
}

async function loadSavedLayoutRows(module: FieldLayoutModule) {
  return db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, module)));
}

async function migratePackedDealLayouts(
  rows: { id: string; columns: unknown }[],
  picked: FieldLayout,
): Promise<FieldLayout> {
  if (!needsEssentialDealMigration(picked)) return picked;
  const stripped = stripLegacyDealLayout(picked);
  for (const row of rows) {
    const parsed = parseLayout(row.columns);
    if (!needsEssentialDealMigration(parsed)) continue;
    await db
      .update(deskFieldLayouts)
      .set({ columns: stripLegacyDealLayout(parsed), updatedAt: new Date() })
      .where(eq(deskFieldLayouts.id, row.id));
  }
  return stripped;
}

export async function loadLayoutForLine(line: string): Promise<FieldLayout> {
  return loadLayoutForModule("deals", line);
}

export async function saveLayoutForLine(line: string, layout: FieldLayout) {
  const lob = (LINES as readonly string[]).includes(line) ? line : "HO";
  await db
    .insert(deskFieldLayouts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module: "deals",
      lineOfBusiness: lob,
      columns: layout,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [deskFieldLayouts.tenantId, deskFieldLayouts.module, deskFieldLayouts.lineOfBusiness],
      set: { columns: layout, updatedAt: new Date() },
    });
}

/** One builder layout applies to every deal, every line. */
export async function saveLayoutForEveryLine(layout: FieldLayout) {
  for (const line of DEAL_LAYOUT_LINES) {
    await saveLayoutForLine(line, layout);
  }
}

export async function loadLayoutForModule(module: FieldLayoutModule, line = "HO"): Promise<FieldLayout> {
  const preferred =
    module === "deals" ? ((LINES as readonly string[]).includes(line) ? line : "HO") : MODULE_LAYOUT_LINE;
  try {
    const rows = await loadSavedLayoutRows(module);
    const picked = pickSavedModuleLayout(rows, module, preferred);
    if (picked) {
      return module === "deals" ? migratePackedDealLayouts(rows, picked) : picked;
    }
    const layout = defaultLayoutForModule(module);
    if (rows.length === 0) {
      await db
        .insert(deskFieldLayouts)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          module,
          lineOfBusiness: preferred,
          columns: layout,
        })
        .onConflictDoNothing({
          target: [deskFieldLayouts.tenantId, deskFieldLayouts.module, deskFieldLayouts.lineOfBusiness],
        });
    }
    return layout;
  } catch {
    return defaultLayoutForModule(module);
  }
}

export async function saveLayoutForModule(module: FieldLayoutModule, layout: FieldLayout) {
  if (module === "deals") {
    await saveLayoutForEveryLine(layout);
    return;
  }
  await db
    .insert(deskFieldLayouts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module,
      lineOfBusiness: MODULE_LAYOUT_LINE,
      columns: layout,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [deskFieldLayouts.tenantId, deskFieldLayouts.module, deskFieldLayouts.lineOfBusiness],
      set: { columns: layout, updatedAt: new Date() },
    });
}

export async function ensureFieldsForModule(module: FieldLayoutModule, line = "HO") {
  if (module === "deals") {
    await ensureFieldsForLine(line);
    return;
  }
  await ensureModuleFieldCatalog(module);
}

export async function loadRecordValues(
  recordId: string,
  module: FieldLayoutModule = "deals",
): Promise<Record<string, string>> {
  const map = await loadRecordValuesForIds([recordId], module);
  return map.get(recordId) ?? {};
}

export async function loadRecordValuesForIds(
  recordIds: readonly string[],
  module: FieldLayoutModule = "deals",
): Promise<Map<string, Record<string, string>>> {
  const out = new Map<string, Record<string, string>>();
  if (recordIds.length === 0) return out;
  try {
    const rows = await db
      .select()
      .from(deskCustomFieldValues)
      .where(
        and(
          eq(deskCustomFieldValues.tenantId, DEFAULT_TENANT_ID),
          eq(deskCustomFieldValues.module, module),
          inArray(deskCustomFieldValues.recordId, [...recordIds]),
        ),
      );
    for (const row of rows) {
      const current = out.get(row.recordId) ?? {};
      current[row.fieldKey] = row.value ?? "";
      out.set(row.recordId, current);
    }
  } catch {
    return out;
  }
  return out;
}

export async function writeRecordValues(
  recordId: string,
  values: Record<string, string>,
  module: FieldLayoutModule = "deals",
) {
  for (const [fieldKey, value] of Object.entries(values)) {
    await db
      .insert(deskCustomFieldValues)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        module,
        recordId,
        fieldKey,
        value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          deskCustomFieldValues.tenantId,
          deskCustomFieldValues.module,
          deskCustomFieldValues.recordId,
          deskCustomFieldValues.fieldKey,
        ],
        set: { value, updatedAt: new Date() },
      });
  }
}

export async function writeCarriedLeadValues(
  dealId: string,
  lead: ConvertLead,
  carry?: readonly string[] | null,
) {
  const fields = await listDealFieldDefs().catch(() => CORE_FIELDS);
  const values = dealValuesFromLead(lead, fields, carry);
  if (Object.keys(values).length === 0) return;
  await writeRecordValues(dealId, values);
}

export async function loadModuleLayoutBundle(module: FieldLayoutModule, recordId?: string) {
  await ensureFieldsForModule(module).catch(() => null);
  const [layout, fields, stored] = await Promise.all([
    loadLayoutForModule(module),
    listFieldDefs(module),
    recordId ? loadRecordValues(recordId, module) : Promise.resolve({} as Record<string, string>),
  ]);
  return {
    layout,
    fields: resolveLayoutFields(layout, fields),
    stored,
  };
}

export async function ensureFieldsForLine(line: string) {
  const defs = defaultFieldsForLine(line);
  for (const field of defs) {
    await db
      .insert(deskCustomFields)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        module: "deals",
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options ?? [],
        formula: field.formula ?? null,
        lookupModule: field.lookupModule ?? null,
        systemKey: field.systemKey ?? null,
      })
      .onConflictDoNothing({
        target: [deskCustomFields.tenantId, deskCustomFields.module, deskCustomFields.key],
      });
  }
}
