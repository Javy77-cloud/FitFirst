"use client";

import { useMemo, useState } from "react";
import { setQuotingLine } from "@/app/actions/quoting";
import { Button } from "@/components/ui/button";
import {
  insuranceTypesForFamily,
  policySubtypesForType,
  insuranceTypeForQuotingForm,
  type InsuranceTypeId,
} from "@/lib/deals/insurance-cascade";
import { coerceQuotingFormId } from "@/lib/quoting/forms";

export function QuotingLinePicker({
  dealId,
  currentForm,
  sourceDocCount,
}: {
  dealId: string;
  currentForm?: string | null;
  sourceDocCount: number;
}) {
  const initialType =
    insuranceTypeForQuotingForm(currentForm) ?? ("home" as InsuranceTypeId);
  const [typeId, setTypeId] = useState<InsuranceTypeId>(initialType);
  const subtypes = useMemo(() => policySubtypesForType("pc", typeId), [typeId]);
  const defaultSubtype =
    coerceQuotingFormId(currentForm) &&
    subtypes.some((s) => s.id === coerceQuotingFormId(currentForm))
      ? coerceQuotingFormId(currentForm)!
      : subtypes[0]?.id ?? "HO3";
  const [subtypeId, setSubtypeId] = useState(defaultSubtype);
  const picked = subtypes.find((s) => s.id === subtypeId);

  return (
    <section className="rounded-md border border-primary/30 bg-card p-3">
      <h3 className="text-sm font-semibold text-navy">Choose the quoting line</h3>
      <p className="mt-1 text-helper text-muted-foreground">
        {sourceDocCount > 0
          ? `${sourceDocCount} source doc${sourceDocCount === 1 ? "" : "s"} on this deal. Choose insurance type then policy subtype before Fill master sheet can run.`
          : "Drop a dec, 4-point, or wind mit, then choose insurance type and policy subtype."}
      </p>
      {picked ? (
        <p className="mt-2 text-xs text-navy">
          Quoting <span className="font-semibold">{picked.label}</span>. Change it if this drop is
          a different line.
        </p>
      ) : (
        <p className="mt-2 text-xs text-fit-yellow">Required before quoting unlocks.</p>
      )}
      <form action={setQuotingLine} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="dealId" value={dealId} />
        <label className="text-xs">
          Insurance type
          <select
            value={typeId}
            onChange={(event) => {
              const next = event.target.value as InsuranceTypeId;
              setTypeId(next);
              const nextSubs = policySubtypesForType("pc", next);
              setSubtypeId(nextSubs[0]?.id ?? "HO3");
            }}
            className="mt-1 block h-8 min-w-40 rounded-md border border-input bg-card px-2 text-sm"
            data-ff-insurance-type
          >
            {insuranceTypesForFamily("pc").map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Policy subtype
          <select
            name="quotingForm"
            required
            value={subtypeId}
            onChange={(event) => setSubtypeId(event.target.value)}
            className="mt-1 block h-8 min-w-48 rounded-md border border-input bg-card px-2 text-sm"
            data-ff-policy-subtype
          >
            {subtypes.map((form) => (
              <option key={form.id} value={form.id}>
                {form.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm">
          {picked ? "Update line and fill master sheet" : "Fill master sheet from those docs"}
        </Button>
      </form>
    </section>
  );
}
