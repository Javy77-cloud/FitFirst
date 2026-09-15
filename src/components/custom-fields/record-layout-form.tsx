"use client";

import { saveModuleRecordValues } from "@/app/actions/custom-fields";
import { ClickToEditField } from "@/components/custom-fields/click-to-edit-field";
import { FieldControl } from "@/components/custom-fields/field-control";
import { Button } from "@/components/ui/button";
import type { FieldLayoutModule } from "@/lib/custom-fields/modules";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { parseLayout, type CustomFieldDef, type FieldLayout } from "@/lib/custom-fields/types";
import {
  INSURANCE_QUOTE_SECTION_STYLE,
  isInsuranceQuoteRequestSection,
} from "@/lib/custom-fields/insurance-quote-section";
import { asList } from "@/lib/safe-list";
import type { PipelineFamily } from "@/lib/deals/insurance-cascade";
import type { PackageLine } from "@/lib/deals/package-lines";
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
  packageLines = [],
  activePackageLine = null,
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
  packageLines?: readonly PackageLine[];
  activePackageLine?: PackageLine | null;
}) {
  const safeLayout = parseLayout(layout);
  const fieldList = resolveLayoutFields(safeLayout, asList(fields));
  const byKey = Object.fromEntries(fieldList.map((field) => [field.key, field]));
  const inline = Boolean(clickToEdit && recordId);
  const layoutColumns = asList(safeLayout.columns);
  // Dense / classic: empty right column → true one-column stack (narrow monitors).
  const activeColumns = layoutColumns.filter((column) => asList(column.sections).length > 0);
  const oneCol = activeColumns.length <= 1;

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
              {/* Bigger than field labels; soft tint + shadow so the section reads as a card */}
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold leading-snug text-[#002868]">{section.label}</h3>
                {quoteReq ? (
                  <span
                    className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1d4e89]"
                    data-ff-required-badge
                  >
                    Required
                  </span>
                ) : null}
              </div>
              {asList(section.fieldKeys).map((key) => {
                const field = byKey[key] ?? {
                  key,
                  label: key,
                  type: "single_line" as const,
                };
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
                  <div key={key} className="space-y-1" data-ff-record-field={key}>
                    {key === "insurance_type" || field.label === "Insurance Type" ? null : (
                    <label className="text-xs font-medium text-navy" htmlFor={`field_${key}`}>
                      {field.label}
                    </label>
                    )}
                    {inline && recordId ? (
                      <ClickToEditField
                        field={field}
                        value={values[key] ?? ""}
                        values={values}
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
                        value={values[key] ?? ""}
                        values={values}
                        name={`field_${key}`}
                        form={form}
                        pipelineFamily={pipelineFamily}
                        lifeOptions={lifeOptions}
                        healthOptions={healthOptions}
                        lineSettings={lineSettings}
                        packageLines={packageLines}
                        activePackageLine={activePackageLine}
                      />
                    )}
                  </div>
                );
              })}
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
