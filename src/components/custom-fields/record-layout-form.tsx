"use client";

import { saveModuleRecordValues } from "@/app/actions/custom-fields";
import { FieldControl } from "@/components/custom-fields/field-control";
import { Button } from "@/components/ui/button";
import type { FieldLayoutModule } from "@/lib/custom-fields/modules";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { parseLayout, type CustomFieldDef, type FieldLayout } from "@/lib/custom-fields/types";
import { asList } from "@/lib/safe-list";

export function RecordLayoutFields({
  module,
  layout,
  fields,
  values,
  form,
}: {
  module: FieldLayoutModule;
  layout: FieldLayout;
  fields: CustomFieldDef[];
  values: Record<string, string>;
  form?: string;
}) {
  const safeLayout = parseLayout(layout);
  const fieldList = resolveLayoutFields(safeLayout, asList(fields));
  const byKey = Object.fromEntries(fieldList.map((field) => [field.key, field]));

  return (
    <div
      className="grid grid-cols-2 gap-4 max-[699px]:grid-cols-1"
      data-ff-record-layout={module}
      data-ff-record-layout-cols="two-col"
    >
      {asList(safeLayout.columns).map((column) => (
        <div key={column.id} className="min-w-0 space-y-3" data-ff-record-layout-col={column.id}>
          {asList(column.sections).map((section) => (
            <section
              key={section.id}
              className="ff-card space-y-2 p-3"
              data-ff-record-section={section.id}
            >
              <h3 className="text-xs font-medium text-navy">{section.label}</h3>
              {asList(section.fieldKeys).map((key) => {
                const field = byKey[key] ?? {
                  key,
                  label: key,
                  type: "single_line" as const,
                };
                return (
                  <div key={key} className="space-y-1" data-ff-record-field={key}>
                    <label className="text-xs font-medium text-navy" htmlFor={`field_${key}`}>
                      {field.label}
                    </label>
                    <FieldControl
                      field={field}
                      value={values[key] ?? ""}
                      values={values}
                      name={`field_${key}`}
                      form={form}
                    />
                  </div>
                );
              })}
            </section>
          ))}
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
}: {
  module: FieldLayoutModule;
  recordId: string;
  layout: FieldLayout;
  fields: CustomFieldDef[];
  values: Record<string, string>;
  saveLabel?: string;
}) {
  const formId = `ff-layout-save-${module}`;
  return (
    <div className="space-y-3" data-ff-module-record-form={module}>
      <form action={saveModuleRecordValues} id={formId}>
        <input type="hidden" name="module" value={module} />
        <input type="hidden" name="recordId" value={recordId} />
      </form>
      <RecordLayoutFields
        module={module}
        layout={layout}
        fields={fields}
        values={values}
        form={formId}
      />
      <div className="flex justify-end">
        <Button type="submit" form={formId} data-ff-save-record-layout={module}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
