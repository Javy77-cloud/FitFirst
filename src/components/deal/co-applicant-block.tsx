"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RiskProfileFieldShell,
  RiskProfileFieldsGrid,
} from "@/components/deal/risk-profile-field-grid";
import { Input } from "@/components/ui/input";
import type { SectionDensity } from "@/lib/custom-fields/types";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { DEFAULT_RISK_PROFILE_DENSITY } from "@/lib/quote-sheet/risk-profile-layout";
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
  density = DEFAULT_RISK_PROFILE_DENSITY,
}: {
  values: Record<string, QuoteSheetFieldValue>;
  maritalStatus?: string;
  /** Raw Deal Details `has_co_applicant` value (true/false). Explicit Off collapses + skips required. */
  hasCoApplicantFlag?: string | null;
  density?: SectionDensity;
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
    // Keep spouse fields open when Married (or explicit Off) changes after first paint.
    /* eslint-disable react-hooks/set-state-in-effect -- pre-existing marital/forced-off sync */
    if (forcedOff) {
      setManualOpen(false);
      return;
    }
    if (required) setManualOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
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
        <div data-ff-co-applicant-fields="">
          <RiskProfileFieldsGrid
            density={density}
            fields={CO_APPLICANT_FIELDS}
            renderField={(field) => {
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
                <RiskProfileFieldShell
                  fieldKey={field.key}
                  label={field.label}
                  field={field}
                  required={needStar}
                >
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
                </RiskProfileFieldShell>
              );
            }}
          />
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
