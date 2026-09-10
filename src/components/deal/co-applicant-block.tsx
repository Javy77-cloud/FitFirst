"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import {
  CO_APPLICANT_FIELDS,
  coApplicantHasValue,
} from "@/lib/quote-sheet/applicant-core";
import { sheetGroupHeaderClass } from "@/lib/quote-sheet/sheet-group-style";
import { cn } from "@/lib/utils";

/** Additive co-applicant on any LOB master sheet — Add when needed (max one). */
export function CoApplicantBlock({
  values,
}: {
  values: Record<string, QuoteSheetFieldValue>;
}) {
  const seeded = useMemo(() => coApplicantHasValue(values), [values]);
  const [open, setOpen] = useState(seeded);

  return (
    <div className="border-b border-border/70 last:border-b-0" data-ff-co-applicant="">
      <div className={sheetGroupHeaderClass("Co-applicant")} data-ff-sheet-group-header="Co-applicant">
        Co-applicant
      </div>
      {open ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 px-2 py-1.5 sm:grid-cols-2" data-ff-co-applicant-fields="">
          {CO_APPLICANT_FIELDS.map((field) => {
            const cell = values[field.key];
            const value = cell?.value ?? "";
            const className = cn(
              "h-7 w-full text-xs cursor-text",
              cell?.status === "check" && "ff-field-check",
              (!value.trim() || cell?.status === "missing") && "ff-field-missing",
            );
            return (
              <div
                key={field.key}
                id={`sheet-field-${field.key}`}
                className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 rounded-sm px-1 py-0.5 hover:bg-muted/40"
                data-ff-sheet-row={field.key}
              >
                <label
                  htmlFor={`ff-sheet-input-${field.key}`}
                  className="truncate text-[11px] font-medium leading-tight text-black"
                  title={field.label}
                >
                  {field.label}
                </label>
                <div className="min-w-0">
                  {field.options && field.options.length > 0 ? (
                    <select
                      id={`ff-sheet-input-${field.key}`}
                      name={field.key}
                      defaultValue={value}
                      aria-label={field.label}
                      data-ff-sheet-picklist={field.key}
                      className={cn(
                        "border-input bg-background rounded-md border px-2 shadow-xs outline-none",
                        className,
                      )}
                    >
                      <option value="">Select…</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      {value.trim() && !field.options.includes(value) ? (
                        <option value={value}>{value}</option>
                      ) : null}
                    </select>
                  ) : (
                    <Input
                      id={`ff-sheet-input-${field.key}`}
                      name={field.key}
                      type="text"
                      defaultValue={value}
                      aria-label={field.label}
                      className={className}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <button
          type="button"
          className="px-3 py-2 text-sm font-medium text-primary hover:underline"
          data-testid="deal-add-co-applicant"
          onClick={() => setOpen(true)}
        >
          + Add co-applicant
        </button>
      )}
    </div>
  );
}
