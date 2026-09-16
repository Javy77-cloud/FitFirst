"use client";

import { useState } from "react";
import type { CustomFieldDef } from "@/lib/custom-fields/types";
import { evaluateFormula, formatFormulaValue } from "@/lib/custom-fields/formula";
import { formatCurrencyDisplay, parseNumericInput } from "@/lib/custom-fields/format";
import { resolvedFieldValue, sanitizePicklistOptions } from "@/lib/custom-fields/picklists";
import {
  InsuranceCascadeControl,
  isInsuranceCategoryField,
  isInsuranceSubtypeField,
  isInsuranceTypeField,
} from "@/components/custom-fields/insurance-cascade-control";
import type { PipelineFamily } from "@/lib/deals/insurance-cascade";
import type { DeskLineSettings } from "@/lib/desk/line-settings";
import { FieldTypeIcon } from "@/components/custom-fields/field-type-icon";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { addressFillForKey, isStreetAddressField } from "@/lib/address/keys";
import { MultiSelectField } from "@/components/custom-fields/multi-select-field";
import {
  canonicalizeIdentityField,
  htmlAutoCompleteForField,
  htmlInputTypeForField,
} from "@/lib/custom-fields/identity-field";
import { formatPhoneStandard } from "@/lib/phone/format";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function FieldControl({
  field,
  value,
  values,
  name,
  disabled,
  form,
  pipelineFamily = "pc",
  quotingForm,
  policySubType,
  lifeHealthOptions = [],
  lifeOptions = [],
  healthOptions = [],
  packageLines = [],
  activePackageLine = null,
  lineSettings,
  onMultiSelectChange,
}: {
  field: CustomFieldDef;
  value: string;
  values: Record<string, string>;
  name: string;
  disabled?: boolean;
  form?: string;
  pipelineFamily?: PipelineFamily;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
  lifeOptions?: Array<{ slug?: string; label: string }>;
  healthOptions?: Array<{ slug?: string; label: string }>;
  packageLines?: readonly string[];
  activePackageLine?: string | null;
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  onMultiSelectChange?: (joined: string) => void;
}) {
  const identityField = canonicalizeIdentityField(field);
  const resolved = resolvedFieldValue(identityField, value);
  const required = Boolean(identityField.required);
  const options = sanitizePicklistOptions(identityField.options ?? []);

  return (
    <div data-ff-control-type={identityField.type} data-ff-control-key={identityField.key}>
      <TypedControl
        field={identityField}
        value={resolved}
        values={values}
        name={name}
        disabled={disabled}
        form={form}
        required={required}
        options={options}
        pipelineFamily={pipelineFamily}
        quotingForm={quotingForm}
        policySubType={policySubType}
        lifeHealthOptions={lifeHealthOptions}
        lifeOptions={lifeOptions}
        healthOptions={healthOptions}
        packageLines={packageLines}
        activePackageLine={activePackageLine}
        lineSettings={lineSettings}
        onMultiSelectChange={onMultiSelectChange}
      />
    </div>
  );
}

function TypedControl({
  field,
  value,
  values,
  name,
  disabled,
  form,
  required,
  options,
  pipelineFamily = "pc",
  quotingForm,
  policySubType,
  lifeHealthOptions = [],
  lifeOptions = [],
  healthOptions = [],
  packageLines = [],
  activePackageLine = null,
  lineSettings,
  onMultiSelectChange,
}: {
  field: CustomFieldDef;
  value: string;
  values: Record<string, string>;
  name: string;
  disabled?: boolean;
  form?: string;
  required: boolean;
  options: string[];
  pipelineFamily?: PipelineFamily;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
  lifeOptions?: Array<{ slug?: string; label: string }>;
  healthOptions?: Array<{ slug?: string; label: string }>;
  packageLines?: readonly string[];
  activePackageLine?: string | null;
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  onMultiSelectChange?: (joined: string) => void;
}) {
  // 3-level cascade: Type → Category → Form. Type field owns the UI;
  // category + subtype siblings are skipped so we do not render three cascades.
  if (isInsuranceTypeField(field)) {
    return (
      <InsuranceCascadeControl
        typeName={name}
        categoryName="field_insurance_category"
        subtypeName="field_insurance_subtype"
        form={form}
        family={pipelineFamily}
        typeValue={value || values.insurance_type || ""}
        categoryValue={values.insurance_category || ""}
        value={values.insurance_subtype || policySubType || quotingForm || ""}
        quotingForm={quotingForm}
        policySubType={policySubType || values.insurance_subtype || ""}
        lifeOptions={lifeOptions}
        healthOptions={healthOptions}
        lifeHealthOptions={lifeHealthOptions}
        required={required}
        disabled={disabled}
        packageLines={packageLines}
        activePackageLine={activePackageLine}
        lineSettings={lineSettings}
      />
    );
  }
  if (isInsuranceCategoryField(field)) {
    if (
      Object.prototype.hasOwnProperty.call(values, "insurance_type") ||
      values.insurance_type !== undefined
    ) {
      return <div className="hidden" data-ff-insurance-category-owned-by-type />;
    }
  }
  if (isInsuranceSubtypeField(field)) {
    // When Insurance Type is also on the form, it owns the cascade (writes all hiddens).
    if (Object.prototype.hasOwnProperty.call(values, "insurance_type") || values.insurance_type !== undefined) {
      return <div className="hidden" data-ff-insurance-subtype-owned-by-type />;
    }
    return (
      <InsuranceCascadeControl
        typeName="field_insurance_type"
        categoryName="field_insurance_category"
        subtypeName={name}
        form={form}
        family={pipelineFamily}
        typeValue={values.insurance_type || ""}
        categoryValue={values.insurance_category || ""}
        value={value}
        quotingForm={quotingForm ?? value}
        policySubType={policySubType}
        lifeOptions={lifeOptions}
        healthOptions={healthOptions}
        lifeHealthOptions={lifeHealthOptions}
        required={required}
        disabled={disabled}
        packageLines={packageLines}
        activePackageLine={activePackageLine}
        lineSettings={lineSettings}
      />
    );
  }
  if (field.type === "formula") {
    const result = evaluateFormula(field.formula ?? "", values);
    return (
      <div className="mt-1 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm text-navy" data-ff-formula-value={field.key}>
        <input type="hidden" name={name} value={result.ok ? formatFormulaValue(result.value) : ""} form={form} />
        {result.ok ? formatFormulaValue(result.value) : result.error}
        {field.formula ? <span className="ml-2 text-xs text-muted-foreground">{field.formula}</span> : null}
      </div>
    );
  }
  if (field.type === "multi_line") {
    return (
      <Textarea
        id={name}
        name={name}
        defaultValue={value}
        disabled={disabled}
        required={required}
        className="mt-1 min-h-16"
        form={form}
        aria-label={field.label}
      />
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="mt-1 flex items-center gap-2 text-sm">
        <input
          id={name}
          type="checkbox"
          name={name}
          defaultChecked={value === "true" || value === "on"}
          disabled={disabled}
          required={required}
          form={form}
          data-ff-checkbox={field.key}
        />
        Yes
      </label>
    );
  }
  if (field.type === "picklist") {
    return (
      <select
        id={name}
        name={name}
        defaultValue={value}
        disabled={disabled}
        required={required}
        form={form}
        aria-label={field.label}
        className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
        data-ff-picklist={field.key}
      >
        <option value="">None</option>
        {options.map((option, index) => (
          <option key={`${field.key}:${index}:${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "multi_select") {
    // Long lists (e.g. Existing Coverage / policy subtypes) get type-to-filter.
    const searchable =
      field.key === "existing_coverage_types" ||
      options.length >= 12;
    return (
      <MultiSelectField
        name={name}
        options={options}
        value={value}
        disabled={disabled}
        form={form}
        searchable={searchable}
        label={field.label}
        fieldKey={field.key}
        onChange={onMultiSelectChange}
      />
    );
  }
  if (field.type === "image") {
    return (
      <div className="mt-1 space-y-1" data-ff-image-control={field.key}>
        <input type="hidden" name={name} value={value} form={form} />
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/documents/${value}`} alt={field.label} className="max-h-24 rounded-md border border-border" />
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-2 text-xs text-muted-foreground">
            <FieldTypeIcon type="image" />
            Image upload
          </div>
        )}
      </div>
    );
  }
  if (field.type === "currency") {
    return (
      <CurrencyInput
        id={name}
        name={name}
        value={value}
        disabled={disabled}
        form={form}
        required={required}
        label={field.label}
      />
    );
  }
  if (field.type === "percentage") {
    return (
      <div className="relative mt-1" data-ff-percent-input>
        <Input
          id={name}
          name={name}
          type="number"
          step="0.01"
          defaultValue={value}
          disabled={disabled}
          required={required}
          form={form}
          aria-label={field.label}
          className="h-8 pr-7"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
      </div>
    );
  }
  if (field.type === "address" || isStreetAddressField(field.key, field.type)) {
    return (
      <AddressAutocomplete
        id={name}
        name={name}
        defaultValue={value}
        disabled={disabled}
        required={required}
        form={form}
        fill={addressFillForKey(field.key)}
        className="mt-1 h-8"
      />
    );
  }
  if (field.type === "lookup") {
    return (
      <div className="relative mt-1" data-ff-lookup-input>
        <FieldTypeIcon type="lookup" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={name}
          name={name}
          type="text"
          defaultValue={value}
          disabled={disabled}
          required={required}
          form={form}
          aria-label={field.label}
          placeholder={field.lookupModule ? `Look up ${field.lookupModule}` : "Look up a record"}
          className="h-8 pl-8"
        />
      </div>
    );
  }

  if (field.type === "phone") {
    return (
      <PhoneInput
        id={name}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        form={form}
        label={field.label}
        fieldKey={field.key}
      />
    );
  }

  const inputType = htmlInputTypeForField(field);

  return (
    <Input
      id={name}
      name={name}
      type={inputType}
      autoComplete={htmlAutoCompleteForField(field)}
      defaultValue={value}
      disabled={disabled}
      required={required}
      form={form}
      aria-label={field.label}
      className="mt-1 h-8"
      data-ff-single-line={field.type === "single_line" ? field.key : undefined}
    />
  );
}

function PhoneInput({
  id,
  name,
  value,
  disabled,
  form,
  required,
  label,
  fieldKey,
}: {
  id?: string;
  name: string;
  value: string;
  disabled?: boolean;
  form?: string;
  required?: boolean;
  label: string;
  fieldKey: string;
}) {
  const [text, setText] = useState(() => (value ? formatPhoneStandard(value) : ""));

  return (
    <Input
      id={id}
      name={name}
      type="tel"
      inputMode="tel"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        const next = formatPhoneStandard(text);
        setText(next);
      }}
      disabled={disabled}
      required={required}
      form={form}
      aria-label={label}
      placeholder="1-555-555-5555"
      className="mt-1 h-8"
      data-ff-phone={fieldKey}
    />
  );
}

function CurrencyInput({
  id,
  name,
  value,
  disabled,
  form,
  required,
  label,
}: {
  id?: string;
  name: string;
  value: string;
  disabled?: boolean;
  form?: string;
  required?: boolean;
  label: string;
}) {
  const [text, setText] = useState(() => formatCurrencyDisplay(value) || value);

  const numeric = parseNumericInput(text);

  return (
    <div className="relative mt-1" data-ff-currency-input>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <input type="hidden" name={name} value={numeric} form={form} />
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const parsed = parseNumericInput(text);
          setText(parsed ? formatCurrencyDisplay(parsed) : "");
        }}
        disabled={disabled}
        required={required}
        form={form}
        aria-label={label}
        className="h-8 pl-6"
      />
    </div>
  );
}
