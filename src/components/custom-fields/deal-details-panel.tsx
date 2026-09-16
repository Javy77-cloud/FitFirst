"use client";

import { useMemo, useState, useTransition } from "react";
import { saveDealFieldValues, uploadDealFieldImage } from "@/app/actions/custom-fields";
import { FieldControl } from "@/components/custom-fields/field-control";
import { buttonVariants } from "@/components/ui/button";
import type { PipelineFamily } from "@/lib/deals/insurance-cascade";
import { dealProductDef, type DealProductId } from "@/lib/deals/deal-products";
import {
  catalogFieldsForProducts,
  isProductDealSection,
  isSharedDealSection,
  layoutForActiveProduct,
} from "@/lib/deals/product-layout";
import { themeForProduct } from "@/lib/deals/product-ui";
import { cn } from "@/lib/utils";
import type { DeskLineSettings } from "@/lib/desk/line-settings";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { parseLayout, type CustomFieldDef, type FieldLayout } from "@/lib/custom-fields/types";
import {
  INSURANCE_QUOTE_SECTION_STYLE,
  isInsuranceQuoteRequestSection,
} from "@/lib/custom-fields/insurance-quote-section";
import {
  CO_APPLICANT_SECTION_ID,
  HAS_CO_APPLICANT_KEY,
  isCoApplicantEnabled,
} from "@/lib/custom-fields/co-applicant-fields";
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

function CoApplicantDealSection({
  sectionLabel,
  quoteReq,
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
}: {
  sectionLabel: string;
  quoteReq: boolean;
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
}) {
  const initialOn = useMemo(() => isCoApplicantEnabled(values), [values]);
  const [enabled, setEnabled] = useState(initialOn);

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
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-navy">{sectionLabel}</h3>
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
      </div>
      <input
        type="hidden"
        name={`field_${HAS_CO_APPLICANT_KEY}`}
        form={formId}
        value={enabled ? "true" : "false"}
      />
      {enabled ? (
        fieldKeys.map((key) => {
          if (key === HAS_CO_APPLICANT_KEY) return null;
          const field = byKey[key] ?? { key, label: key, type: "single_line" as const };
          const layoutHasType =
            fieldKeys.includes("insurance_type") || fieldList.some((f) => f.key === "insurance_type");
          if (
            layoutHasType &&
            (key === "insurance_category" ||
              key === "insurance_subtype" ||
              field.systemKey === "quotingForm")
          ) {
            return null;
          }
          return (
            <div key={key} className="space-y-1" data-ff-deal-field={key}>
              {key === "insurance_type" || field.label === "Insurance Type" ? null : (
                <label className="text-xs font-medium text-navy" htmlFor={`field_${key}`}>
                  {field.label}
                </label>
              )}
              <FieldControl
                field={field}
                value={values[key] ?? ""}
                values={values}
                name={`field_${key}`}
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
              />
              {field.type === "image" ? <DealFieldImageUpload dealId={dealId} fieldKey={key} /> : null}
            </div>
          );
        })
      ) : (
        <p className="text-[11px] text-muted-foreground" data-ff-co-applicant-off-hint="">
          Off — master sheet Fill will not look for or transfer co-applicant data.
        </p>
      )}
    </section>
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
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
}) {
  const safeLayout = layoutForActiveProduct(parseLayout(layout), activeProduct);
  const extra = activeProduct ? catalogFieldsForProducts([activeProduct]) : [];
  const fieldList = resolveLayoutFields(safeLayout, [...asList(fields), ...extra]);
  const byKey = Object.fromEntries(fieldList.map((field) => [field.key, field]));
  const formId = "deal-details-save";

  return (
    <div data-ff-deal-details data-ff-pipeline-family={pipelineFamily}>
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
              const sectionKeys = asList(section.fieldKeys);
              const isCoAppSection =
                section.id === CO_APPLICANT_SECTION_ID ||
                sectionKeys.includes("co_applicant_first_name");
              if (isCoAppSection) {
                return (
                  <CoApplicantDealSection
                    key={section.id}
                    sectionLabel={section.label}
                    quoteReq={quoteReq}
                    fieldKeys={sectionKeys}
                    byKey={byKey}
                    values={values}
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
                  />
                );
              }
              const shared = isSharedDealSection(section);
              const productOnly = isProductDealSection(section);
              const theme = activeProduct ? themeForProduct(activeProduct) : null;
              return (
                <section
                  key={section.id}
                  className={
                    quoteReq
                      ? "ff-card space-y-2 overflow-hidden border border-[#9ec9e8] p-3"
                      : cn(
                          "ff-card space-y-2 overflow-hidden p-3",
                          productOnly && theme && "border-2",
                        )
                  }
                  data-ff-deal-section={section.id}
                  data-ff-deal-section-kind={productOnly ? "product" : shared ? "shared" : "other"}
                  data-ff-insurance-quote-request={quoteReq ? "1" : undefined}
                  style={quoteReq ? INSURANCE_QUOTE_SECTION_STYLE : undefined}
                >
                  {productOnly && theme ? <div className={cn("-mx-3 -mt-3 mb-2 h-1", theme.stripe)} /> : null}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-medium text-navy">{section.label}</h3>
                    <div className="flex items-center gap-1.5">
                      {shared ? (
                        <span
                          className="shrink-0 rounded-full bg-[var(--ff-check-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy"
                          data-ff-shared-once=""
                        >
                          Asked once
                        </span>
                      ) : null}
                      {productOnly && activeProduct ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            theme?.wash,
                            theme?.ink,
                          )}
                          data-ff-product-only=""
                        >
                          {dealProductDef(activeProduct).group} only
                        </span>
                      ) : null}
                      {quoteReq ? (
                        <span
                          className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1d4e89]"
                          data-ff-required-badge
                        >
                          Required
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {asList(section.fieldKeys).map((key) => {
                    const field = byKey[key] ?? { key, label: key, type: "single_line" as const };
                    const layoutHasType =
                      asList(section.fieldKeys).includes("insurance_type") ||
                      fieldList.some((f) => f.key === "insurance_type");
                    if (
                      layoutHasType &&
                      (key === "insurance_category" ||
                        key === "insurance_subtype" ||
                        field.systemKey === "quotingForm")
                    ) {
                      return null;
                    }
                    return (
                      <div key={key} className="space-y-1" data-ff-deal-field={key}>
                        {key === "insurance_type" || field.label === "Insurance Type" ? null : (
                          <label className="text-xs font-medium text-navy" htmlFor={`field_${key}`}>
                            {field.label}
                          </label>
                        )}
                        <FieldControl
                          field={field}
                          value={values[key] ?? ""}
                          values={values}
                          name={`field_${key}`}
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
                        />
                        {field.type === "image" ? (
                          <DealFieldImageUpload dealId={dealId} fieldKey={key} />
                        ) : null}
                      </div>
                    );
                  })}
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
