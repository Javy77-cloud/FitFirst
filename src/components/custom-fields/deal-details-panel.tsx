"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { saveDealFieldValues, uploadDealFieldImage } from "@/app/actions/custom-fields";
import { FieldControl } from "@/components/custom-fields/field-control";
import { InsuranceCascadeControl } from "@/components/custom-fields/insurance-cascade-control";
import { LayoutSectionFieldGrid } from "@/components/custom-fields/layout-section-field-grid";
import { LayoutSectionHeader } from "@/components/custom-fields/layout-section-header";
import { buttonVariants } from "@/components/ui/button";
import { mergeCascadePrefill, type PipelineFamily } from "@/lib/deals/insurance-cascade";
import type { DealProductId } from "@/lib/deals/deal-products";
import {
  isSharedDealSection,
  layoutForDealDetails,
  usesBusinessIdentityDetails,
} from "@/lib/deals/product-layout";
import { BUSINESS_IDENTITY_FIELDS } from "@/lib/custom-fields/business-identity-fields";
import type { DeskLineSettings } from "@/lib/desk/line-settings";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { parseLayout, sectionDensityOf, type CustomFieldDef, type FieldLayout } from "@/lib/custom-fields/types";
import { isPipelineStripSection } from "@/lib/custom-fields/insurance-quote-section";
import {
  CO_APPLICANT_SECTION_ID,
  HAS_CO_APPLICANT_KEY,
  isCoApplicantEnabled,
} from "@/lib/custom-fields/co-applicant-fields";
import {
  isIndustryCascadeParent,
  occupationValueAfterIndustryChange,
} from "@/lib/custom-fields/industry-occupation";
import { isDuplicateDealDetailsField } from "@/lib/custom-fields/deal-details-dedupe";
import {
  DEAL_SELLING_AGENCY_FIELD,
  DEAL_SELLING_AGENCY_KEY,
  defaultSellingAgencyValue,
  isSellingAgencyFieldKey,
} from "@/lib/deals/selling-agency";
import { isDealDetailsLandlordFieldKey } from "@/lib/custom-fields/deal-details-landlord";
import { isDealPreferencesSection } from "@/lib/custom-fields/contact-parity-fields";
import { MailingSameSwitch } from "@/components/custom-fields/mailing-same-switch";
import {
  MAILING_SAME_AS_INSURED_KEY,
  isMailingAddressFieldKey,
  isMailingAddressSection,
  isMailingSameAsInsured,
  isPreviousAddressFieldKey,
  shouldShowPreviousAddressFields,
} from "@/lib/custom-fields/mailing-same";
import { asList } from "@/lib/safe-list";
import { InsuredPropertyKindControl } from "@/components/deal/insured-property-kind-control";
import { INSURED_PROPERTY_KIND_KEY } from "@/lib/deals/insured-property-kind";
import { MhoDetailsSection } from "@/components/custom-fields/mho-details-section";
import { dealPolicyFormIsMho } from "@/lib/custom-fields/mho-details-fields";
import {
  dwellingDetailsFieldLabel,
  dwellingDetailsSectionLabel,
  isDwellingFireProduct,
} from "@/lib/deals/dwelling-addresses";

/** Image upload must not be a nested <form> inside Deal Details save. */
function DealFieldImageUpload({ dealId, fieldKey }: { dealId: string; fieldKey: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2" data-ff-deal-field-image="">
      <input
        type="file"
        accept="image/*"
        className="text-xs"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const body = new FormData();
          body.set("dealId", dealId);
          body.set("key", fieldKey);
          body.set("file", file);
          start(async () => {
            await uploadDealFieldImage(body);
          });
        }}
      />
      {pending ? <span className="text-xs text-muted-foreground">Uploading…</span> : null}
    </div>
  );
}

function skipOwnedInsuranceField(
  key: string,
  field: CustomFieldDef,
  sectionKeys: readonly string[],
  fieldList: CustomFieldDef[],
): boolean {
  const layoutHasType =
    sectionKeys.includes("insurance_type") || fieldList.some((item) => item.key === "insurance_type");
  return (
    layoutHasType &&
    (key === "pipeline" ||
      key === "insurance_category" ||
      key === "insurance_subtype" ||
      isSellingAgencyFieldKey(key) ||
      field.systemKey === "quotingForm")
  );
}

function CoApplicantDealSection({
  sectionLabel,
  density,
  fieldKeys,
  byKey,
  values,
  fieldList,
  formId,
  pipelineFamily,
  quotingForm,
  policySubType,
  lifeHealthOptions,
  lifeOptions,
  healthOptions,
  dealId,
  packageLines = [],
  activePackageLine = null,
  lineSettings,
  onValueChange,
  onValuesPatch,
}: {
  sectionLabel: string;
  density?: unknown;
  fieldKeys: string[];
  byKey: Record<string, CustomFieldDef>;
  values: Record<string, string>;
  fieldList: CustomFieldDef[];
  formId: string;
  pipelineFamily: PipelineFamily;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
  lifeOptions?: Array<{ slug?: string; label: string }>;
  healthOptions?: Array<{ slug?: string; label: string }>;
  dealId: string;
  packageLines?: readonly string[];
  activePackageLine?: string | null;
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  onValueChange?: (key: string, value: string) => void;
  onValuesPatch?: (parts: Record<string, string>) => void;
}) {
  const initialOn = useMemo(() => isCoApplicantEnabled(values), [values]);
  const [enabled, setEnabled] = useState(initialOn);
  const visibleKeys = fieldKeys.filter((key) => {
    if (key === HAS_CO_APPLICANT_KEY) return false;
    const field = byKey[key] ?? { key, label: key, type: "single_line" as const };
    return !skipOwnedInsuranceField(key, field, fieldKeys, fieldList);
  });

  return (
    <section
      className="ff-card space-y-2 p-3"
      data-ff-deal-section={CO_APPLICANT_SECTION_ID}
      data-ff-co-applicant-enabled={enabled ? "1" : "0"}
    >
      <LayoutSectionHeader
        title={sectionLabel}
        action={
          <label
            className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-navy"
            data-ff-co-applicant-switch=""
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[#002868]"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              aria-label="Has co-applicant"
            />
            <span>{enabled ? "Has co-applicant" : "No co-applicant"}</span>
          </label>
        }
      />
      <input
        type="hidden"
        name={`field_${HAS_CO_APPLICANT_KEY}`}
        form={formId}
        value={enabled ? "true" : "false"}
      />
      {enabled ? (
        <LayoutSectionFieldGrid
          density={sectionDensityOf({ density })}
          keys={visibleKeys}
          fieldOf={(key) => byKey[key]}
          renderField={(key) => (
            <DealDetailsField
              fieldKey={key}
              field={byKey[key] ?? { key, label: key, type: "single_line" as const }}
              values={values}
              formId={formId}
              pipelineFamily={pipelineFamily}
              quotingForm={quotingForm}
              policySubType={policySubType}
              lifeHealthOptions={lifeHealthOptions}
              lifeOptions={lifeOptions}
              healthOptions={healthOptions}
              dealId={dealId}
              packageLines={packageLines}
              activePackageLine={activePackageLine}
              lineSettings={lineSettings}
              onValueChange={onValueChange}
              onValuesPatch={onValuesPatch}
            />
          )}
        />
      ) : null}
    </section>
  );
}

function DealDetailsField({
  fieldKey,
  field,
  values,
  formId,
  pipelineFamily,
  quotingForm,
  policySubType,
  lifeHealthOptions,
  lifeOptions,
  healthOptions,
  dealId,
  packageLines = [],
  activePackageLine = null,
  lineSettings,
  onValueChange,
  onValuesPatch,
  dwellingFire = false,
}: {
  fieldKey: string;
  field: CustomFieldDef;
  values: Record<string, string>;
  formId: string;
  pipelineFamily: PipelineFamily;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
  lifeOptions?: Array<{ slug?: string; label: string }>;
  healthOptions?: Array<{ slug?: string; label: string }>;
  dealId: string;
  packageLines?: readonly string[];
  activePackageLine?: string | null;
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  onValueChange?: (key: string, value: string) => void;
  onValuesPatch?: (parts: Record<string, string>) => void;
  dwellingFire?: boolean;
}) {
  if (fieldKey === INSURED_PROPERTY_KIND_KEY) {
    return (
      <div className="space-y-1" data-ff-deal-field={fieldKey}>
        <InsuredPropertyKindControl
          dealId={dealId}
          value={values[fieldKey]}
          product={policySubType || quotingForm}
          quotingForm={quotingForm}
          sheetUsage={values.usage}
          occupancy={values.occupancy}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1" data-ff-deal-field={fieldKey}>
      {fieldKey === "insurance_type" ? null : (
        <label className="text-xs font-medium text-navy" htmlFor={`field_${fieldKey}`}>
          {dwellingDetailsFieldLabel(fieldKey, dwellingFire === true, field.label)}
        </label>
      )}
      <FieldControl
        field={field}
        value={values[fieldKey] ?? ""}
        values={values}
        name={`field_${fieldKey}`}
        form={formId}
        pipelineFamily={pipelineFamily}
        quotingForm={quotingForm}
        policySubType={policySubType}
        lifeHealthOptions={lifeHealthOptions}
        lifeOptions={lifeOptions}
        healthOptions={healthOptions}
        packageLines={packageLines}
        activePackageLine={activePackageLine}
        lineSettings={lineSettings}
        onValueChange={(next) => onValueChange?.(fieldKey, next)}
        onAddressFill={(parts) => onValuesPatch?.(parts)}
      />
      {field.type === "image" ? <DealFieldImageUpload dealId={dealId} fieldKey={fieldKey} /> : null}
    </div>
  );
}

function SellingAgencyStripField({
  field,
  value,
  formId,
  onValueChange,
}: {
  field: CustomFieldDef;
  value: string;
  formId: string;
  onValueChange: (next: string) => void;
}) {
  const empty = !value.trim();
  return (
    <label
      className="mt-3 block text-xs font-medium text-red-700"
      data-ff-required-field="selling-agency"
      htmlFor={`field_${DEAL_SELLING_AGENCY_KEY}`}
    >
      Selling agency{" "}
      <span aria-hidden="true">*</span>
      <select
        id={`field_${DEAL_SELLING_AGENCY_KEY}`}
        name={`field_${DEAL_SELLING_AGENCY_KEY}`}
        form={formId}
        required
        aria-required
        aria-invalid={empty || undefined}
        aria-label="Selling agency"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={`mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm text-navy ${
          empty ? "border-red-600" : "border-border"
        }`}
        data-ff-picklist={DEAL_SELLING_AGENCY_KEY}
        data-ff-selling-agency=""
      >
        <option value="">Select</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {value && !(field.options ?? []).includes(value) ? (
          <option value={value}>{value}</option>
        ) : null}
      </select>
    </label>
  );
}

export function DealDetailsPanel({
  dealId,
  line,
  layout,
  fields,
  values,
  pipelineFamily = "pc",
  quotingForm,
  policySubType,
  lifeHealthOptions = [],
  lifeOptions = [],
  healthOptions = [],
  packageLines = [],
  activePackageLine = null,
  activeProduct = null,
  productInstance = null,
  accountKind = null,
  dealProducts = [],
  lineSettings,
}: {
  dealId: string;
  line: string;
  layout: FieldLayout;
  fields: CustomFieldDef[];
  values: Record<string, string>;
  pipelineFamily?: PipelineFamily;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
  lifeOptions?: Array<{ slug?: string; label: string }>;
  healthOptions?: Array<{ slug?: string; label: string }>;
  packageLines?: readonly string[];
  activePackageLine?: string | null;
  activeProduct?: DealProductId | null;
  /** Shop product instance key (`homeowners`, `homeowners~88uvyj`). */
  productInstance?: string | null;
  accountKind?: string | null;
  dealProducts?: readonly string[];
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
}) {
  const commercial = usesBusinessIdentityDetails({
    accountKind,
    products: dealProducts,
    product: activeProduct,
  });
  const safeLayout = layoutForDealDetails(parseLayout(layout), {
    product: activeProduct,
    accountKind,
    products: dealProducts,
  });
  const fieldList = resolveLayoutFields(
    safeLayout,
    [
      ...(commercial ? [...asList(fields), ...BUSINESS_IDENTITY_FIELDS] : asList(fields)),
      ...(!asList(fields).some((field) => field.key === DEAL_SELLING_AGENCY_KEY)
        ? [DEAL_SELLING_AGENCY_FIELD]
        : []),
    ],
  );
  const byKey = Object.fromEntries(fieldList.map((field) => [field.key, field]));
  const formId = "deal-details-save";
  const [policyForm, setPolicyForm] = useState(
    () => quotingForm || policySubType || values.insurance_subtype || "",
  );
  const showMho = dealPolicyFormIsMho(policyForm);
  const [liveValues, setLiveValues] = useState(() => {
    const merged = mergeCascadePrefill(values, {
      shopProducts: dealProducts,
      quotingForm,
      policySubType,
    });
    const selling =
      merged[DEAL_SELLING_AGENCY_KEY] ||
      defaultSellingAgencyValue((byKey[DEAL_SELLING_AGENCY_KEY] ?? DEAL_SELLING_AGENCY_FIELD).options);
    return selling ? { ...merged, [DEAL_SELLING_AGENCY_KEY]: selling } : merged;
  });
  const dwellingFire = isDwellingFireProduct(
    policyForm,
    liveValues.insurance_subtype,
    quotingForm,
    policySubType,
    activeProduct,
  );
  const layoutKeySet = new Set(
    asList(safeLayout.columns).flatMap((column) =>
      asList(column.sections).flatMap((section) => asList(section.fieldKeys)),
    ),
  );
  const seenFieldKeys = new Set<string>();

  function patchValue(key: string, next: string) {
    setLiveValues((prev) => {
      const updated: Record<string, string> = { ...prev, [key]: next };
      if (isIndustryCascadeParent(key)) {
        const child = key.replace(/_industry$/, "_occupation");
        updated[child] = occupationValueAfterIndustryChange(next, updated[child]);
      }
      return updated;
    });
  }

  function patchValues(parts: Record<string, string>) {
    setLiveValues((prev) => {
      const updated: Record<string, string> = { ...prev };
      for (const [key, next] of Object.entries(parts)) {
        if (!key || !next) continue;
        updated[key] = next;
        if (isIndustryCascadeParent(key)) {
          const child = key.replace(/_industry$/, "_occupation");
          updated[child] = occupationValueAfterIndustryChange(next, updated[child]);
        }
      }
      return updated;
    });
  }

  return (
    <div
      data-ff-deal-details
      data-ff-pipeline-family={pipelineFamily}
      data-ff-deal-details-kind={commercial ? "commercial" : "personal"}
      data-ff-dwelling-fire={dwellingFire ? "1" : "0"}
    >
      <form action={saveDealFieldValues} id={formId} data-ff-deal-details-form="">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="pipelineFamily" value={pipelineFamily} />
        {productInstance ? <input type="hidden" name="productInstance" value={productInstance} /> : null}
        {activePackageLine ? <input type="hidden" name="activePackageLine" value={activePackageLine} /> : null}
      <section
        className="mb-3 rounded-md border border-border/70 bg-background p-3"
        data-ff-deal-section="pipeline"
        data-ff-pipeline-strip=""
      >
        <LayoutSectionHeader title="Pipeline" />
        <InsuranceCascadeControl
          typeName="field_insurance_type"
          categoryName="field_insurance_category"
          subtypeName="field_insurance_subtype"
          form={formId}
          family={pipelineFamily}
          typeValue={liveValues.insurance_type || ""}
          categoryValue={liveValues.insurance_category || ""}
          value={liveValues.insurance_subtype || policySubType || quotingForm || ""}
          quotingForm={quotingForm}
          policySubType={policySubType || liveValues.insurance_subtype || ""}
          lifeOptions={lifeOptions}
          healthOptions={healthOptions}
          lifeHealthOptions={lifeHealthOptions}
          required
          packageLines={packageLines}
          activePackageLine={activePackageLine}
          lineSettings={lineSettings}
          variant="strip"
          onPolicyFormChange={setPolicyForm}
        />
        <SellingAgencyStripField
          field={byKey[DEAL_SELLING_AGENCY_KEY] ?? DEAL_SELLING_AGENCY_FIELD}
          value={
            liveValues[DEAL_SELLING_AGENCY_KEY] ||
            defaultSellingAgencyValue((byKey[DEAL_SELLING_AGENCY_KEY] ?? DEAL_SELLING_AGENCY_FIELD).options)
          }
          formId={formId}
          onValueChange={(next) => patchValue(DEAL_SELLING_AGENCY_KEY, next)}
        />
      </section>
      <div
        className="grid grid-cols-2 gap-4 max-[699px]:grid-cols-1"
        data-ff-deal-details-layout="two-col"
      >
        {asList(safeLayout.columns).map((column) => {
          let mhoPlacedInColumn = false;
          const isRightColumn = column.id === "right";
          return (
          <div key={column.id} className="min-w-0 space-y-3" data-ff-deal-details-col={column.id}>
            {asList(column.sections).map((section) => {
              if (isPipelineStripSection(section)) return null;
              if (isDealPreferencesSection(section)) return null;
              const sectionKeys = asList(section.fieldKeys).filter((key) => {
                if (isDealDetailsLandlordFieldKey(key)) return false;
                if (isDuplicateDealDetailsField(key, layoutKeySet, seenFieldKeys)) return false;
                seenFieldKeys.add(key);
                return true;
              });
              const isCoAppSection =
                section.id === CO_APPLICANT_SECTION_ID ||
                sectionKeys.includes("co_applicant_first_name");
              if (!isCoAppSection && sectionKeys.length === 0) return null;
              if (isCoAppSection) {
                // MHO Manufactured home sits under co-applicant on the right.
                // Collapsed co-app keeps MHO tight under the header; expanded pushes it down.
                const placeMhoHere = showMho && isRightColumn;
                if (placeMhoHere) mhoPlacedInColumn = true;
                return (
                  <Fragment key={section.id}>
                    <CoApplicantDealSection
                      sectionLabel={section.label}
                      density={section.density}
                      fieldKeys={sectionKeys}
                      byKey={byKey}
                      values={liveValues}
                      fieldList={fieldList}
                      formId={formId}
                      pipelineFamily={pipelineFamily}
                      quotingForm={quotingForm}
                      policySubType={policySubType}
                      lifeHealthOptions={lifeHealthOptions}
                      lifeOptions={lifeOptions}
                      healthOptions={healthOptions}
                      dealId={dealId}
                      packageLines={packageLines}
                      activePackageLine={activePackageLine}
                      lineSettings={lineSettings}
                      onValueChange={patchValue}
                      onValuesPatch={patchValues}
                    />
                    {placeMhoHere ? (
                      <MhoDetailsSection
                        values={liveValues}
                        formId={formId}
                        onValueChange={patchValue}
                      />
                    ) : null}
                  </Fragment>
                );
              }
              const shared = isSharedDealSection(section);
              return (
                <section
                  key={section.id}
                  className="ff-card space-y-2 overflow-hidden p-3"
                  data-ff-deal-section={section.id}
                  data-ff-deal-section-kind={shared ? "shared" : "other"}
                >
                  <LayoutSectionHeader
                    title={dwellingDetailsSectionLabel(section, dwellingFire)}
                  />
                  {isMailingAddressSection(section) ? (
                    <MailingSameSwitch
                      formId={formId}
                      same={isMailingSameAsInsured(liveValues)}
                      commercial={commercial}
                      onToggle={(next) =>
                        patchValue(MAILING_SAME_AS_INSURED_KEY, next ? "true" : "false")
                      }
                    />
                  ) : null}
                  <LayoutSectionFieldGrid
                    density={section}
                    keys={sectionKeys.filter((key) => {
                      const field = byKey[key] ?? { key, label: key, type: "single_line" as const };
                      if (skipOwnedInsuranceField(key, field, sectionKeys, fieldList)) return false;
                      if (isPreviousAddressFieldKey(key) && !shouldShowPreviousAddressFields(liveValues)) {
                        return false;
                      }
                      if (isMailingAddressFieldKey(key) && isMailingSameAsInsured(liveValues)) {
                        return false;
                      }
                      return true;
                    })}
                    fieldOf={(key) => byKey[key]}
                    renderField={(key) => (
                      <DealDetailsField
                        fieldKey={key}
                        field={byKey[key] ?? { key, label: key, type: "single_line" as const }}
                        values={liveValues}
                        formId={formId}
                        pipelineFamily={pipelineFamily}
                        quotingForm={quotingForm}
                        policySubType={policySubType}
                        lifeHealthOptions={lifeHealthOptions}
                        lifeOptions={lifeOptions}
                        healthOptions={healthOptions}
                        dealId={dealId}
                        packageLines={packageLines}
                        activePackageLine={activePackageLine}
                        lineSettings={lineSettings}
                        onValueChange={patchValue}
                        onValuesPatch={patchValues}
                        dwellingFire={dwellingFire}
                      />
                    )}
                  />
                </section>
              );
            })}
            {showMho && isRightColumn && !mhoPlacedInColumn ? (
              <MhoDetailsSection values={liveValues} formId={formId} onValueChange={patchValue} />
            ) : null}
          </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-end">
        <button type="submit" className={buttonVariants()} data-ff-deal-details-save="">
          Save deal details
        </button>
      </div>
      </form>
    </div>
  );
}
