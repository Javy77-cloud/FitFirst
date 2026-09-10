"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { db } from "@/lib/db";
import { deals, quoteSheets, risks } from "@/lib/db/schema";
import {
  deleteFieldDef,
  ensureFieldsForLine,
  listDealFieldDefs,
  listFieldDefs,
  loadLayoutForLine,
  loadLayoutForModule,
  loadRecordValues,
  saveLayoutForEveryLine,
  saveLayoutForLine,
  saveLayoutForModule,
  upsertFieldDef,
  writeRecordValues,
} from "@/lib/custom-fields/store";
import {
  fieldLayoutListHref,
  parseLayoutModule,
  type FieldLayoutModule,
} from "@/lib/custom-fields/modules";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import { applyModuleSystemValues } from "@/lib/custom-fields/record-system";
import {
  addFieldToSection,
  addSection,
  deleteSection,
  relabelSection,
  removeFieldFromLayout,
} from "@/lib/custom-fields/layout";
import {
  isCustomFieldType,
  parseLayout,
  slugifyFieldKey,
  type CustomFieldDef,
  type CustomFieldType,
} from "@/lib/custom-fields/types";
import { dealDetailsSavedHref } from "@/lib/flash";
import { flashAction } from "@/lib/flash-action";
import { coerceQuotingFormId, quotingFormById } from "@/lib/quoting/forms";
import { sheetProductForQuotingForm } from "@/lib/deals/deal-line";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function lineFrom(form: FormData) {
  return str(form, "line") || str(form, "lineOfBusiness") || "HO";
}

function moduleFrom(form: FormData): FieldLayoutModule {
  return parseLayoutModule(str(form, "module"));
}

function revalidateDealSurfaces(dealId?: string, line?: string, module: FieldLayoutModule = "deals") {
  revalidatePath("/settings/field-builder");
  revalidatePath(fieldLayoutListHref(module));
  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (line && module === "deals") revalidatePath("/deals");
}

export async function saveModuleRecordValues(formData: FormData) {
  const module = moduleFrom(formData);
  const recordId =
    str(formData, "recordId") ||
    str(formData, "dealId") ||
    str(formData, "leadId") ||
    str(formData, "contactId") ||
    str(formData, "accountId") ||
    str(formData, "policyId") ||
    str(formData, "carrierId");
  if (!recordId) throw new Error("Record could not be saved.");
  const defs = await listFieldDefs(module);
  const custom = customValuesFromForm(formData, defs);
  await writeRecordValues(recordId, custom, module);
  await applyModuleSystemValues(module, recordId, custom, defs);
  const href = `${fieldLayoutListHref(module)}/${recordId}`;
  revalidatePath("/settings/field-builder");
  revalidatePath(fieldLayoutListHref(module));
  revalidatePath(href);
  flashAction(href, `${module === "businesses" ? "Business" : module.slice(0, 1).toUpperCase() + module.slice(1)} saved`);
}

export async function saveDealFieldLayout(formData: FormData) {
  const line = lineFrom(formData);
  const module = moduleFrom(formData);
  const raw = str(formData, "layout");
  const layout = parseLayout(raw ? JSON.parse(raw) : {});
  const rawFields = str(formData, "fields");
  if (rawFields) {
    try {
      const incoming = JSON.parse(rawFields) as CustomFieldDef[];
      if (Array.isArray(incoming)) {
        for (const field of incoming) {
          if (!field?.key || !field.label || !isCustomFieldType(String(field.type))) continue;
          await upsertFieldDef(
            {
              key: field.key,
              label: field.label,
              type: field.type,
              options: field.options ?? [],
              formula: field.formula ?? null,
              lookupModule: field.lookupModule ?? null,
              systemKey: field.systemKey ?? null,
              required: Boolean(field.required),
              defaultValue: field.defaultValue ?? null,
              picklistId: field.picklistId ?? null,
              permissions: field.permissions,
            },
            module,
          );
        }
      }
    } catch {
      /* keep layout save even if field payload is stale */
    }
  }
  if (module === "deals") {
    await saveLayoutForEveryLine(layout);
  } else {
    await saveLayoutForModule(module, layout);
  }
  revalidateDealSurfaces(str(formData, "dealId") || undefined, line, module);
  if (module === "deals") {
    flashAction("/settings/field-builder", "layout-saved");
  } else {
    flashAction(fieldLayoutListHref(module), "home-layout-saved");
  }
}

export async function addDealLayoutSection(formData: FormData) {
  const line = lineFrom(formData);
  const columnId = str(formData, "columnId") || "left";
  const label = str(formData, "label") || "New section";
  await ensureFieldsForLine(line);
  const layout = addSection(await loadLayoutForLine(line), columnId, label);
  await saveLayoutForLine(line, layout);
  revalidateDealSurfaces(str(formData, "dealId") || undefined, line);
}

export async function relabelDealLayoutSection(formData: FormData) {
  const line = lineFrom(formData);
  const sectionId = str(formData, "sectionId");
  const label = str(formData, "label");
  if (!sectionId || !label) return;
  const layout = relabelSection(await loadLayoutForLine(line), sectionId, label);
  await saveLayoutForLine(line, layout);
  revalidateDealSurfaces(str(formData, "dealId") || undefined, line);
}

export async function deleteDealLayoutSection(formData: FormData) {
  const line = lineFrom(formData);
  const sectionId = str(formData, "sectionId");
  if (!sectionId) return;
  const layout = deleteSection(await loadLayoutForLine(line), sectionId);
  await saveLayoutForLine(line, layout);
  revalidateDealSurfaces(str(formData, "dealId") || undefined, line);
}

export async function addDealLayoutField(formData: FormData) {
  const line = lineFrom(formData);
  const sectionId = str(formData, "sectionId");
  const label = str(formData, "label") || "New field";
  const typeRaw = str(formData, "type") || "single_line";
  const type: CustomFieldType = isCustomFieldType(typeRaw) ? typeRaw : "single_line";
  const options = str(formData, "options")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const formula = str(formData, "formula") || null;
  let key = str(formData, "key") || slugifyFieldKey(label);
  const existing = await listDealFieldDefs();
  if (existing.some((field) => field.key === key) && !str(formData, "key")) {
    key = `${key}_${Date.now().toString(36).slice(-4)}`;
  }
  const field: CustomFieldDef = {
    key,
    label,
    type,
    options,
    formula,
    lookupModule: str(formData, "lookupModule") || null,
  };
  await upsertFieldDef(field);
  if (sectionId) {
    const layout = addFieldToSection(await loadLayoutForLine(line), sectionId, key);
    await saveLayoutForLine(line, layout);
  }
  revalidateDealSurfaces(str(formData, "dealId") || undefined, line);
}

export async function relabelDealLayoutField(formData: FormData) {
  const key = str(formData, "key");
  const label = str(formData, "label");
  if (!key || !label) return;
  const existing = (await listDealFieldDefs()).find((field) => field.key === key);
  if (!existing) return;
  await upsertFieldDef({ ...existing, label });
  revalidateDealSurfaces(str(formData, "dealId") || undefined, lineFrom(formData));
}

export async function deleteDealLayoutField(formData: FormData) {
  const line = lineFrom(formData);
  const module = moduleFrom(formData);
  const key = str(formData, "key");
  if (!key) return;
  // Tip sep7gt: Remove field persists immediately (not draft-only until Save).
  if (module === "deals") {
    const layout = removeFieldFromLayout(await loadLayoutForLine(line), key);
    await saveLayoutForEveryLine(layout);
    await deleteFieldDef(key, "deals");
  } else {
    const layout = removeFieldFromLayout(await loadLayoutForModule(module, line), key);
    await saveLayoutForModule(module, layout);
    await deleteFieldDef(key, module);
  }
  revalidateDealSurfaces(str(formData, "dealId") || undefined, line, module);
  flashAction("/settings/field-builder", "layout-saved");
}

export async function saveDealFieldValues(formData: FormData) {
  const dealId = str(formData, "dealId");
  if (!dealId) throw new Error("Deal details could not be saved.");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal details could not be saved.");
  const defs = await listDealFieldDefs();
  const custom: Record<string, string> = {};
  const system: Record<string, string> = {};
  for (const field of defs) {
    if (field.type === "formula") continue;
    const value = formData.has(`field_${field.key}`) ? String(formData.get(`field_${field.key}`) ?? "") : "";
    if (field.type === "multi_select") {
      custom[field.key] = formData
        .getAll(`field_${field.key}`)
        .map((item) => String(item))
        .filter(Boolean)
        .join(",");
      continue;
    }
    if (field.type === "checkbox") {
      custom[field.key] = formData.get(`field_${field.key}`) ? "true" : "";
      continue;
    }
    if (field.systemKey) system[field.systemKey] = value;
    custom[field.key] = value;
  }
  await writeRecordValues(dealId, custom);
  await applySystemDealValues(dealId, system);
  revalidatePath(`/deals/${dealId}`);
  const formId = coerceQuotingFormId(system.quotingForm);
  const form = formId ? quotingFormById(formId) : null;
  const product = formId ? sheetProductForQuotingForm(formId) : null;
  flashAction(
    dealDetailsSavedHref(dealId, {
      line: form?.shopLine || str(formData, "line"),
      product: product || str(formData, "product"),
    }),
    "deal-details-saved",
  );
}

async function applySystemDealValues(dealId: string, system: Record<string, string>) {
  const named = system.primaryNamedInsured?.trim();
  const notes = system.notes;
  const state = system.state?.trim();
  const formId = coerceQuotingFormId(system.quotingForm);
  const form = formId ? quotingFormById(formId) : null;
  const product = formId ? sheetProductForQuotingForm(formId) : null;
  await db
    .update(deals)
    .set({
      primaryNamedInsured: named || undefined,
      notes: notes ?? undefined,
      state: state || undefined,
      ...(form
        ? {
            quotingForm: form.id,
            quotingLine: form.shopLine,
            lineOfBusiness: form.lob,
            policySubType: product ?? undefined,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
  if (form && product) {
    let [sheet] = await db
      .select()
      .from(quoteSheets)
      .where(
        and(
          eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
          eq(quoteSheets.dealId, dealId),
          eq(quoteSheets.line, form.shopLine),
        ),
      );
    if (!sheet) {
      const [created] = await db
        .insert(quoteSheets)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          line: form.shopLine,
          values: emptySheetValues(form.shopLine, product),
        })
        .returning();
      sheet = created;
    }
    if (sheet) {
      await db
        .update(quoteSheets)
        .set({
          values: {
            ...sheet.values,
            sheet_product: { value: product, status: "confirmed", source: "agent" },
          },
          updatedAt: new Date(),
        })
        .where(eq(quoteSheets.id, sheet.id));
    }
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (risk) {
    await db
      .update(risks)
      .set({
        address1: system.mailingAddress || risk.address1,
        city: system.city || risk.city,
        state: system.state || risk.state,
        zip: system.zip || risk.zip,
        updatedAt: new Date(),
      })
      .where(eq(risks.id, risk.id));
  }
}

export async function uploadDealFieldImage(formData: FormData) {
  const dealId = str(formData, "dealId");
  const key = str(formData, "key");
  const file = formData.get("file");
  if (!dealId || !key || !(file instanceof File) || file.size === 0) {
    throw new Error("Image could not be uploaded.");
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const buffer = Buffer.from(await file.arrayBuffer());
  const doc = await persistFile({
    dealId,
    riskId: risk?.id ?? null,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
    docType: "other",
    slot: "source_doc",
  });
  const current = await loadRecordValues(dealId);
  await writeRecordValues(dealId, { ...current, [key]: doc.id });
  revalidatePath(`/deals/${dealId}`);
  flashAction(`/deals/${dealId}`, "image-uploaded");
}
