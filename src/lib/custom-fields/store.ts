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
import {
  LEAD_INSURANCE_CATEGORY_OPTIONS,
  LEAD_INSURANCE_TYPE_OPTIONS,
} from "./lead-picklist-options";
import { allPcCategoryLabels, allPcSubtypeLabels } from "@/lib/deals/insurance-cascade";
import { needsEssentialDealMigration, stripLegacyDealLayout } from "./layout";
import {
  defaultFieldsForModule,
  defaultLayoutForModule,
  MODULE_LAYOUT_LINE,
  type FieldLayoutModule,
} from "./modules";
import { dealValuesFromLead } from "./transfer";
import {
  ensureLayoutIncludesCatalogFields,
  pickSavedModuleLayout,
  resolveLayoutFields,
} from "./resolve-layout";
import type { CustomFieldDef, FieldLayout } from "./types";
import { AGENCY_LAYOUT_REVISION, allLayoutFieldKeys, withLayoutRevision } from "./types";
import { splitInsuredMailingAddressSections, needsAddressSectionSplit } from "./split-address-sections";
import { migrateDealLayoutParity, needsDealLayoutParity } from "./migrate-deal-layout-parity";
import {
  needsDealDetailsLandlordStrip,
  stripDealDetailsLandlordFields,
} from "./deal-details-landlord";
import { migrateLeadLayout, needsLeadLayoutMigration } from "./migrate-lead-layout";
import { APPLICANT_CUSTOM_KEYS } from "./applicant-fields";
import { canonicalizeIdentityField, identityTypeNeedsRepair } from "./identity-field";
import { defaultFieldPermissions, parseFieldPermissions, parseLayout } from "./types";
import { listFieldPicklists } from "./picklist-store";
import { loadGlobalLists } from "@/lib/db/global-lists";
import {
  fieldUsesOptionSet,
  globalListOptionSetsFromRows,
  parseGlobalListKey,
  persistedOptionSetBinding,
} from "./option-sets";
import { occupationPicklistId } from "@/lib/contacts/occupation-picklist";
import {
  CONTACT_DETAIL_PICKLIST_BINDINGS,
  ensureContactDetailPicklists,
} from "@/lib/contacts/contact-detail-picklists";
import { ensureBusinessDetailPicklists } from "@/lib/businesses/business-detail-picklists";
import { contactCardLayout, CONTACT_MODULE_FIELDS } from "@/lib/contacts/contact-field-catalog";
import {
  optionColorMap,
  resolveFieldOptions,
  resolveRichFieldOptions,
  sanitizePicklistOptions,
  sanitizeRichPicklistOptions,
} from "./picklists";

export function toFieldDef(row: DeskCustomField): CustomFieldDef {
  const rich = sanitizeRichPicklistOptions(row.options ?? []);
  const isPick =
    row.type === "picklist" ||
    row.type === "multi_select" ||
    Boolean(row.picklistId) ||
    Boolean(row.globalListKey);
  return canonicalizeIdentityField({
    key: row.key,
    label: row.label,
    type: row.type as CustomFieldDef["type"],
    options: isPick ? rich.map((option) => option.value) : ((row.options as string[] | null) ?? []),
    optionColors: isPick ? optionColorMap(rich) : undefined,
    formula: row.formula,
    lookupModule: row.lookupModule,
    systemKey: row.systemKey,
    required: Boolean(row.required),
    defaultValue: row.defaultValue ?? null,
    picklistId: row.picklistId ?? null,
    globalListKey: parseGlobalListKey(row.globalListKey),
    permissions: parseFieldPermissions(row.permissions),
  });
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
        ...persistedOptionSetBinding(field),
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


async function ensureInsuranceSubtypeField() {
  const existing = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "deals")));
  const options = allPcSubtypeLabels();
  // Never hijack insurance_type — Type + subtype are separate (cascade renders on subtype).
  const target =
    existing.find((row) => row.systemKey === "quotingForm") ??
    existing.find((row) => row.key === "insurance_subtype") ??
    existing.find((row) => /^insurance subtype$/i.test(row.label));
  const key = target?.key ?? "insurance_subtype";
  await upsertFieldDef({
    key,
    label: "Policy form",
    type: "picklist",
    options,
    systemKey: "quotingForm",
    required: true,
  });
  // Pipeline family (PC / Life / Health) — cascade first select.
  await upsertFieldDef({
    key: "insurance_type",
    label: "Pipeline",
    type: "picklist",
    options: [...LEAD_INSURANCE_TYPE_OPTIONS],
    required: true,
  });
  // Insurance type — Home / Auto / Term Life under Pipeline.
  await upsertFieldDef({
    key: "insurance_category",
    label: "Insurance type",
    type: "picklist",
    options: [...LEAD_INSURANCE_CATEGORY_OPTIONS],
    required: true,
  });
}

async function ensureLeadInsuranceTypeOptions() {
  await upsertFieldDef(
    {
      key: "insurance_type",
      label: "Pipeline",
      type: "picklist",
      options: [...LEAD_INSURANCE_TYPE_OPTIONS],
      required: true,
    },
    "leads",
  );
  await upsertFieldDef(
    {
      key: "insurance_category",
      label: "Insurance type",
      type: "picklist",
      options: [...LEAD_INSURANCE_CATEGORY_OPTIONS],
      required: true,
    },
    "leads",
  );
  await upsertFieldDef(
    {
      key: "insurance_subtype",
      label: "Policy form",
      type: "picklist",
      options: allPcSubtypeLabels(),
      required: true,
    },
    "leads",
  );
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
  await ensureDealCoreLabelUpgrades();
  await ensureInsuranceSubtypeField();
  const rows = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "deals")));
  return applyPicklists(rows.map(toFieldDef));
}

function persistFieldOptions(field: CustomFieldDef): unknown[] {
  if (fieldUsesOptionSet(field)) {
    // Keep rich { value, color, isDefault } so list pills stay colored after layout saves.
    if (field.optionColors && Object.keys(field.optionColors).length > 0) {
      return sanitizeRichPicklistOptions(
        (field.options ?? []).map((value) => ({
          value,
          color: field.optionColors?.[value] ?? null,
          isDefault: field.defaultValue === value,
        })),
      );
    }
    return sanitizeRichPicklistOptions(field.options ?? []);
  }
  return field.options ?? [];
}

async function applyPicklists(fields: CustomFieldDef[]): Promise<CustomFieldDef[]> {
  const [lists, globalRows] = await Promise.all([
    listFieldPicklists().catch(() => []),
    loadGlobalLists().catch(() => []),
  ]);
  const globalLists = globalListOptionSetsFromRows(globalRows);
  return fields.map((field) => {
    if (!fieldUsesOptionSet(field)) return field;
    const rich = resolveRichFieldOptions(field, lists, globalLists);
    return {
      ...field,
      options: resolveFieldOptions(field, lists, globalLists),
      optionColors: optionColorMap(rich),
    };
  });
}

export async function listDealFieldDefs(): Promise<CustomFieldDef[]> {
  return listFieldDefs("deals");
}

/** Keys that must leave free-text: upgrade type/options/label without inventing duplicate lists. */
const LEAD_CATALOG_UPGRADE_KEYS = new Set([
  "status",
  "cadence",
  "temperature",
  "insurance_type_desired",
  "preferred_language",
  "source",
  "mailing_address",
  "contact_mailing_address",
  "pipeline",
  "insurance_type",
  "insurance_category",
  "insurance_subtype",
  ...APPLICANT_CUSTOM_KEYS,
]);

async function ensureLeadCatalogUpgrades() {
  const defaults = defaultFieldsForModule("leads");
  const existing = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "leads")));
  const byKey = new Map(existing.map((row) => [row.key, row]));
  for (const field of defaults) {
    const row = byKey.get(field.key);
    if (!row) continue;
    if (!LEAD_CATALOG_UPGRADE_KEYS.has(field.key)) continue;
    const typeMismatch = row.type !== field.type;
    const labelMismatch = field.label && row.label !== field.label;
    const needsOptions =
      field.type === "picklist" &&
      Array.isArray(field.options) &&
      field.options.length > 0 &&
      (row.type !== "picklist" || !Array.isArray(row.options) || (row.options as unknown[]).length === 0);
    if (typeMismatch || labelMismatch || needsOptions) {
      await upsertFieldDef(field, "leads");
    }
  }
  await repairStoredIdentityFieldTypes("leads");
}

async function ensureDealCoreLabelUpgrades() {
  const existing = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "deals")));
  const byKey = new Map(existing.map((row) => [row.key, row]));
  const applicantKeys = new Set<string>(APPLICANT_CUSTOM_KEYS);
  for (const field of CORE_FIELDS) {
    const row = byKey.get(field.key);
    if (!row) continue;
    if (field.key === "mailing_address" && row.label === "Address") {
      await upsertFieldDef({ ...toFieldDef(row), label: "Insured Address", type: "address" }, "deals");
    }
    if (field.key === "preferred_language" && row.type === "single_line") {
      await upsertFieldDef(field, "deals");
    }
    if (
      applicantKeys.has(field.key) &&
      (row.type !== "picklist" ||
        !Array.isArray(row.options) ||
        (row.options as unknown[]).length === 0 ||
        row.label !== field.label)
    ) {
      await upsertFieldDef(field, "deals");
    }
  }
  await repairStoredIdentityFieldTypes("deals");
}


async function repairStoredIdentityFieldTypes(module: FieldLayoutModule) {
  const existing = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, module)));
  for (const row of existing) {
    if (!identityTypeNeedsRepair(row.key, row.type, row.label)) continue;
    await upsertFieldDef(toFieldDef(row), module);
  }
}

const OCCUPATION_FIELD_KEYS_BY_MODULE: Partial<Record<FieldLayoutModule, string[]>> = {
  contacts: ["occupation"],
  leads: ["applicant_occupation", "co_applicant_occupation"],
  deals: ["applicant_occupation", "co_applicant_occupation"],
};

/** Bind CRM occupation fields to the shared Occupations global picklist. */
async function ensureOccupationFieldBindings(module: FieldLayoutModule) {
  const keys = OCCUPATION_FIELD_KEYS_BY_MODULE[module];
  if (!keys?.length) return;
  const picklistId = await occupationPicklistId().catch(() => null);
  if (!picklistId) return;
  for (const key of keys) {
    const [row] = await db
      .select()
      .from(deskCustomFields)
      .where(
        and(
          eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID),
          eq(deskCustomFields.module, module),
          eq(deskCustomFields.key, key),
        ),
      );
    if (!row) continue;
    if (row.picklistId === picklistId && row.type === "picklist") continue;
    await db
      .update(deskCustomFields)
      .set({ type: "picklist", picklistId, updatedAt: new Date() })
      .where(eq(deskCustomFields.id, row.id));
  }
}


async function ensureContactDetailPicklistBindings() {
  const ids = await ensureContactDetailPicklists().catch(() => ({} as Record<string, string>));
  for (const row of CONTACT_DETAIL_PICKLIST_BINDINGS) {
    const picklistId = ids[row.fieldKey];
    if (!picklistId) continue;
    const [existing] = await db
      .select()
      .from(deskCustomFields)
      .where(
        and(
          eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID),
          eq(deskCustomFields.module, "contacts"),
          eq(deskCustomFields.key, row.fieldKey),
        ),
      );
    if (!existing) continue;
    if (existing.picklistId === picklistId && existing.type === row.type) continue;
    await db
      .update(deskCustomFields)
      .set({ type: row.type, picklistId, updatedAt: new Date() })
      .where(eq(deskCustomFields.id, existing.id));
  }
}

async function ensureContactCatalogUpgrades() {
  for (const field of CONTACT_MODULE_FIELDS) {
    if (
      field.key === "source" ||
      field.key === "referral" ||
      field.key === "mailing_address" ||
      field.key === "marital_status" ||
      field.key === "education_level" ||
      field.key === "employment_status" ||
      field.key === "preferred_contact_method" ||
      field.key === "preferred_contact_time" ||
      field.key === "recent_life_events" ||
      field.key === "existing_coverage_types" ||
      field.key === "cross_selling_opportunity" ||
      field.key === "is_homeowner" ||
      field.key === "is_business_owner"
    ) {
      await upsertFieldDef(field, "contacts");
    }
  }
  await repairStoredIdentityFieldTypes("contacts");
  await ensureContactDetailPicklistBindings();
}

/** Force Contact Details Edit Layout to the two-column card when missing new fields. */
export async function ensureContactDetailLayout(): Promise<FieldLayout> {
  const next = contactCardLayout();
  const rows = await loadSavedLayoutRows("contacts").catch(() => []);
  const preferred = MODULE_LAYOUT_LINE;
  const picked = pickSavedModuleLayout(rows, "contacts", preferred);
  // Agency-saved layouts win. Empty right = Classic (Dense) one-column — never reseed Card.
  if (!picked) {
    await saveLayoutForModule("contacts", next);
    return next;
  }
  return picked;
}

/** True when business_name and phone sit in the same layout column (feel-pass bug). */
function businessNamePhoneSameColumn(layout: FieldLayout | null | undefined): boolean {
  if (!layout?.columns?.length) return false;
  let nameCol = -1;
  let phoneCol = -1;
  layout.columns.forEach((column, index) => {
    const keys = new Set(column.sections.flatMap((section) => section.fieldKeys));
    if (keys.has("business_name")) nameCol = index;
    if (keys.has("phone")) phoneCol = index;
  });
  if (nameCol < 0 || phoneCol < 0) return false;
  return nameCol === phoneCol;
}

/**
 * One-time feel migrate: move phone to the opposite column from business_name.
 * Preserves every other agency section/field — never re-injects deleted sections
 * (e.g. CRM Notes) from the stock default.
 */
export function migrateBusinessPhoneOppositeColumn(layout: FieldLayout): FieldLayout {
  if (!businessNamePhoneSameColumn(layout)) return layout;
  const moveKeys = ["phone", "email", "website"] as const;
  const columns = layout.columns.map((column) => ({
    ...column,
    sections: column.sections.map((section) => ({
      ...section,
      fieldKeys: [...section.fieldKeys],
    })),
  }));
  let nameCol = 0;
  columns.forEach((column, index) => {
    if (column.sections.some((section) => section.fieldKeys.includes("business_name"))) {
      nameCol = index;
    }
  });
  const phoneCol = nameCol === 0 ? 1 : 0;
  while (columns.length < 2) {
    columns.push({ id: columns.length === 0 ? "left" : "right", sections: [] });
  }
  const moving: string[] = [];
  const nameKeys = new Set(columns[nameCol].sections.flatMap((section) => section.fieldKeys));
  for (const key of moveKeys) {
    if (nameKeys.has(key)) moving.push(key);
  }
  if (!moving.includes("phone")) moving.unshift("phone");
  const drop = new Set(moving);
  for (const column of columns) {
    for (const section of column.sections) {
      section.fieldKeys = section.fieldKeys.filter((key) => !drop.has(key));
    }
    column.sections = column.sections.filter((section) => section.fieldKeys.length > 0);
  }
  const target = columns[phoneCol] ?? columns[1];
  const contact = target.sections.find((section) => section.id === "contact");
  if (contact) {
    for (const key of [...moving].reverse()) {
      if (!contact.fieldKeys.includes(key)) contact.fieldKeys.unshift(key);
    }
  } else {
    target.sections.unshift({ id: "contact", label: "Contact", fieldKeys: [...moving] });
  }
  return { columns };
}

/**
 * Business Edit Layout: seed stock default only when missing/broken or force=true.
 * Agency-saved layouts win — deleted sections/fields must stay deleted.
 * Does NOT re-merge default keys on every desk load (that brought CRM Notes back).
 * One-time feel migrate moves phone opposite business_name without clobbering the rest.
 */
export async function ensureBusinessDetailLayout(force = false): Promise<FieldLayout> {
  await ensureBusinessDetailPicklists().catch(() => null);
  const next = defaultLayoutForModule("businesses");
  const rows = await loadSavedLayoutRows("businesses").catch(() => []);
  const preferred = MODULE_LAYOUT_LINE;
  const picked = pickSavedModuleLayout(rows, "businesses", preferred);
  // Agency-saved layouts win. An empty right column can be intentional — do NOT
  // reseed stock (that re-injects CRM Notes). Only seed when missing or force.
  // Phone/name same-column is handled by migrate below (creates right if needed).
  if (force || !picked) {
    await saveLayoutForModule("businesses", next);
    return next;
  }
  // Classic (Dense) keeps an empty right on purpose — do not split phone into a second column.
  const oneCol = !(picked.columns[1]?.sections?.length);
  if (!oneCol && businessNamePhoneSameColumn(picked)) {
    const migrated = migrateBusinessPhoneOppositeColumn(picked);
    await saveLayoutForModule("businesses", migrated);
    return migrated;
  }
  return picked;
}


async function ensureTaskCatalogUpgrades() {
  const defaults = defaultFieldsForModule("tasks");
  const status = defaults.find((field) => field.key === "status");
  if (!status?.options?.length) return;
  const existing = await db
    .select()
    .from(deskCustomFields)
    .where(
      and(
        eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID),
        eq(deskCustomFields.module, "tasks"),
        eq(deskCustomFields.key, "status"),
      ),
    );
  const row = existing[0];
  if (!row) return;
  const opts = Array.isArray(row.options) ? (row.options as unknown[]) : [];
  if (opts.length > 0 && row.type === "picklist") return;
  await upsertFieldDef(status, "tasks");
}

export async function ensureModuleFieldCatalog(module: FieldLayoutModule) {
  if (module === "deals") {
    await ensureDealFieldCatalog();
    await ensureOccupationFieldBindings("deals");
    const rows = await db
      .select()
      .from(deskCustomFields)
      .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "deals")));
    return applyPicklists(rows.map(toFieldDef));
  }
  // Always seed any new module defaults — sparse catalogs from early tips stay incomplete otherwise.
  await insertMissingFields(module, defaultFieldsForModule(module));
  if (module === "leads") {
    await ensureLeadCatalogUpgrades();
    await ensureLeadInsuranceTypeOptions();
  }
  if (module === "contacts") await ensureContactCatalogUpgrades();
  if (module === "tasks") await ensureTaskCatalogUpgrades();
  if (module === "businesses") await ensureBusinessDetailPicklists().catch(() => null);
  await ensureOccupationFieldBindings(module);
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
      ...persistedOptionSetBinding(field),
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
        ...persistedOptionSetBinding(field),
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


async function migrateLeadLayouts(
  rows: { id: string; columns: unknown }[],
  picked: FieldLayout,
): Promise<FieldLayout> {
  if (!needsLeadLayoutMigration(picked)) return picked;
  const migrated = migrateLeadLayout(picked);
  for (const row of rows) {
    const parsed = parseLayout(row.columns);
    if (!needsLeadLayoutMigration(parsed)) continue;
    await db
      .update(deskFieldLayouts)
      .set({ columns: migrateLeadLayout(parsed), updatedAt: new Date() })
      .where(eq(deskFieldLayouts.id, row.id));
  }
  return migrated;
}

async function migrateAddressSections(
  module: FieldLayoutModule,
  rows: { id: string; columns: unknown }[],
  picked: FieldLayout,
): Promise<FieldLayout> {
  if (module !== "leads" && module !== "deals") return picked;
  if (!needsAddressSectionSplit(picked)) return picked;
  const split = splitInsuredMailingAddressSections(picked);
  for (const row of rows) {
    const parsed = parseLayout(row.columns);
    if (!needsAddressSectionSplit(parsed)) continue;
    await db
      .update(deskFieldLayouts)
      .set({ columns: splitInsuredMailingAddressSections(parsed), updatedAt: new Date() })
      .where(eq(deskFieldLayouts.id, row.id));
  }
  return split;
}

async function migrateDealParityLayouts(
  rows: { id: string; columns: unknown }[],
  picked: FieldLayout,
): Promise<FieldLayout> {
  if (!needsDealLayoutParity(picked)) return picked;
  const migrated = migrateDealLayoutParity(picked);
  for (const row of rows) {
    const parsed = parseLayout(row.columns);
    if (!needsDealLayoutParity(parsed)) continue;
    await db
      .update(deskFieldLayouts)
      .set({ columns: migrateDealLayoutParity(parsed), updatedAt: new Date() })
      .where(eq(deskFieldLayouts.id, row.id));
  }
  return migrated;
}

async function migrateDealLandlordStrip(
  rows: { id: string; columns: unknown }[],
  picked: FieldLayout,
): Promise<FieldLayout> {
  if (!needsDealDetailsLandlordStrip(picked)) return picked;
  const stripped = stripDealDetailsLandlordFields(picked);
  for (const row of rows) {
    const parsed = parseLayout(row.columns);
    if (!needsDealDetailsLandlordStrip(parsed)) continue;
    await db
      .update(deskFieldLayouts)
      .set({ columns: stripDealDetailsLandlordFields(parsed), updatedAt: new Date() })
      .where(eq(deskFieldLayouts.id, row.id));
  }
  return stripped;
}

export async function loadLayoutForLine(line: string): Promise<FieldLayout> {
  return loadLayoutForModule("deals", line);
}

export async function saveLayoutForLine(line: string, layout: FieldLayout) {
  const lob = (LINES as readonly string[]).includes(line) ? line : "HO";
  const owned = withLayoutRevision(layout, AGENCY_LAYOUT_REVISION);
  await db
    .insert(deskFieldLayouts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module: "deals",
      lineOfBusiness: lob,
      columns: owned,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [deskFieldLayouts.tenantId, deskFieldLayouts.module, deskFieldLayouts.lineOfBusiness],
      set: { columns: owned, updatedAt: new Date() },
    });
}

/** MODULE ISOLATION: deals only. Never call from leads/contacts/etc. One layout → every deal LOB line. */
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
      if (module === "deals") {
        const dealLayout = await migratePackedDealLayouts(rows, picked);
        const withAddresses = await migrateAddressSections(module, rows, dealLayout);
        const withParity = await migrateDealParityLayouts(rows, withAddresses);
        return migrateDealLandlordStrip(rows, withParity);
      }
      // Tip sep7hk: carriers sparse seed still gets full catalog in Edit Layout.
      // Tip sep7jr: leads/contacts/etc keep agency removals — do not resurrect deleted fields.
      // Deals: migrateDealLayoutParity is one-time for pre-personal layouts only.
      if (module === "carriers") {
        const catalog = await listFieldDefs(module);
        return ensureLayoutIncludesCatalogFields(picked, catalog);
      }
      if (module === "leads") {
        const leadLayout = await migrateLeadLayouts(rows, picked);
        return migrateAddressSections(module, rows, leadLayout);
      }
      if (module === "contacts") {
        return ensureContactDetailLayout();
      }
      if (module === "businesses") {
        return ensureBusinessDetailLayout();
      }
      return picked;
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
  const owned = withLayoutRevision(layout, AGENCY_LAYOUT_REVISION);
  await db
    .insert(deskFieldLayouts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module,
      lineOfBusiness: MODULE_LAYOUT_LINE,
      columns: owned,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [deskFieldLayouts.tenantId, deskFieldLayouts.module, deskFieldLayouts.lineOfBusiness],
      set: { columns: owned, updatedAt: new Date() },
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
  leadCustom?: Record<string, string> | null,
) {
  const fields = await listDealFieldDefs().catch(() => CORE_FIELDS);
  let custom = leadCustom ?? null;
  if (!custom) {
    const leadId = (lead as { id?: string }).id;
    custom = leadId ? await loadRecordValues(leadId, "leads").catch(() => ({})) : {};
  }
  const values = dealValuesFromLead(lead, fields, carry, custom);
  if (Object.keys(values).length === 0) return;
  await writeRecordValues(dealId, values);
}

export async function loadModuleLayoutBundle(
  module: FieldLayoutModule,
  recordId?: string,
  line = "HO",
) {
  // Tip sep7gy: same ensure + layout pick as Edit Layout (line-aware for deals).
  await ensureFieldsForModule(module, line).catch(() => null);
  const [layout, fields, stored] = await Promise.all([
    loadLayoutForModule(module, line),
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
