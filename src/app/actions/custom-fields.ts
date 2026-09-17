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
  fieldBuilderHref,
  fieldLayoutListHref,
  parseLayoutModule,
  requireLayoutModule,
  type FieldLayoutModule,
} from "@/lib/custom-fields/modules";
import { addressVerifyValuesFromForm } from "@/lib/address/verify-state";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import {
  HAS_CO_APPLICANT_KEY,
  normalizeHasCoApplicantFlag,
} from "@/lib/custom-fields/co-applicant-fields";
import {
  MAILING_SAME_AS_INSURED_KEY,
  normalizeMailingSameFlag,
} from "@/lib/custom-fields/mailing-same";
import { applyModuleSystemValues } from "@/lib/custom-fields/record-system";
import {
  addFieldToSection,
  addSection,
  deleteSection,
  relabelSection,
  removeFieldFromLayout,
  removeFieldOccurrence,
  layoutContainsFieldKey,
} from "@/lib/custom-fields/layout";
import { canonicalizeIdentityField } from "@/lib/custom-fields/identity-field";
import { layoutWithoutDealDetailsLandlord } from "@/lib/custom-fields/deal-details-landlord";
import {
  allLayoutFieldKeys,
  isCustomFieldType,
  parseLayout,
  slugifyFieldKey,
  type CustomFieldDef,
  type CustomFieldType,
} from "@/lib/custom-fields/types";
import { persistDealWorkTab } from "@/lib/deals/work-tab";
import { dealListCascadeSyncValues, pipelineFamilyFromDeal } from "@/lib/deals/insurance-cascade";
import { allowLifeHealthFamily } from "@/lib/desk/line-settings";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { dealDetailsSavedHref } from "@/lib/flash";
import { flashAction } from "@/lib/flash-action";
import { coerceQuotingFormId, quotingFormById } from "@/lib/quoting/forms";
import { resolveDealProduct, sheetProductForQuotingForm } from "@/lib/deals/deal-line";
import { isPcPackageLine, mergeShopLinesKeepExisting } from "@/lib/deals/package-lines";
import { formatDealPersonName, formatDealTitle } from "@/lib/deals/deal-title";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function lineFrom(form: FormData) {
  return str(form, "line") || str(form, "lineOfBusiness") || "HO";
}

function moduleFrom(form: FormData): FieldLayoutModule {
  // Mutations must name the module explicitly — blank must not fall through to deals.
  return requireLayoutModule(str(form, "module"));
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
  const custom = {
    ...customValuesFromForm(formData, defs),
    ...addressVerifyValuesFromForm(formData),
  };
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
            canonicalizeIdentityField({
              key: field.key,
              label: field.label,
              type: field.type,
              options: field.options ?? [],
              optionColors: field.optionColors,
              formula: field.formula ?? null,
              lookupModule: field.lookupModule ?? null,
              systemKey: field.systemKey ?? null,
              required: Boolean(field.required),
              defaultValue: field.defaultValue ?? null,
              picklistId: field.picklistId ?? null,
              permissions: field.permissions,
            }),
            module,
          );
        }
      }
    } catch {
      /* keep layout save even if field payload is stale */
    }
  }
  if (module === "deals") {
    // Deals only: one layout mirrored to every LOB line — never call this for leads/etc.
    // Landlord/rental keys stay off Details even if an older editor payload still has them.
    await saveLayoutForEveryLine(layoutWithoutDealDetailsLandlord(layout));
  } else {
    await saveLayoutForModule(module, layout);
  }
  revalidateDealSurfaces(str(formData, "dealId") || undefined, line, module);
  if (module === "deals") {
    flashAction(fieldBuilderHref(module, line), "layout-saved");
  } else {
    flashAction(fieldBuilderHref(module, line), "layout-saved");
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
  const sectionId = str(formData, "sectionId");
  if (!key) return;
  // Tip sep7gu: Remove = layout-only first. Catalog delete is best-effort
  // (system/CORE keys get re-ensured; FK errors must not undo layout remove).
  // When sectionId is set, remove only that one slot so duplicate keys elsewhere stay.
  if (module === "deals") {
    const current = await loadLayoutForLine(line);
    const layout = sectionId
      ? removeFieldOccurrence(current, sectionId, key)
      : removeFieldFromLayout(current, key);
    await saveLayoutForEveryLine(layout);
    if (!layoutContainsFieldKey(layout, key)) {
      try {
        await deleteFieldDef(key, "deals");
      } catch {
        /* layout already saved */
      }
    }
  } else {
    const current = await loadLayoutForModule(module, line);
    const layout = sectionId
      ? removeFieldOccurrence(current, sectionId, key)
      : removeFieldFromLayout(current, key);
    await saveLayoutForModule(module, layout);
    if (!layoutContainsFieldKey(layout, key)) {
      try {
        await deleteFieldDef(key, module);
      } catch {
        /* layout already saved */
      }
    }
  }
  revalidateDealSurfaces(str(formData, "dealId") || undefined, line, module);
  flashAction(fieldBuilderHref(module, line), "layout-saved");
}

export async function saveDealFieldValues(formData: FormData) {
  const dealId = str(formData, "dealId");
  if (!dealId) throw new Error("Deal details could not be saved.");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal details could not be saved.");
  const defs = await listDealFieldDefs();
  // Details is a partial form: persist fields the form actually posted (and
  // unchecked layout checkboxes). List-only catalog fields (Priority
  // picklist_8mus, Selling Agency, Pipeline, …) must not be wiped to "" when
  // they were never on this form.
  const line = str(formData, "line") || deal.lineOfBusiness || "HO";
  const layout = await loadLayoutForModule("deals", line);
  const layoutKeys = new Set(allLayoutFieldKeys(layout));
  const defsOnDetails = defs.filter((field) => {
    if (formData.has(`field_${field.key}`)) return true;
    return field.type === "checkbox" && layoutKeys.has(field.key);
  });
  const custom = {
    ...customValuesFromForm(formData, defsOnDetails),
    ...addressVerifyValuesFromForm(formData),
  };
  // Co-applicant switch is UI-owned (not a layout field row). Always persist when posted.
  if (formData.has(`field_${HAS_CO_APPLICANT_KEY}`)) {
    custom[HAS_CO_APPLICANT_KEY] = normalizeHasCoApplicantFlag(
      formData.get(`field_${HAS_CO_APPLICANT_KEY}`),
    );
  }
  if (formData.has(`field_${MAILING_SAME_AS_INSURED_KEY}`)) {
    custom[MAILING_SAME_AS_INSURED_KEY] = normalizeMailingSameFlag(
      formData.get(`field_${MAILING_SAME_AS_INSURED_KEY}`),
    );
  }
  Object.assign(
    custom,
    dealListCascadeSyncValues({
      insuranceType: custom.insurance_type,
      insuranceSubtype: custom.insurance_subtype,
    }),
  );
  const system: Record<string, string> = {};
  for (const field of defsOnDetails) {
    if (!field.systemKey) continue;
    if (Object.prototype.hasOwnProperty.call(custom, field.key)) {
      system[field.systemKey] = custom[field.key];
    }
  }
  const pipelineFamily = str(formData, "pipelineFamily");
  if (pipelineFamily) system.pipelineFamily = pipelineFamily;
  if (Object.keys(custom).length) {
    await writeRecordValues(dealId, custom);
  }
  if (Object.keys(system).length) {
    await applySystemDealValues(dealId, system);
  }
  await persistDealWorkTab(dealId, "details").catch(() => null);
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  revalidatePath("/pipeline");
  const formId = coerceQuotingFormId(system.quotingForm);
  const form = formId ? quotingFormById(formId) : null;
  const familyFlash = String(system.pipelineFamily ?? "").trim().toLowerCase();
  const product =
    (formId ? sheetProductForQuotingForm(formId) : null) ||
    sheetProductForQuotingForm(system.quotingForm) ||
    (familyFlash === "life"
      ? "life"
      : familyFlash === "health"
        ? "health"
        : null);
  const flashLine =
    form?.shopLine ||
    (familyFlash === "life" ? "life" : familyFlash === "health" ? "health" : null) ||
    str(formData, "line");
  flashAction(
    dealDetailsSavedHref(dealId, {
      line: flashLine,
      product: product || str(formData, "product"),
    }),
    "deal-details-saved",
  );
}

export async function applySystemDealValues(dealId: string, system: Record<string, string>) {
  const [existing] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!existing) return;

  const firstName = (system.firstName ?? "").trim();
  const lastName = (system.lastName ?? "").trim();
  const fromApplicant = formatDealPersonName(firstName, lastName);
  // Named-insured field if present; else rebuild from Deal Details first/last.
  // Do not keep a stale convert-time insured name when applicant fields changed.
  const namedExplicit = (system.primaryNamedInsured ?? "").trim();
  const named = namedExplicit || fromApplicant || existing.primaryNamedInsured || undefined;

  const notes = system.notes;
  const state = system.state?.trim();
  const rawSubtype = system.quotingForm?.trim() ?? "";
  const formId = coerceQuotingFormId(rawSubtype);
  const form = formId ? quotingFormById(formId) : null;
  const product = formId ? sheetProductForQuotingForm(formId) : null;
  const familyRaw = String(system.pipelineFamily ?? "").trim().toLowerCase();
  const fromSubtypeProduct = sheetProductForQuotingForm(rawSubtype);
  // Cascade may still post pipelineFamily=pc while subtype is Term Life — trust subtype.
  const requestedFamily =
    familyRaw === "life" || familyRaw === "health"
      ? familyRaw
      : fromSubtypeProduct === "life"
        ? "life"
        : fromSubtypeProduct === "health"
          ? "health"
          : familyRaw;
  const settings = await loadDeskLineSettings();
  const existingFamily = pipelineFamilyFromDeal({ lineOfBusiness: existing.lineOfBusiness });
  const family = allowLifeHealthFamily(requestedFamily, existingFamily, settings);

  const nextLine =
    form?.lob ||
    (rawSubtype
      ? family === "life"
        ? "LIFE"
        : family === "health"
          ? "HEALTH"
          : existing.lineOfBusiness
      : existing.lineOfBusiness);

  // Always recompute title from THIS deal's applicant/insured fields + LOB.
  // Omit contact/lead so a linked lead name cannot freeze or overwrite the title.
  // leadId / contactId are intentionally not touched.
  const title = formatDealTitle({
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    primaryNamedInsured: named,
    accountName: !firstName && !lastName ? named : undefined,
    existingTitle: existing.title,
    line: nextLine,
    quotingForm: form?.id ?? (rawSubtype || undefined),
    policySubType: form?.label ?? (rawSubtype || undefined),
  });

  const lifeHealthLine =
    family === "life" ? "life" : family === "health" ? "health" : null;
  const lifeHealthLob =
    family === "life" ? "LIFE" : family === "health" ? "HEALTH" : null;

  await db
    .update(deals)
    .set({
      primaryNamedInsured: named || undefined,
      title,
      notes: notes ?? undefined,
      state: state || undefined,
      ...(form
        ? {
            quotingForm: form.id,
            quotingLine: form.shopLine,
            lineOfBusiness: form.lob,
            // Tip sep7gv: store human subtype label (HO3), not sheet product id.
            policySubType: form.label,
            ...(isPcPackageLine(form.shopLine)
              ? { shopLines: mergeShopLinesKeepExisting(existing.shopLines, [form.shopLine]) }
              : {}),
          }
        : rawSubtype
          ? {
              // Life/Health freeform subtype — store label as quotingForm too.
              quotingForm: rawSubtype,
              policySubType: rawSubtype,
              ...(lifeHealthLob
                ? { lineOfBusiness: lifeHealthLob, quotingLine: lifeHealthLine! }
                : {}),
            }
          : {}),
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));

  const sheetProduct =
    product ||
    (lifeHealthLine
      ? resolveDealProduct({
          quotingForm: rawSubtype || null,
          policySubType: rawSubtype || null,
          lineOfBusiness: lifeHealthLob,
          quotingLine: lifeHealthLine,
        })
      : null);
  const sheetLine = form?.shopLine || lifeHealthLine || null;
  if (sheetLine && sheetProduct) {
    let [sheet] = await db
      .select()
      .from(quoteSheets)
      .where(
        and(
          eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
          eq(quoteSheets.dealId, dealId),
          eq(quoteSheets.line, sheetLine),
        ),
      );
    if (!sheet) {
      const [created] = await db
        .insert(quoteSheets)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          line: sheetLine,
          values: emptySheetValues(sheetLine, sheetProduct),
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
            sheet_product: { value: sheetProduct, status: "confirmed", source: "agent" },
            quoting_form: {
              value: form?.id ?? rawSubtype ?? sheetProduct,
              status: "confirmed",
              source: "agent",
            },
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
