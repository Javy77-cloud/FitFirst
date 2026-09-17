import type { ReactNode } from "react";
import { LayoutSectionFieldGrid } from "@/components/custom-fields/layout-section-field-grid";
import type { SectionDensity } from "@/lib/custom-fields/types";
import type { QuoteFieldDef } from "@/lib/quote-sheet/applicant-core";
import {
  sheetFieldLayoutHint,
  shortSheetControlClass,
} from "@/lib/quote-sheet/risk-profile-layout";
import { cn } from "@/lib/utils";

export function RiskProfileFieldsGrid({
  density,
  fields,
  renderField,
}: {
  density: SectionDensity;
  fields: readonly QuoteFieldDef[];
  renderField: (field: QuoteFieldDef) => ReactNode;
}) {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  return (
    <div className="px-2 py-1.5" data-ff-risk-profile-fields="">
      <LayoutSectionFieldGrid
        density={density}
        keys={fields.map((field) => field.key)}
        fieldOf={(key) => sheetFieldLayoutHint(byKey.get(key))}
        renderField={(key) => {
          const field = byKey.get(key);
          return field ? renderField(field) : null;
        }}
      />
    </div>
  );
}

export function RiskProfileFieldShell({
  fieldKey,
  label,
  htmlFor,
  required,
  field,
  cascadeKey,
  children,
  footer,
}: {
  fieldKey: string;
  label: string;
  htmlFor?: string;
  required?: boolean;
  field?: QuoteFieldDef;
  cascadeKey?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      id={`sheet-field-${fieldKey}`}
      className="min-w-0 space-y-0.5 rounded-sm px-1 py-0.5 hover:bg-muted/40"
      data-ff-sheet-row={fieldKey}
      data-ff-sheet-cascade={cascadeKey}
    >
      <label
        htmlFor={htmlFor ?? `ff-sheet-input-${fieldKey}`}
        className="block text-xs font-medium leading-snug text-navy"
        data-ff-sheet-label={fieldKey}
      >
        {label}
        {required ? " *" : ""}
      </label>
      <div className={cn("min-w-0", shortSheetControlClass(field))}>{children}</div>
      {footer}
    </div>
  );
}
