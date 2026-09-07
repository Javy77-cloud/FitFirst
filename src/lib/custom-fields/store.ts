import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, LINES } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  deskCustomFields,
  deskCustomFieldValues,
  deskFieldLayouts,
  type DeskCustomField,
} from "@/lib/db/schema";
import type { ConvertLead } from "@/lib/crm/convert";
import { catalogForLines, defaultFieldsForLine, defaultLayoutForLine, DEAL_LAYOUT_LINES } from "./defaults";
import { needsEssentialDealMigration, stripLegacyDealLayout } from "./layout";
import { filterLeadForCarry, systemValueFromLead } from "./transfer";
import type { CustomFieldDef, FieldLayout } from "./types";
import { parseLayout } from "./types";
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
  };
}

export async function ensureDealFieldCatalog() {
  const existing = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "deals")));
  if (existing.length > 0) return applyPicklists(existing.map(toFieldDef));
  const catalog = catalogForLines(DEAL_LAYOUT_LINES);
  for (const field of catalog) {
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
        required: field.required ?? false,
        defaultValue: field.defaultValue ?? null,
        picklistId: field.picklistId ?? null,
      })
      .onConflictDoNothing({
        target: [deskCustomFields.tenantId, deskCustomFields.module, deskCustomFields.key],
      });
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
  try {
    return await ensureDealFieldCatalog();
  } catch {
    return catalogForLines(DEAL_LAYOUT_LINES);
  }
}

export async function upsertFieldDef(field: CustomFieldDef) {
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
      required: field.required ?? false,
      defaultValue: field.defaultValue ?? null,
      picklistId: field.picklistId ?? null,
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
        updatedAt: new Date(),
      },
    });
}

export async function deleteFieldDef(key: string) {
  await db
    .delete(deskCustomFields)
    .where(
      and(
        eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID),
        eq(deskCustomFields.module, "deals"),
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

export async function loadRecordValues(recordId: string): Promise<Record<string, string>> {
  try {
    const rows = await db
      .select()
      .from(deskCustomFieldValues)
      .where(
        and(
          eq(deskCustomFieldValues.tenantId, DEFAULT_TENANT_ID),
          eq(deskCustomFieldValues.module, "deals"),
          eq(deskCustomFieldValues.recordId, recordId),
        ),
      );
    return Object.fromEntries(rows.map((row) => [row.fieldKey, row.value ?? ""]));
  } catch {
    return {};
  }
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

const SYSTEM_FIELD_KEYS: Array<{ key: string; systemKey: string }> = [
  { key: "first_name", systemKey: "firstName" },
  { key: "middle_name", systemKey: "middleName" },
  { key: "last_name", systemKey: "lastName" },
  { key: "email", systemKey: "email" },
  { key: "phone", systemKey: "phone" },
  { key: "date_of_birth", systemKey: "dateOfBirth" },
  { key: "mailing_address", systemKey: "mailingAddress" },
  { key: "city", systemKey: "city" },
  { key: "state", systemKey: "state" },
  { key: "zip", systemKey: "zip" },
  { key: "notes", systemKey: "notes" },
  { key: "named_insured", systemKey: "primaryNamedInsured" },
];

export async function writeCarriedLeadValues(
  dealId: string,
  lead: ConvertLead,
  carry?: readonly string[] | null,
) {
  const filtered = filterLeadForCarry(lead, carry);
  const values: Record<string, string> = {};
  for (const field of SYSTEM_FIELD_KEYS) {
    const value = systemValueFromLead(filtered, field.systemKey, carry);
    if (value) values[field.key] = value;
  }
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
