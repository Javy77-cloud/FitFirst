"use client";

import { useState } from "react";
import { saveModuleRecordValues } from "@/app/actions/custom-fields";
import { ClickToEditField } from "@/components/custom-fields/click-to-edit-field";
import { FieldControl } from "@/components/custom-fields/field-control";
import { LayoutSectionFieldGrid } from "@/components/custom-fields/layout-section-field-grid";
import { LayoutRequiredBadge, LayoutSectionHeader } from "@/components/custom-fields/layout-section-header";
import { Button } from "@/components/ui/button";
import type { FieldLayoutModule } from "@/lib/custom-fields/modules";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { parseLayout, type CustomFieldDef, type FieldLayout } from "@/lib/custom-fields/types";
import {
  INSURANCE_QUOTE_SECTION_STYLE,
  isInsuranceQuoteRequestSection,
} from "@/lib/custom-fields/insurance-quote-section";
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
import type { PipelineFamily } from "@/lib/deals/insurance-cascade";
import type { DeskLineSettings } from "@/lib/desk/line-settings";

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
}) {
  const safeLayout = parseLayout(layout);
  const fieldList = resolveLayoutFields(safeLayout, asList(fields));
  const byKey = Object.fromEntries(fieldList.map((field) => [field.key, field]));
  const inline = Boolean(clickToEdit && recordId);
  const layoutColumns = asList(safeLayout.columns);
  // Dense / classic: empty right column → true one-column stack (narrow monitors).
  const activeColumns = layoutColumns.filter((column) => asList(column.sections).length > 0);
  const oneCol = activeColumns.length <= 1;
  const commercial = module === "businesses" || fieldList.some((field) => field.key === "business_name");
  const [liveValues, setLiveValues] = useState<Record<string, string>>(() => ({
    ...values,
    [MAILING_SAME_AS_INSURED_KEY]:
      values[MAILING_SAME_AS_INSURED_KEY] || (isMailingSameAsInsured(values) ? "true" : "false"),
  }));

  function patchValue(key: string, next: string) {
    setLiveValues((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <div
      className={
        oneCol
          ? "grid grid-cols-1 gap-4"
          : "grid grid-cols-2 gap-4 max-[699px]:grid-cols-1"
      }
      data-ff-record-layout={module}
      data-ff-record-layout-cols={oneCol ? "one-col" : "two-col"}
      data-ff-click-to-edit-layout={inline ? "1" : undefined}
    >
      {activeColumns.map((column) => (
        <div key={column.id} className="min-w-0 space-y-3" data-ff-record-layout-col={column.id}>
          {asList(column.sections).map((section) => {
            const quoteReq = isInsuranceQuoteRequestSection(section);
            return (
            <section
              key={section.id}
              className={
                quoteReq
                  ? "ff-card space-y-3 border border-[#9ec9e8] px-5 py-4"
                  : "ff-card space-y-3 border border-border/60 px-5 py-4"
              }
              data-ff-record-section={section.id}
              data-ff-insurance-quote-request={quoteReq ? "1" : undefined}
              style={
                quoteReq
                  ? INSURANCE_QUOTE_SECTION_STYLE
                  : {
                      background: "#f8fafc",
                      boxShadow: "0 1px 2px rgba(15, 39, 68, 0.06), 0 4px 12px rgba(15, 39, 68, 0.08)",
                    }
              }
            >
              <LayoutSectionHeader
                title={section.label}
                badge={quoteReq ? <LayoutRequiredBadge /> : null}
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
                keys={asList(section.fieldKeys).filter((key) => {
                  const field = byKey[key] ?? { key, label: key, type: "single_line" as const };
                  const layoutHasType =
                    asList(section.fieldKeys).includes("insurance_type") ||
                    fieldList.some((item) => item.key === "insurance_type");
                  if (
                    layoutHasType &&
                    (key === "insurance_category" ||
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
                  return true;
                })}
                fieldOf={(key) => byKey[key]}
                renderField={(key) => {
                  const field = byKey[key] ?? {
                    key,
                    label: key,
                    type: "single_line" as const,
                  };
                  return (
                    <div className="space-y-1" data-ff-record-field={key}>
                      {key === "insurance_type" || field.label === "Insurance Type" ? null : (
                        <label className="text-xs font-medium text-navy" htmlFor={`field_${key}`}>
                          {field.label}
                        </label>
                      )}
                      {inline && recordId ? (
                        <ClickToEditField
                          field={field}
                          value={liveValues[key] ?? ""}
                          values={liveValues}
                          name={`field_${key}`}
                          recordId={recordId}
                          module={module}
                          pipelineFamily={pipelineFamily}
                          lifeOptions={lifeOptions}
                          healthOptions={healthOptions}
                          lineSettings={lineSettings}
                        />
                      ) : (
                        <FieldControl
                          field={field}
                          value={liveValues[key] ?? ""}
                          values={liveValues}
                          name={`field_${key}`}
                          form={form}
                          pipelineFamily={pipelineFamily}
                          lifeOptions={lifeOptions}
                          healthOptions={healthOptions}
                          lineSettings={lineSettings}
                          onValueChange={(next) => patchValue(key, next)}
                          onAddressFill={(parts) =>
                            setLiveValues((prev) => ({ ...prev, ...parts }))
                          }
                        />
                      )}
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
}: {
  module: FieldLayoutModule;
  recordId: string;
  layout: FieldLayout;
  fields: CustomFieldDef[];
  values: Record<string, string>;
  saveLabel?: string;
  /** When true, fields are plain text until clicked; blur saves. */
  clickToEdit?: boolean;
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
