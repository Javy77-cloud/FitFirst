"use client";

import { useState } from "react";
import type { CustomFieldDef } from "@/lib/custom-fields/types";
import { evaluateFormula, formatFormulaValue } from "@/lib/custom-fields/formula";
import { formatCurrencyDisplay, parseNumericInput } from "@/lib/custom-fields/format";
import { resolvedFieldValue, sanitizePicklistOptions } from "@/lib/custom-fields/picklists";
import { FieldTypeIcon } from "@/components/custom-fields/field-type-icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function FieldControl({
  field,
  value,
  values,
  name,
  disabled,
  form,
}: {
  field: CustomFieldDef;
  value: string;
  values: Record<string, string>;
  name: string;
  disabled?: boolean;
  form?: string;
}) {
  const resolved = resolvedFieldValue(field, value);
  const required = Boolean(field.required);
  const options = sanitizePicklistOptions(field.options ?? []);

  return (
    <div data-ff-control-type={field.type} data-ff-control-key={field.key}>
      <TypedControl
        field={field}
        value={resolved}
        values={values}
        name={name}
        disabled={disabled}
        form={form}
        required={required}
        options={options}
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
}: {
  field: CustomFieldDef;
  value: string;
  values: Record<string, string>;
  name: string;
  disabled?: boolean;
  form?: string;
  required: boolean;
  options: string[];
}) {
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
        name={name}
        defaultValue={value}
        disabled={disabled}
        required={required}
        form={form}
        aria-label={field.label}
        className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
        data-ff-picklist={field.key}
      >
        <option value="">Select</option>
        {options.map((option, index) => (
          <option key={`${field.key}:${index}:${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "multi_select") {
    const selected = new Set(value.split(",").filter(Boolean));
    return (
      <div className="mt-1 flex flex-wrap gap-2" data-ff-multi-select={field.key}>
        {options.map((option, index) => (
          <label key={`${field.key}:${index}:${option}`} className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              name={name}
              value={option}
              defaultChecked={selected.has(option)}
              disabled={disabled}
              form={form}
            />
            {option}
          </label>
        ))}
        {options.length === 0 ? <p className="text-xs text-muted-foreground">No options yet.</p> : null}
      </div>
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
    return <CurrencyInput name={name} value={value} disabled={disabled} form={form} required={required} label={field.label} />;
  }
  if (field.type === "percentage") {
    return (
      <div className="relative mt-1" data-ff-percent-input>
        <Input
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
  if (field.type === "lookup") {
    return (
      <div className="relative mt-1" data-ff-lookup-input>
        <FieldTypeIcon type="lookup" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
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

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "date"
        ? "date"
        : field.type === "date_time"
          ? "datetime-local"
          : field.type === "number"
            ? "number"
            : field.type === "phone"
              ? "tel"
              : "text";

  return (
    <Input
      name={name}
      type={inputType}
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

function CurrencyInput({
  name,
  value,
  disabled,
  form,
  required,
  label,
}: {
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
