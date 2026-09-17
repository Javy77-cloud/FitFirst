"use client";

import { useMemo, useState, useTransition } from "react";
import { saveDealFieldValues, uploadDealFieldImage } from "@/app/actions/custom-fields";
import { FieldControl } from "@/components/custom-fields/field-control";
import { LayoutSectionFieldGrid } from "@/components/custom-fields/layout-section-field-grid";
import { LayoutRequiredBadge, LayoutSectionHeader } from "@/components/custom-fields/layout-section-header";
import { buttonVariants } from "@/components/ui/button";
import type { PipelineFamily } from "@/lib/deals/insurance-cascade";
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
import {
  INSURANCE_QUOTE_SECTION_STYLE,
  isInsuranceQuoteRequestSection,
} from "@/lib/custom-fields/insurance-quote-section";
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
import { isDealDetailsLandlordFieldKey } from "@/lib/custom-fields/deal-details-landlord";
import {
  MAILING_SAME_AS_INSURED_KEY,
  isMailingAddressFieldKey,
  isMailingSameAsInsured,
  isNoLivedAtAddress5Years,
  isPreviousAddressFieldKey,
} from "@/lib/custom-fields/mailing-same";
import { asList } from "@/lib/safe-list";

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
    (key === "insurance_category" || key === "insurance_subtype" || field.systemKey === "quotingForm")
  );
}

function CoApplicantDealSection({
  sectionLabel,
  quoteReq,
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
}: {
  sectionLabel: string;
  quoteReq: boolean;
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
      className={
        quoteReq
          ? "ff-card space-y-2 border border-[#9ec9e8] p-3"
          : "ff-card space-y-2 p-3"
      }
      data-ff-deal-section={CO_APPLICANT_SECTION_ID}
      data-ff-co-applicant-enabled={enabled ? "1" : "0"}
      data-ff-insurance-quote-request={quoteReq ? "1" : undefined}
      style={quoteReq ? INSURANCE_QUOTE_SECTION_STYLE : undefined}
    >
      <LayoutSectionHeader
        title={sectionLabel}
        badge={quoteReq ? <LayoutRequiredBadge /> : null}
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
}) {
  return (
    <div className="space-y-1" data-ff-deal-field={fieldKey}>
      {fieldKey === "insurance_type" || field.label === "Insurance Type" ? null : (
        <label className="text-xs font-medium text-navy" htmlFor={`field_${fieldKey}`}>
          {field.label}
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
      />
      {field.type === "image" ? <DealFieldImageUpload dealId={dealId} fieldKey={fieldKey} /> : null}
    </div>
  );
}

function MailingSameSwitch({
  formId,
  same,
  onToggle,
  commercial = false,
}: {
  formId: string;
  same: boolean;
  onToggle: (next: boolean) => void;
  commercial?: boolean;
}) {
  const label = commercial
    ? "Mailing address same as business address"
    : "Mailing address same as insured address";
  return (
    <label
      className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-navy"
      data-ff-mailing-same-switch=""
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-[#002868]"
        checked={same}
        onChange={(event) => onToggle(event.target.checked)}
        aria-label={label}
      />
      <span>{label}</span>
      <input
        type="hidden"
        name={`field_${MAILING_SAME_AS_INSURED_KEY}`}
        form={formId}
        value={same ? "true" : "false"}
      />
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
    commercial ? [...asList(fields), ...BUSINESS_IDENTITY_FIELDS] : asList(fields),
  );
  const byKey = Object.fromEntries(fieldList.map((field) => [field.key, field]));
  const formId = "deal-details-save";
  const [liveValues, setLiveValues] = useState(values);
  const layoutKeySet = useMemo(
    () => new Set(asList(safeLayout.columns).flatMap((column) => asList(column.sections).flatMap((section) => asList(section.fieldKeys)))),
    [safeLayout],
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

  return (
    <div
      data-ff-deal-details
      data-ff-pipeline-family={pipelineFamily}
      data-ff-deal-details-kind={commercial ? "commercial" : "personal"}
    >
      <form action={saveDealFieldValues} id={formId} data-ff-deal-details-form="">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="pipelineFamily" value={pipelineFamily} />
        {activePackageLine ? <input type="hidden" name="activePackageLine" value={activePackageLine} /> : null}
      <div
        className="grid grid-cols-2 gap-4 max-[699px]:grid-cols-1"
        data-ff-deal-details-layout="two-col"
      >
        {asList(safeLayout.columns).map((column) => (
          <div key={column.id} className="min-w-0 space-y-3" data-ff-deal-details-col={column.id}>
            {asList(column.sections).map((section) => {
              const quoteReq = isInsuranceQuoteRequestSection(section);
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
                return (
                  <CoApplicantDealSection
                    key={section.id}
                    sectionLabel={section.label}
                    quoteReq={quoteReq}
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
                  />
                );
              }
              const shared = isSharedDealSection(section);
              return (
                <section
                  key={section.id}
                  className={
                    quoteReq
                      ? "ff-card space-y-2 overflow-hidden border border-[#9ec9e8] p-3"
                      : "ff-card space-y-2 overflow-hidden p-3"
                  }
                  data-ff-deal-section={section.id}
                  data-ff-deal-section-kind={shared ? "shared" : "other"}
                  data-ff-insurance-quote-request={quoteReq ? "1" : undefined}
                  style={quoteReq ? INSURANCE_QUOTE_SECTION_STYLE : undefined}
                >
                  <LayoutSectionHeader
                    title={section.label}
                    badge={quoteReq ? <LayoutRequiredBadge /> : null}
                  />
                  {section.id === "mailing_address" || /^mailing address$/i.test(section.label) ? (
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
                      if (isPreviousAddressFieldKey(key) && !isNoLivedAtAddress5Years(liveValues)) {
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
                      />
                    )}
                  />
                </section>
              );
            })}
          </div>
        ))}
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
