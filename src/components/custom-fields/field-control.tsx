"use client";

import type { CustomFieldDef } from "@/lib/custom-fields/types";
import { evaluateFormula, formatFormulaValue } from "@/lib/custom-fields/formula";
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
    return <Textarea name={name} defaultValue={value} disabled={disabled} className="mt-1 min-h-16" form={form} />;
  }
  if (field.type === "checkbox") {
    return (
      <label className="mt-1 flex items-center gap-2 text-sm">
        <input type="checkbox" name={name} defaultChecked={value === "true" || value === "on"} disabled={disabled} form={form} />
        Yes
      </label>
    );
  }
  if (field.type === "picklist") {
    return (
      <select name={name} defaultValue={value} disabled={disabled} form={form} className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm">
        <option value="">Select</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "multi_select") {
    const selected = new Set(value.split(",").filter(Boolean));
    return (
      <div className="mt-1 flex flex-wrap gap-2">
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-1 text-xs">
            <input type="checkbox" name={name} value={option} defaultChecked={selected.has(option)} disabled={disabled} form={form} />
            {option}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === "image") {
    return (
      <div className="mt-1 space-y-1">
        <input type="hidden" name={name} value={value} form={form} />
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/documents/${value}`} alt={field.label} className="max-h-24 rounded-md border border-border" />
        ) : (
          <p className="text-xs text-muted-foreground">No image yet.</p>
        )}
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
          : field.type === "number" || field.type === "currency" || field.type === "percentage"
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
      form={form}
      step={field.type === "currency" || field.type === "percentage" ? "0.01" : undefined}
      className="mt-1 h-8"
    />
  );
}
