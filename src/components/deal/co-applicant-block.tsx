"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { isCoApplicantExplicitlyOff } from "@/lib/custom-fields/co-applicant-fields";
import {
  CO_APPLICANT_FIELDS,
  coApplicantHasValue,
  coApplicantRequired,
  isMarriedStatus,
} from "@/lib/quote-sheet/applicant-core";
import { SHEET_GROUP_HEADER_STYLE, sheetGroupHeaderClass } from "@/lib/quote-sheet/sheet-group-style";
import { cn } from "@/lib/utils";

/** Additive co-applicant — required when Married, unless Deal Details switch is Off. */
export function CoApplicantBlock({
  values,
  maritalStatus,
  hasCoApplicantFlag,
}: {
  values: Record<string, QuoteSheetFieldValue>;
  maritalStatus?: string;
  /** Raw Deal Details `has_co_applicant` value (true/false). Explicit Off collapses + skips required. */
  hasCoApplicantFlag?: string | null;
}) {
  const forcedOff = isCoApplicantExplicitlyOff(hasCoApplicantFlag);
  const savedMarried = coApplicantRequired(values, { hasCoApplicantFlag });
  const liveMarried =
    !forcedOff && isMarriedStatus(maritalStatus ?? values.applicant_marital_status?.value);
  const required = !forcedOff && (liveMarried || savedMarried);
  const seeded = useMemo(() => coApplicantHasValue(values), [values]);
  const [manualOpen, setManualOpen] = useState(seeded && !forcedOff);
  const open = !forcedOff && (required || manualOpen || seeded);

  useEffect(() => {
    if (forcedOff) {
      setManualOpen(false);
      return;
    }
    if (required) setManualOpen(true);
  }, [required, forcedOff]);

  return (
    <div
      className="border-b border-border/70 last:border-b-0"
      data-ff-co-applicant=""
      data-ff-co-applicant-required={required ? "1" : "0"}
      data-ff-co-applicant-off={forcedOff ? "1" : "0"}
    >
      <div
        className={sheetGroupHeaderClass("Co-applicant")}
        style={SHEET_GROUP_HEADER_STYLE}
        data-ff-sheet-group-header="Co-applicant"
      >
        Co-applicant{required ? " (required — spouse)" : ""}
      </div>
      {forcedOff ? (
        <p className="px-3 py-2 text-sm text-muted-foreground" data-ff-co-applicant-off-hint="">
          No co-applicant
        </p>
      ) : open ? (
        <div
          className="grid grid-cols-1 gap-x-4 gap-y-1 px-2 py-1.5 sm:grid-cols-2"
          data-ff-co-applicant-fields=""
        >
          {CO_APPLICANT_FIELDS.map((field) => {
            const cell = values[field.key];
            let value = cell?.value ?? "";
            if (field.key === "co_applicant_relationship_to_insured" && required && !value.trim()) {
              value = "Spouse";
            }
            if (field.key === "co_applicant_marital_status" && required && !value.trim()) {
              value = "Married";
            }
            const className = cn(
              "h-7 w-full text-xs cursor-text",
              cell?.status === "check" && "ff-field-check",
              (!value.trim() || cell?.status === "missing") && "ff-field-missing",
            );
            const needStar =
              required &&
              ["co_applicant_name", "co_applicant_relationship_to_insured"].includes(field.key);
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
                  {needStar ? " *" : ""}
                </label>
                <div className="min-w-0">
                  {field.options && field.options.length > 0 ? (
                    <select
                      id={`ff-sheet-input-${field.key}`}
                      name={field.key}
                      defaultValue={value}
                      required={needStar}
                      aria-label={field.label}
                      data-ff-sheet-picklist={field.key}
                      className={cn(
                        "border-input bg-background rounded-md border px-2 shadow-xs outline-none",
                        className,
                      )}
                    >
                      <option value="">None</option>
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
                      required={required && field.key === "co_applicant_name"}
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
          onClick={() => setManualOpen(true)}
        >
          + Add co-applicant
        </button>
      )}
    </div>
  );
}
