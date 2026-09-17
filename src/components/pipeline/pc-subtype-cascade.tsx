"use client";

import { useMemo, useState } from "react";
import {
  categoriesForType,
  formsForCategory,
  INSURANCE_TYPE_OPTIONS,
  type InsuranceTypeId,
} from "@/lib/deals/insurance-cascade";

export function PcSubtypeCascade({ defaultSubtypeId = "HO3" }: { defaultSubtypeId?: string }) {
  // Create-deal on P&C board — Type PC → Category → Form.
  const types = INSURANCE_TYPE_OPTIONS.filter((row) => row.id === "pc");
  const initialType = useMemo(() => "pc" as InsuranceTypeId, []);
  const [typeId, setTypeId] = useState<InsuranceTypeId | "">(initialType);
  const categories = typeId === "" ? [] : categoriesForType(typeId);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "home");
  const subtypes =
    typeId === "" || !categoryId ? [] : formsForCategory(typeId, categoryId);
  const [subtypeId, setSubtypeId] = useState(
    subtypes.some((s) => s.id === defaultSubtypeId) ? defaultSubtypeId : subtypes[0]?.id ?? "HO3",
  );

  return (
    <div className="flex flex-wrap items-end gap-2" data-ff-pc-subtype-cascade data-ff-cascade-levels="3">
      <label className="text-xs">
        Pipeline
        <select
          className="mt-1 block h-8 rounded-md border border-input bg-card px-2 text-sm"
          value={typeId}
          onChange={(event) => {
            const next = event.target.value as InsuranceTypeId | "";
            setTypeId(next);
            if (!next) {
              setCategoryId("");
              setSubtypeId("");
              return;
            }
            const nextCats = categoriesForType(next);
            const nextCat = nextCats[0]?.id ?? "";
            setCategoryId(nextCat);
            const nextForms = formsForCategory(next, nextCat);
            setSubtypeId(nextForms[0]?.id ?? "");
          }}
          aria-label="Pipeline"
        >
          <option value="">None</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs">
        Insurance type
        <select
          className="mt-1 block h-8 rounded-md border border-input bg-card px-2 text-sm"
          value={categoryId}
          disabled={!typeId}
          onChange={(event) => {
            const next = event.target.value;
            setCategoryId(next);
            if (!typeId || !next) {
              setSubtypeId("");
              return;
            }
            const nextForms = formsForCategory(typeId, next);
            setSubtypeId(nextForms[0]?.id ?? "");
          }}
          aria-label="Insurance type"
        >
          <option value="">None</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs">
        Policy form
        <select
          name="quotingForm"
          className="mt-1 block h-8 rounded-md border border-input bg-card px-2 text-sm"
          value={subtypeId}
          disabled={!typeId || !categoryId}
          onChange={(event) => setSubtypeId(event.target.value)}
          aria-label="Policy form"
        >
          <option value="">None</option>
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
