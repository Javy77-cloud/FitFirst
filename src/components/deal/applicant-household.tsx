"use client";

import { useMemo, useState } from "react";
import { CoApplicantBlock } from "@/components/deal/co-applicant-block";
import {
  RiskProfileFieldShell,
  RiskProfileFieldsGrid,
} from "@/components/deal/risk-profile-field-grid";
import { Input } from "@/components/ui/input";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { APPLICANT_CORE_FIELDS } from "@/lib/quote-sheet/applicant-core";
import {
  RiskProfileSectionBar,
  useRiskProfileSectionDensity,
} from "@/components/deal/risk-profile-section-header";
import { riskProfileSectionMaxColumns } from "@/lib/quote-sheet/risk-profile-layout";
import { cn } from "@/lib/utils";

/** Applicant + Co-applicant together so Married can require a spouse live. */
export function ApplicantHousehold({
  values,
  hasCoApplicantFlag,
}: {
  values: Record<string, QuoteSheetFieldValue>;
  hasCoApplicantFlag?: string | null;
}) {
  const [marital, setMarital] = useState(values.applicant_marital_status?.value ?? "");
  const applicantFields = useMemo(() => APPLICANT_CORE_FIELDS, []);
  const maxColumns = riskProfileSectionMaxColumns("Applicant", applicantFields);
  const { sectionId, density, setDensity, choices } = useRiskProfileSectionDensity(
    "Applicant",
    maxColumns,
  );

  return (
    <>
      <div className="border-b border-border/70 last:border-b-0" data-ff-sheet-group="Applicant">
        <RiskProfileSectionBar
          title="Applicant"
          sectionId={sectionId}
          density={density}
          onDensityChange={setDensity}
          choices={choices}
        />
        <RiskProfileFieldsGrid
          density={density}
          fields={applicantFields}
          renderField={(field) => {
            const cell = values[field.key];
            const value =
              field.key === "applicant_marital_status" ? marital : (cell?.value ?? "");
            const className = cn(
              "h-7 w-full min-w-0 text-xs cursor-text",
              cell?.status === "check" && "ff-field-check",
              (!String(value).trim() || cell?.status === "missing") && "ff-field-missing",
            );
            return (
              <RiskProfileFieldShell fieldKey={field.key} label={field.label} field={field}>
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
                    <option value="">None</option>
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
              </RiskProfileFieldShell>
            );
          }}
        />
      </div>
      <CoApplicantBlock
        values={values}
        maritalStatus={marital}
        hasCoApplicantFlag={hasCoApplicantFlag}
      />
    </>
  );
}
