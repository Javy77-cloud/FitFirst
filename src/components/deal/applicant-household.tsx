"use client";

import { useMemo, useState } from "react";
import { CoApplicantBlock } from "@/components/deal/co-applicant-block";
import { Input } from "@/components/ui/input";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { APPLICANT_CORE_FIELDS } from "@/lib/quote-sheet/applicant-core";
import { SHEET_GROUP_HEADER_STYLE, sheetGroupHeaderClass } from "@/lib/quote-sheet/sheet-group-style";
import { cn } from "@/lib/utils";

/** Applicant + Co-applicant together so Married can require a spouse live. */
export function ApplicantHousehold({
  values,
}: {
  values: Record<string, QuoteSheetFieldValue>;
}) {
  const [marital, setMarital] = useState(values.applicant_marital_status?.value ?? "");
  const applicantFields = useMemo(() => APPLICANT_CORE_FIELDS, []);

  return (
    <>
      <div className="border-b border-border/70 last:border-b-0" data-ff-sheet-group="Applicant">
        <div
          className={sheetGroupHeaderClass("Applicant")}
          style={SHEET_GROUP_HEADER_STYLE}
          data-ff-sheet-group-header="Applicant"
        >
          Applicant
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 px-2 py-1.5 sm:grid-cols-2">
          {applicantFields.map((field) => {
            const cell = values[field.key];
            const value =
              field.key === "applicant_marital_status" ? marital : (cell?.value ?? "");
            const className = cn(
              "h-7 w-full text-xs cursor-text",
              cell?.status === "check" && "ff-field-check",
              (!String(value).trim() || cell?.status === "missing") && "ff-field-missing",
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
                  className="truncate text-[11px] font-medium leading-tight text-navy"
                  title={field.label}
                >
                  {field.label}
                </label>
                <div className="min-w-0">
                  {field.options && field.options.length > 0 ? (
                    <select
                      id={`ff-sheet-input-${field.key}`}
                      name={field.key}
                      value={field.key === "applicant_marital_status" ? marital : undefined}
                      defaultValue={field.key === "applicant_marital_status" ? undefined : value}
                      onChange={
                        field.key === "applicant_marital_status"
                          ? (event) => setMarital(event.target.value)
                          : undefined
                      }
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
                      {String(value).trim() && !field.options.includes(String(value)) ? (
                        <option value={String(value)}>{String(value)}</option>
                      ) : null}
                    </select>
                  ) : (
                    <Input
                      id={`ff-sheet-input-${field.key}`}
                      name={field.key}
                      type="text"
                      defaultValue={cell?.value ?? ""}
                      aria-label={field.label}
                      className={className}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <CoApplicantBlock values={values} maritalStatus={marital} />
    </>
  );
}
