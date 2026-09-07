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
import { catalogForLines, CORE_FIELDS, defaultFieldsForLine, defaultLayoutForLine, DEAL_LAYOUT_LINES } from "./defaults";
import { needsEssentialDealMigration, stripLegacyDealLayout } from "./layout";
import {
  defaultFieldsForModule,
  defaultLayoutForModule,
  MODULE_LAYOUT_LINE,
  type FieldLayoutModule,
} from "./modules";
import { dealValuesFromLead } from "./transfer";
import type { CustomFieldDef, FieldLayout } from "./types";
import { defaultFieldPermissions, parseFieldPermissions, parseLayout } from "./types";
import { listFieldPicklists } from "./picklist-store";
import { resolveFieldOptions, sanitizePicklistOptions } from "./picklists";

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

function persistFieldOptions(field: CustomFieldDef): string[] {
  if (field.type === "picklist" || field.type === "multi_select" || field.picklistId) {
    return sanitizePicklistOptions(field.options ?? []);
  }
  return field.options ?? [];
}

async function applyPicklists(fields: CustomFieldDef[]): Promise<CustomFieldDef[]> {
  const lists = await listFieldPicklists().catch(() => []);
  return fields.map((field) =>
    field.type === "picklist" || field.type === "multi_select" || field.picklistId
      ? { ...field, options: resolveFieldOptions(field, lists) }
      : field,
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
  const options = persistFieldOptions(field);
  await db
    .insert(deskCustomFields)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module,
      key: field.key,
      label: field.label,
      type: field.type,
      options,
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
        options,
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

export async function loadLayoutForLine(line: string): Promise<FieldLayout> {
  const lob = (LINES as readonly string[]).includes(line) ? line : "HO";
  try {
    const [row] = await db
      .select()
      .from(deskFieldLayouts)
      .where(
        and(
          eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID),
          eq(deskFieldLayouts.module, "deals"),
          eq(deskFieldLayouts.lineOfBusiness, lob),
        ),
      );
    if (row) {
      const parsed = parseLayout(row.columns);
      if (!needsEssentialDealMigration(parsed)) return parsed;
      const stripped = stripLegacyDealLayout(parsed);
      await db
        .update(deskFieldLayouts)
        .set({ columns: stripped, updatedAt: new Date() })
        .where(
          and(
            eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID),
            eq(deskFieldLayouts.module, "deals"),
            eq(deskFieldLayouts.lineOfBusiness, lob),
          ),
        );
      return stripped;
    }
    const layout = defaultLayoutForLine(lob);
    await db
      .insert(deskFieldLayouts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        module: "deals",
        lineOfBusiness: lob,
        columns: layout,
      })
      .onConflictDoNothing({
        target: [deskFieldLayouts.tenantId, deskFieldLayouts.module, deskFieldLayouts.lineOfBusiness],
      });
    return layout;
  } catch {
    return defaultLayoutForLine(lob);
  }
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
  if (module === "deals") return loadLayoutForLine(line);
  try {
    const [row] = await db
      .select()
      .from(deskFieldLayouts)
      .where(
        and(
          eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID),
          eq(deskFieldLayouts.module, module),
          eq(deskFieldLayouts.lineOfBusiness, MODULE_LAYOUT_LINE),
        ),
      );
    if (row) return parseLayout(row.columns);
    const layout = defaultLayoutForModule(module);
    await db
      .insert(deskFieldLayouts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        module,
        lineOfBusiness: MODULE_LAYOUT_LINE,
        columns: layout,
      })
      .onConflictDoNothing({
        target: [deskFieldLayouts.tenantId, deskFieldLayouts.module, deskFieldLayouts.lineOfBusiness],
      });
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

export async function loadRecordValues(recordId: string): Promise<Record<string, string>> {
  const map = await loadRecordValuesForIds([recordId]);
  return map.get(recordId) ?? {};
}

export async function loadRecordValuesForIds(
  recordIds: readonly string[],
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
          eq(deskCustomFieldValues.module, "deals"),
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

export async function writeRecordValues(recordId: string, values: Record<string, string>) {
  for (const [fieldKey, value] of Object.entries(values)) {
    await db
      .insert(deskCustomFieldValues)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        module: "deals",
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
