"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FieldControl } from "@/components/custom-fields/field-control";
import {
  MHO_DETAILS_GROUPS,
  MHO_DETAILS_SECTION_ID,
  mhoDetailsFieldsForGroup,
  mhoYes,
  type MhoDetailsField,
} from "@/lib/custom-fields/mho-details-fields";

function displayValue(field: MhoDetailsField, values: Record<string, string>): string {
  const stored = (values[field.key] ?? "").trim();
  if (stored) return stored;
  return field.defaultValue?.trim() ?? "";
}

function MhoFieldControl({
  field,
  values,
  formId,
  onValueChange,
}: {
  field: MhoDetailsField;
  values: Record<string, string>;
  formId: string;
  onValueChange: (key: string, value: string) => void;
}) {
  const value = displayValue(field, values);
  return (
    <div
      className="space-y-1"
      data-ff-deal-field={field.key}
      data-ff-mho-structure-type={field.key === "structure_type" ? "" : undefined}
    >
      <label className="text-xs font-medium text-navy" htmlFor={`field_${field.key}`}>
        {field.label}
      </label>
      <FieldControl
        field={field}
        value={value}
        values={values}
        name={`field_${field.key}`}
        form={formId}
        onValueChange={(next) => onValueChange(field.key, next)}
      />
    </div>
  );
}

export function MhoDetailsSection({
  values,
  formId,
  onValueChange,
}: {
  values: Record<string, string>;
  formId: string;
  onValueChange: (key: string, value: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const showPrior = mhoYes(values.resided_under_2_years);
  const priorExplicitNo = (values.resided_under_2_years ?? "").trim() !== "" && !showPrior;

  return (
    <section
      className="ff-card mt-4 overflow-hidden"
      data-ff-deal-section={MHO_DETAILS_SECTION_ID}
      data-ff-mho-open={open ? "1" : "0"}
    >
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 px-4 py-3 text-left hover:bg-secondary/60"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        data-ff-mho-toggle=""
      >
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-lg font-semibold text-[#002868]">MHO</span>
      </button>
      <div className={open ? "space-y-4 border-t border-border px-4 py-4" : "hidden"} data-ff-mho-body="">
        {MHO_DETAILS_GROUPS.map((group) => {
          const fields = mhoDetailsFieldsForGroup(group.id).filter((row) => {
            if (!row.showWhenKey) return true;
            return showPrior;
          });
          if (!fields.length) return null;
          return (
            <div key={group.id} data-ff-mho-group={group.id}>
              <h4 className="mb-2 text-center text-sm font-semibold text-[#002868]">{group.title}</h4>
              <div
                className="grid grid-cols-2 gap-x-4 gap-y-3 max-[699px]:grid-cols-1"
                data-ff-mho-grid=""
                data-ff-section-density="2"
              >
                {fields.map((row) => (
                  <MhoFieldControl
                    key={row.key}
                    field={row}
                    values={values}
                    formId={formId}
                    onValueChange={onValueChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {priorExplicitNo
          ? ["prior_residence_address", "prior_residence_city", "prior_residence_state", "prior_residence_zip"].map(
              (key) => (
                <input key={key} type="hidden" name={`field_${key}`} form={formId} value="" />
              ),
            )
          : null}
      </div>
    </section>
  );
}
