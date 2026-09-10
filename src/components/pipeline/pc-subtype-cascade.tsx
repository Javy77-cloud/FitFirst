"use client";

import { useMemo, useState } from "react";
import {
  insuranceTypesForFamily,
  policySubtypesForType,
  type InsuranceTypeId,
} from "@/lib/deals/insurance-cascade";

export function PcSubtypeCascade({ defaultSubtypeId = "HO3" }: { defaultSubtypeId?: string }) {
  const types = insuranceTypesForFamily("pc");
  const initialType = useMemo(() => {
    for (const type of types) {
      if (policySubtypesForType("pc", type.id).some((s) => s.id === defaultSubtypeId)) {
        return type.id;
      }
    }
    return "home" as InsuranceTypeId;
  }, [defaultSubtypeId, types]);
  const [typeId, setTypeId] = useState<InsuranceTypeId>(initialType);
  const subtypes = policySubtypesForType("pc", typeId);
  const [subtypeId, setSubtypeId] = useState(
    subtypes.some((s) => s.id === defaultSubtypeId) ? defaultSubtypeId : subtypes[0]?.id ?? "HO3",
  );

  return (
    <div className="flex flex-wrap items-end gap-2" data-ff-pc-subtype-cascade>
      <label className="text-xs">
        Insurance type
        <select
          className="mt-1 block h-8 rounded-md border border-input bg-card px-2 text-sm"
          value={typeId}
          onChange={(event) => {
            const next = event.target.value as InsuranceTypeId;
            setTypeId(next);
            const nextSubs = policySubtypesForType("pc", next);
            setSubtypeId(nextSubs[0]?.id ?? "HO3");
          }}
          aria-label="Insurance type"
        >
          {types.map((type) => (
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
          className="mt-1 block h-8 rounded-md border border-input bg-card px-2 text-sm"
          value={subtypeId}
          onChange={(event) => setSubtypeId(event.target.value)}
          aria-label="Policy subtype"
        >
          {subtypes.map((form) => (
            <option key={form.id} value={form.id}>
              {form.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
