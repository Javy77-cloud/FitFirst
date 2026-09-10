"use client";

import { useMemo, useState } from "react";
import {
  cascadeFromDeal,
  insuranceTypesForFamily,
  policySubtypesForType,
  type InsuranceTypeId,
  type PipelineFamily,
} from "@/lib/deals/insurance-cascade";

export function InsuranceCascadeControl({
  name,
  form,
  family,
  value,
  quotingForm,
  policySubType,
  lifeHealthOptions = [],
  required,
  disabled,
}: {
  name: string;
  form?: string;
  family: PipelineFamily;
  /** Current field value (label or form id). */
  value: string;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
}) {
  const initial = useMemo(
    () =>
      cascadeFromDeal({
        family,
        quotingForm: quotingForm || value,
        policySubType: policySubType || value,
        lifeHealthOptions,
      }),
    // mount defaults only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const types = insuranceTypesForFamily(family);
  const [typeId, setTypeId] = useState<InsuranceTypeId>(initial.typeId);
  const subtypes = policySubtypesForType(family, typeId, lifeHealthOptions);
  const [subtypeId, setSubtypeId] = useState(initial.subtypeId);

  function onTypeChange(next: InsuranceTypeId) {
    setTypeId(next);
    const nextSubs = policySubtypesForType(family, next, lifeHealthOptions);
    setSubtypeId(nextSubs[0]?.id ?? "");
  }

  const selected = subtypes.find((s) => s.id === subtypeId) ?? subtypes[0];
  const storedValue = selected?.label ?? selected?.id ?? "";

  return (
    <div className="mt-1 space-y-2" data-ff-insurance-cascade={family}>
      <input type="hidden" name={name} value={storedValue} form={form} />
      {family === "pc" ? (
        <label className="block text-xs text-muted-foreground">
          Insurance type
          <select
            value={typeId}
            disabled={disabled}
            required={required}
            onChange={(event) => onTypeChange(event.target.value as InsuranceTypeId)}
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-navy"
            data-ff-insurance-type
            aria-label="Insurance type"
          >
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block text-xs text-muted-foreground">
        Policy subtype
        <select
          value={selected?.id ?? ""}
          disabled={disabled}
          required={required}
          onChange={(event) => setSubtypeId(event.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-navy"
          data-ff-policy-subtype
          aria-label="Policy subtype"
        >
          {subtypes.length === 0 ? <option value="">No subtypes</option> : null}
          {subtypes.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function isInsuranceSubtypeField(field: {
  systemKey?: string | null;
  label?: string;
}): boolean {
  if (field.systemKey === "quotingForm") return true;
  const label = (field.label ?? "").trim().toLowerCase();
  return label === "insurance subtype" || label === "insurance type";
}
