"use client";

import { useState } from "react";
import { confirmQuoteSheetField } from "@/app/actions/quote-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import {
  canAddAnother,
  fieldsForUnit,
  visibleUnitCount,
  type RepeatableKind,
} from "@/lib/quote-sheet/repeatable-units";
import { cn } from "@/lib/utils";

export function RepeatableUnitBlocks({
  kind,
  product,
  values,
  extractedByKey,
}: {
  kind: RepeatableKind;
  product?: string | null;
  values: Record<string, QuoteSheetFieldValue>;
  extractedByKey: Map<string, ExtractedFieldRow>;
}) {
  const [count, setCount] = useState(() => visibleUnitCount(values, kind, product));
  const title = kind === "vehicle" ? "Vehicle" : "Driver";
  const addLabel = kind === "vehicle" ? "+ Add vehicle" : "+ Add driver";

  return (
    <div className="border-b border-border/70 last:border-b-0" data-ff-repeatable-units={kind}>
      <div className="sticky top-0 z-10 bg-muted/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy">
        {kind === "vehicle" ? "Vehicles" : "Drivers"}
      </div>
      {Array.from({ length: count }, (_, offset) => {
        const index = offset + 1;
        return (
          <div key={`${kind}-${index}`} className="border-t border-border/60 first:border-t-0" data-ff-unit-block={`${kind}-${index}`}>
            <p className="px-3 py-1.5 text-xs font-semibold text-navy">
              {title} {index}
            </p>
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Source</th>
                  <th>Sheet</th>
                </tr>
              </thead>
              <tbody>
                {fieldsForUnit(kind, index).map((field) => {
                  const extracted = extractedByKey.get(field.key);
                  const cell = values[field.key];
                  const sourceText = extracted?.normalizedValue || extracted?.rawValue || "";
                  return (
                    <tr key={field.key} id={`sheet-field-${field.key}`}>
                      <td className="align-top font-medium">{field.label}</td>
                      <td className="align-top text-muted-foreground">{sourceText || "—"}</td>
                      <td className="align-top">
                        <BlockCell fieldKey={field.key} input={field.input} cell={cell} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      {canAddAnother(count, product) ? (
        <button
          type="button"
          className="px-3 py-2 text-sm font-medium text-primary hover:underline"
          data-testid={kind === "vehicle" ? "deal-add-vehicle" : "deal-add-driver"}
          onClick={() => setCount((current) => current + 1)}
        >
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

function BlockCell({
  fieldKey,
  input = "text",
  cell,
}: {
  fieldKey: string;
  input?: "text" | "number";
  cell?: QuoteSheetFieldValue;
}) {
  const className = cn(
    "h-8 text-sm",
    cell?.status === "check" && "ff-field-check",
    (!cell?.value.trim() || cell.status === "missing") && "ff-field-missing",
  );
  return (
    <div className="flex flex-col gap-1">
      <Input
        name={fieldKey}
        type={input}
        defaultValue={cell?.value ?? ""}
        className={className}
      />
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
    </div>
  );
}
