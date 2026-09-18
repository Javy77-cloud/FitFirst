"use client";

import { useState } from "react";
import { saveModuleRecordValues } from "@/app/actions/custom-fields";
import { ClickToEditField } from "@/components/custom-fields/click-to-edit-field";
import { FieldControl } from "@/components/custom-fields/field-control";
import { LayoutSectionFieldGrid } from "@/components/custom-fields/layout-section-field-grid";
import { LayoutSectionHeader } from "@/components/custom-fields/layout-section-header";
import { Button } from "@/components/ui/button";
import type { FieldLayoutModule } from "@/lib/custom-fields/modules";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { parseLayout, type CustomFieldDef, type FieldLayout } from "@/lib/custom-fields/types";
import {
  PIPELINE_STRIP_LABEL,
  isPipelineStripSection,
} from "@/lib/custom-fields/insurance-quote-section";
import { MailingSameSwitch } from "@/components/custom-fields/mailing-same-switch";
import { ContactCoverageRecord } from "@/components/contacts/contact-coverage-record";
import { ContactDetailField } from "@/components/contacts/contact-detail-field";
import { ContactGeneratedOpportunities } from "@/components/contacts/contact-generated-opportunities";
import {
  MAILING_SAME_AS_INSURED_KEY,
  isMailingAddressFieldKey,
  isMailingAddressSection,
  isMailingSameAsInsured,
  isPreviousAddressFieldKey,
  shouldShowPreviousAddressFields,
} from "@/lib/custom-fields/mailing-same";
import { COVERAGE_CARRIER_FIELD_KEY } from "@/lib/coverage/declared-coverage";
import type { CoverageLine } from "@/lib/coverage/gaps";
import { isCompactLayoutField } from "@/lib/custom-fields/section-density";
import { asList } from "@/lib/safe-list";
import type { PipelineFamily } from "@/lib/deals/insurance-cascade";
import type { DeskLineSettings } from "@/lib/desk/line-settings";
import {
  DEAL_SELLING_AGENCY_FIELD,
  DEAL_SELLING_AGENCY_KEY,
  defaultSellingAgencyValue,
  isSellingAgencyField,
} from "@/lib/deals/selling-agency";

export function RecordLayoutFields({
  module,
  layout,
  fields,
  values,
  form,
  clickToEdit = false,
  recordId,
  pipelineFamily = "pc",
  lifeOptions = [],
  healthOptions = [],
  lineSettings,
  inForceLines = [],
}: {
  module: FieldLayoutModule;
  layout: FieldLayout;
  fields: CustomFieldDef[];
  values: Record<string, string>;
  form?: string;
  /** Detail preview: plain text until click, blur-save (Contacts / Business). */
  clickToEdit?: boolean;
  recordId?: string;
  pipelineFamily?: PipelineFamily;
  lifeOptions?: Array<{ slug?: string; label: string }>;
  healthOptions?: Array<{ slug?: string; label: string }>;
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  inForceLines?: CoverageLine[];
}) {
  const safeLayout = parseLayout(layout);
  const fieldList = resolveLayoutFields(
    safeLayout,
    asList(fields).some((field) => field.key === DEAL_SELLING_AGENCY_KEY)
      ? asList(fields)
      : [...asList(fields), DEAL_SELLING_AGENCY_FIELD],
  );
  const byKey = Object.fromEntries(fieldList.map((field) => [field.key, field]));
  const inline = Boolean(clickToEdit && recordId);
  const layoutColumns = asList(safeLayout.columns);
  // Dense / classic: empty right column → true one-column stack (narrow monitors).
  const activeColumns = layoutColumns.filter((column) => asList(column.sections).length > 0);
  const oneCol = activeColumns.length <= 1;
  const commercial = module === "businesses" || fieldList.some((field) => field.key === "business_name");
  const contactDesk = module === "contacts";
  const [liveValues, setLiveValues] = useState<Record<string, string>>(() => {
    const selling =
      values[DEAL_SELLING_AGENCY_KEY] ||
      defaultSellingAgencyValue(fieldList.find((field) => field.key === DEAL_SELLING_AGENCY_KEY)?.options);
    return {
      ...values,
      [MAILING_SAME_AS_INSURED_KEY]:
        values[MAILING_SAME_AS_INSURED_KEY] || (isMailingSameAsInsured(values) ? "true" : "false"),
      ...(selling ? { [DEAL_SELLING_AGENCY_KEY]: selling } : {}),
    };
  });

  function patchValue(key: string, next: string) {
    setLiveValues((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <div
      className={
        oneCol
          ? "grid grid-cols-1 gap-3"
          : contactDesk
            ? "grid grid-cols-2 gap-3 max-[699px]:grid-cols-1"
            : "grid grid-cols-2 gap-4 max-[699px]:grid-cols-1"
      }
      data-ff-record-layout={module}
      data-ff-record-layout-cols={oneCol ? "one-col" : "two-col"}
      data-ff-click-to-edit-layout={inline ? "1" : undefined}
    >
      {activeColumns.map((column) => (
        <div
          key={column.id}
          className={contactDesk ? "min-w-0 space-y-2" : "min-w-0 space-y-3"}
          data-ff-record-layout-col={column.id}
        >
          {asList(column.sections).map((section) => {
            const pipelineStrip = isPipelineStripSection(section);
            return (
            <section
              key={section.id}
              className={
                contactDesk
                  ? "space-y-2 rounded-lg border border-border/70 px-3 py-2.5"
                  : "ff-card space-y-3 border border-border/60 px-5 py-4"
              }
              data-ff-record-section={section.id}
              data-ff-pipeline-strip={pipelineStrip ? "1" : undefined}
              data-ff-contact-section={contactDesk ? section.id : undefined}
              style={
                contactDesk
                  ? { background: "var(--ff-card)", boxShadow: "var(--ff-shadow)" }
                  : {
                      background: "#f8fafc",
                      boxShadow: "0 1px 2px rgba(15, 39, 68, 0.06), 0 4px 12px rgba(15, 39, 68, 0.08)",
                    }
              }
            >
              <LayoutSectionHeader
                title={pipelineStrip ? PIPELINE_STRIP_LABEL : section.label}
                tone={contactDesk ? "contact" : "default"}
              />
              {isMailingAddressSection(section) ? (
                <MailingSameSwitch
                  formId={form}
                  same={isMailingSameAsInsured(liveValues)}
                  commercial={commercial}
                  onToggle={(next) => patchValue(MAILING_SAME_AS_INSURED_KEY, next ? "true" : "false")}
                />
              ) : null}
              <LayoutSectionFieldGrid
                density={section}
                keys={asList(section.fieldKeys)
                  .map((key) => (isSellingAgencyField({ key, label: byKey[key]?.label }) ? DEAL_SELLING_AGENCY_KEY : key))
                  .filter((key, index, all) => all.indexOf(key) === index)
                  .filter((key) => {
                  const field = byKey[key] ?? { key, label: key, type: "single_line" as const };
                  const layoutHasType =
                    asList(section.fieldKeys).includes("insurance_type") ||
                    fieldList.some((item) => item.key === "insurance_type");
                  if (
                    layoutHasType &&
                    (key === "pipeline" ||
                      key === "insurance_category" ||
                      key === "insurance_subtype" ||
                      field.systemKey === "quotingForm")
                  ) {
                    return false;
                  }
                  if (isPreviousAddressFieldKey(key) && !shouldShowPreviousAddressFields(liveValues)) {
                    return false;
                  }
                  if (isMailingAddressFieldKey(key) && isMailingSameAsInsured(liveValues)) {
                    return false;
                  }
                  if (key === COVERAGE_CARRIER_FIELD_KEY) return false;
                  return true;
                })}
                fieldOf={(key) => byKey[key]}
                renderField={(key) => {
                  const field = byKey[key] ?? {
                    key,
                    label: key,
                    type: "single_line" as const,
                  };
                  if (contactDesk && key === "existing_coverage_types") {
                    return (
                      <div className="col-span-full min-w-0" data-ff-record-field={key}>
                        <ContactCoverageRecord
                          existingTypes={liveValues.existing_coverage_types ?? ""}
                          carrierMapRaw={liveValues[COVERAGE_CARRIER_FIELD_KEY] ?? ""}
                          inForceLines={inForceLines}
                          recordId={inline ? recordId : undefined}
                          form={form}
                          onChange={(next) => {
                            patchValue("existing_coverage_types", next.existingTypes);
                            patchValue(COVERAGE_CARRIER_FIELD_KEY, next.carrierMapRaw);
                          }}
                        />
                      </div>
                    );
                  }
                  if (contactDesk && key === "cross_selling_opportunity") {
                    return (
                      <div className="col-span-full min-w-0" data-ff-record-field={key}>
                        <ContactGeneratedOpportunities
                          existingTypes={liveValues.existing_coverage_types ?? ""}
                          carrierMapRaw={liveValues[COVERAGE_CARRIER_FIELD_KEY] ?? ""}
                          inForceLines={inForceLines}
                          recentLifeEvents={liveValues.recent_life_events ?? ""}
                        />
                      </div>
                    );
                  }
                  const selling = isSellingAgencyField(field);
                  const controlField = selling
                    ? { ...field, key: DEAL_SELLING_AGENCY_KEY, required: true, label: "Selling agency" }
                    : field;
                  const controlKey = selling ? DEAL_SELLING_AGENCY_KEY : key;
                  const controlValue = selling
                    ? liveValues[DEAL_SELLING_AGENCY_KEY] || defaultSellingAgencyValue(field.options)
                    : liveValues[key] ?? "";
                  const control =
                    inline && recordId ? (
                      <ClickToEditField
                        field={controlField}
                        value={controlValue}
                        values={liveValues}
                        name={`field_${controlKey}`}
                        recordId={recordId}
                        module={module}
                        pipelineFamily={pipelineFamily}
                        lifeOptions={lifeOptions}
                        healthOptions={healthOptions}
                        lineSettings={lineSettings}
                        variant={contactDesk ? "contact" : "default"}
                        onValueChange={(next) => patchValue(controlKey, next)}
                      />
                    ) : (
                      <FieldControl
                        field={controlField}
                        value={controlValue}
                        values={liveValues}
                        name={`field_${controlKey}`}
                        form={form}
                        pipelineFamily={pipelineFamily}
                        lifeOptions={lifeOptions}
                        healthOptions={healthOptions}
                        lineSettings={lineSettings}
                        onValueChange={(next) => patchValue(controlKey, next)}
                        onAddressFill={(parts) =>
                          setLiveValues((prev) => ({ ...prev, ...parts }))
                        }
                      />
                    );
                  if (contactDesk) {
                    return (
                      <ContactDetailField
                        fieldKey={key}
                        label={field.label}
                        htmlFor={`field_${key}`}
                        compact={isCompactLayoutField(key, field)}
                      >
                        {control}
                      </ContactDetailField>
                    );
                  }
                  return (
                    <div className="space-y-1" data-ff-record-field={key}>
                      {key === "insurance_type" ? null : (
                        <label
                          className={
                            isSellingAgencyField(field)
                              ? "text-xs font-medium text-red-700"
                              : "text-xs font-medium text-navy"
                          }
                          htmlFor={`field_${isSellingAgencyField(field) ? DEAL_SELLING_AGENCY_KEY : key}`}
                          data-ff-required-field={isSellingAgencyField(field) ? "selling-agency" : undefined}
                        >
                          {isSellingAgencyField(field) ? "Selling agency" : field.label}
                          {isSellingAgencyField(field) ? (
                            <>
                              {" "}
                              <span aria-hidden="true">*</span>
                            </>
                          ) : null}
                        </label>
                      )}
                      {control}
                    </div>
                  );
                }}
              />
            </section>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function RecordLayoutForm({
  module,
  recordId,
  layout,
  fields,
  values,
  saveLabel = "Save",
  clickToEdit = false,
  inForceLines = [],
}: {
  module: FieldLayoutModule;
  recordId: string;
  layout: FieldLayout;
  fields: CustomFieldDef[];
  values: Record<string, string>;
  saveLabel?: string;
  /** When true, fields are plain text until clicked; blur saves. */
  clickToEdit?: boolean;
  inForceLines?: CoverageLine[];
}) {
  const formId = `ff-layout-save-${module}`;
  const inline = Boolean(clickToEdit);
  return (
    <div
      className="space-y-3"
      data-ff-module-record-form={module}
      data-ff-click-to-edit={inline ? "1" : undefined}
    >
      {!inline ? (
        <form action={saveModuleRecordValues} id={formId}>
          <input type="hidden" name="module" value={module} />
          <input type="hidden" name="recordId" value={recordId} />
        </form>
      ) : null}
      <RecordLayoutFields
        module={module}
        layout={layout}
        fields={fields}
        values={values}
        form={inline ? undefined : formId}
        clickToEdit={inline}
        recordId={recordId}
        inForceLines={inForceLines}
      />
      {!inline ? (
        <div className="flex justify-end">
          <Button type="submit" form={formId} data-ff-save-record-layout={module}>
            {saveLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
