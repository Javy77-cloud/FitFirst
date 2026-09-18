"use client";

import { useState, useTransition } from "react";
import { saveDealInsuredPropertyKind } from "@/app/actions/custom-fields";
import {
  INSURED_PROPERTY_KIND_KEY,
  INSURED_PROPERTY_KIND_OPTIONS,
  defaultInsuredPropertyKind,
  insuredPropertyKindLabel,
  parseInsuredPropertyKind,
} from "@/lib/deals/insured-property-kind";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

export function InsuredPropertyKindControl({
  dealId,
  value,
  product,
  quotingForm,
  sheetUsage,
  occupancy,
  tone = "deal",
}: {
  dealId: string;
  value?: string | null;
  product?: string | null;
  quotingForm?: string | null;
  sheetUsage?: string | null;
  occupancy?: string | null;
  tone?: "deal" | "sheet";
}) {
  const inferred = defaultInsuredPropertyKind({ product, quotingForm, sheetUsage, occupancy });
  const parsed = parseInsuredPropertyKind(value) ?? inferred;
  const [current, setCurrent] = useState(parsed ? insuredPropertyKindLabel(parsed) : "");
  const [pending, startTransition] = useTransition();

  function onPick(next: string) {
    setCurrent(next);
    startTransition(async () => {
      const result = await saveDealInsuredPropertyKind({ dealId, value: next });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        return;
      }
      flashAction("Saved");
    });
  }

  return (
    <div
      className={cn("min-w-0", pending && "opacity-60")}
      data-ff-insured-property-kind=""
      data-ff-record-field={INSURED_PROPERTY_KIND_KEY}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        Property use
      </p>
      <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label="Property use">
        {INSURED_PROPERTY_KIND_OPTIONS.map((option) => {
          const selected = current === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(option)}
              className={cn(
                "rounded-sm px-2 py-1 text-[11px] leading-none",
                selected
                  ? "bg-[#002868] font-semibold text-white"
                  : "bg-transparent text-muted-foreground hover:bg-muted",
                tone === "sheet" && !selected && "hover:bg-white/10",
              )}
              data-ff-insured-property-kind-option={option}
            >
              {option}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Only a primary residence copies onto the Contact profile address.
      </p>
      <input type="hidden" name={`field_${INSURED_PROPERTY_KIND_KEY}`} value={current} />
    </div>
  );
}
