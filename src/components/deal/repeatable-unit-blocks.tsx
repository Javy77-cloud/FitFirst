"use client";

import { useState } from "react";
import { confirmQuoteSheetField } from "@/app/actions/quote-sheet";
import { DecodeVinButton } from "@/components/deal/decode-vin-button";
import {
  RiskProfileFieldShell,
  RiskProfileFieldsGrid,
} from "@/components/deal/risk-profile-field-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import type { QuoteFieldDef } from "@/lib/quote-sheet/applicant-core";
import {
  canAddAnother,
  fieldsForUnit,
  visibleUnitCount,
  type RepeatableKind,
} from "@/lib/quote-sheet/repeatable-units";
import {
  RiskProfileSectionBar,
  useRiskProfileSectionDensity,
} from "@/components/deal/risk-profile-section-header";
import { riskProfileSectionMaxColumns } from "@/lib/quote-sheet/risk-profile-layout";
import type { ShopLine } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function RepeatableUnitBlocks({
  kind,
  product,
  values,
  extractedByKey,
  dealId,
  line,
}: {
  kind: RepeatableKind;
  product?: string | null;
  values: Record<string, QuoteSheetFieldValue>;
  extractedByKey: Map<string, ExtractedFieldRow>;
  dealId?: string;
  line?: ShopLine;
}) {
  const [count, setCount] = useState(() => visibleUnitCount(values, kind, product));
  const groupTitle =
    kind === "vehicle" ? "Vehicles" : kind === "household" ? "Household" : "Drivers";
  const title =
    kind === "vehicle" ? "Vehicle" : kind === "household" ? "Household member" : "Driver";
  const addLabel =
    kind === "vehicle"
      ? "+ Add vehicle"
      : kind === "household"
        ? "+ Add household member"
        : "+ Add driver";
  const sampleFields = fieldsForUnit(kind, 1).map((field) => unitFieldAsQuote(field, groupTitle));
  const maxColumns = riskProfileSectionMaxColumns(groupTitle, sampleFields);
  const { sectionId, density, setDensity, choices } = useRiskProfileSectionDensity(
    groupTitle,
    maxColumns,
  );

  return (
    <div className="border-b border-border/70 last:border-b-0" data-ff-repeatable-units={kind}>
      <RiskProfileSectionBar
        title={groupTitle}
        sectionId={sectionId}
        density={density}
        onDensityChange={setDensity}
        choices={choices}
      />
      {Array.from({ length: count }, (_, offset) => {
        const index = offset + 1;
        const unitFields = fieldsForUnit(kind, index);
        return (
          <div key={`${kind}-${index}`} className="border-t border-border/60 first:border-t-0" data-ff-unit-block={`${kind}-${index}`}>
            <p className="px-3 py-1.5 text-xs font-semibold text-navy">
              {title} {index}
            </p>
            <RiskProfileFieldsGrid
              density={density}
              fields={unitFields.map((field) => unitFieldAsQuote(field, groupTitle))}
              renderField={(field) => {
                const unit = unitFields.find((item) => item.key === field.key);
                const extracted = extractedByKey.get(field.key);
                const cell = values[field.key];
                const sourceText = extracted?.normalizedValue || extracted?.rawValue || "";
                return (
                  <RiskProfileFieldShell
                    fieldKey={field.key}
                    label={field.label}
                    field={field}
                    footer={
                      sourceText ? (
                        <p className="text-[9px] leading-none text-muted-foreground" data-ff-sheet-source={field.key}>
                          {sourceText}
                        </p>
                      ) : null
                    }
                  >
                    <BlockCell
                      fieldKey={field.key}
                      fieldSuffix={unit?.suffix}
                      input={field.input === "select" || field.input === "number" ? field.input : "text"}
                      options={field.options}
                      cell={cell}
                      dealId={dealId}
                      line={line}
                      kind={kind}
                    />
                  </RiskProfileFieldShell>
                );
              }}
            />
          </div>
        );
      })}
      {canAddAnother(count, product, kind) ? (
        <button
          type="button"
          className="px-3 py-2 text-sm font-medium text-primary hover:underline"
          data-testid={
            kind === "vehicle"
              ? "deal-add-vehicle"
              : kind === "household"
                ? "deal-add-household"
                : "deal-add-driver"
          }
          onClick={() => setCount((current) => current + 1)}
        >
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

function unitFieldAsQuote(
  field: ReturnType<typeof fieldsForUnit>[number],
  group: string,
): QuoteFieldDef {
  return {
    key: field.key,
    label: field.label,
    group,
    input: field.input === "select" || field.input === "number" ? field.input : "text",
    options: field.options ? [...field.options] : undefined,
  };
}

function BlockCell({
  fieldKey,
  fieldSuffix,
  input = "text",
  options,
  cell,
  dealId,
  line,
  kind,
}: {
  fieldKey: string;
  fieldSuffix?: string;
  input?: "text" | "number" | "select";
  options?: readonly string[];
  cell?: QuoteSheetFieldValue;
  dealId?: string;
  line?: ShopLine;
  kind?: RepeatableKind;
}) {
  const className = cn(
    "h-8 text-sm",
    cell?.status === "check" && "ff-field-check",
    (!cell?.value.trim() || cell.status === "missing") && "ff-field-missing",
  );
  return (
    <div className="flex flex-col gap-1">
      {input === "select" && options?.length ? (
        <select
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          defaultValue={cell?.value ?? ""}
          className={cn(className, "w-full rounded-md border border-input bg-background px-2")}
        >
          <option value="">None</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          type={input === "number" ? "number" : "text"}
          defaultValue={cell?.value ?? ""}
          className={className}
        />
      )}
      {cell?.status === "check" ? (
        <Button
          type="submit"
          formAction={async (formData) => {
            formData.set("fieldKey", fieldKey);
            await confirmQuoteSheetField(formData);
          }}
          variant="ghost"
          size="xs"
        >
          Confirm extracted
        </Button>
      ) : null}
      {kind === "vehicle" && fieldSuffix === "vin" && dealId && line === "auto" ? (
        <DecodeVinButton dealId={dealId} line={line} />
      ) : null}
    </div>
  );
}
