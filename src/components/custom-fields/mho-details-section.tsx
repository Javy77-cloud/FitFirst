"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FieldControl } from "@/components/custom-fields/field-control";
import {
  MHO_DETAILS_GROUPS,
  MHO_DETAILS_SECTION_ID,
  MHO_STRUCTURE_TYPE,
  MHO_STRUCTURE_TYPE_OPTIONS,
  mhoDetailsFieldsForGroup,
  mhoYes,
  type MhoDetailsField,
} from "@/lib/custom-fields/mho-details-fields";

function displayValue(field: MhoDetailsField, values: Record<string, string>): string {
  const stored = (values[field.key] ?? "").trim();
  if (stored) return stored;
  return field.defaultValue?.trim() ?? "";
}

function structureTypeValue(values: Record<string, string>): string {
  const stored = (values.structure_type ?? "").trim();
  if (stored && (MHO_STRUCTURE_TYPE_OPTIONS as readonly string[]).includes(stored)) {
    return stored;
  }
  return MHO_STRUCTURE_TYPE;
}

/** Explicit editable dropdown — do not route through FieldControl (was easy to mistake for locked). */
function MhoStructureTypeSelect({
  values,
  formId,
  onValueChange,
}: {
  values: Record<string, string>;
  formId: string;
  onValueChange: (key: string, value: string) => void;
}) {
  const value = structureTypeValue(values);
  return (
    <div
      className="space-y-1"
      data-ff-deal-field="structure_type"
      data-ff-mho-structure-type=""
      data-ff-mho-structure-editable="1"
    >
      <label className="text-xs font-medium text-navy" htmlFor="field_structure_type">
        Structure type
      </label>
      <select
        id="field_structure_type"
        name="field_structure_type"
        form={formId}
        aria-label="Structure type"
        value={value}
        onChange={(event) => onValueChange("structure_type", event.target.value)}
        className="mt-1 h-8 w-full cursor-pointer appearance-auto rounded-md border border-border bg-background px-2 text-sm text-navy"
        data-ff-picklist="structure_type"
      >
        {MHO_STRUCTURE_TYPE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Preserve declared option order — FieldControl A–Z-sorts picklists. */
function MhoOrderedPicklist({
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
  const options = (field.options ?? []).map((option) => option.trim()).filter(Boolean);
  return (
    <div className="space-y-1" data-ff-deal-field={field.key}>
      <label className="text-xs font-medium text-navy" htmlFor={`field_${field.key}`}>
        {field.label}
      </label>
      <select
        id={`field_${field.key}`}
        name={`field_${field.key}`}
        form={formId}
        aria-label={field.label}
        value={value}
        onChange={(event) => onValueChange(field.key, event.target.value)}
        className="mt-1 h-8 w-full cursor-pointer appearance-auto rounded-md border border-border bg-background px-2 text-sm text-navy"
        data-ff-picklist={field.key}
        data-ff-mho-option-order="1"
      >
        {!value ? <option value="">Select…</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
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
  if (field.key === "structure_type") {
    return (
      <MhoStructureTypeSelect values={values} formId={formId} onValueChange={onValueChange} />
    );
  }
  if (field.type === "picklist") {
    return (
      <MhoOrderedPicklist
        field={field}
        values={values}
        formId={formId}
        onValueChange={onValueChange}
      />
    );
  }
  const value = displayValue(field, values);
  return (
    <div className="space-y-1" data-ff-deal-field={field.key}>
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
