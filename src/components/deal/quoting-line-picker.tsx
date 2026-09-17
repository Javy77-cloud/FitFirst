"use client";

import { useMemo, useState } from "react";
import { setQuotingLine } from "@/app/actions/quoting";
import { Button } from "@/components/ui/button";
import {
  cascadeFromDeal,
  categoriesForType,
  formsForCategory,
  insuranceTypesForFamily,
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
  const initial = useMemo(
    () => cascadeFromDeal({ family: "pc", quotingForm: currentForm }),
    [currentForm],
  );
  const [typeId, setTypeId] = useState<InsuranceTypeId | "">(initial.typeId);
  const categories = useMemo(
    () => (typeId === "" ? [] : categoriesForType(typeId)),
    [typeId],
  );
  const [categoryId, setCategoryId] = useState(initial.categoryId || categories[0]?.id || "home");
  const subtypes = useMemo(
    () => (typeId === "" || !categoryId ? [] : formsForCategory(typeId, categoryId)),
    [typeId, categoryId],
  );
  const formFromDeal = coerceQuotingFormId(currentForm);
  const defaultSubtype =
    formFromDeal && subtypes.some((s) => s.id === formFromDeal)
      ? formFromDeal
      : subtypes[0]?.id ?? "HO3";
  const [subtypeId, setSubtypeId] = useState(defaultSubtype);
  const picked = subtypeId ? subtypes.find((s) => s.id === subtypeId) : undefined;

  return (
    <section className="rounded-md border border-primary/30 bg-card p-3">
      <h3 className="text-sm font-semibold text-navy">Choose the quoting line</h3>
      <p className="mt-1 text-helper text-muted-foreground">
        {sourceDocCount > 0
          ? `${sourceDocCount} source doc${sourceDocCount === 1 ? "" : "s"} on this deal. Choose Type → Category → Form before Fill Risk Profile can run.`
          : "Drop a dec, 4-point, or wind mit, then choose Type → Category → Form."}
      </p>
      {picked ? (
        <p className="mt-2 text-xs text-navy">
          Quoting <span className="font-semibold">{picked.label}</span>. Change it if this drop is
          a different line.
        </p>
      ) : (
        <p className="mt-2 text-xs text-fit-yellow">Required before quoting unlocks.</p>
      )}
      <form
        action={setQuotingLine}
        className="mt-3 flex flex-wrap items-end gap-2"
        data-ff-cascade-levels="3"
      >
        <input type="hidden" name="dealId" value={dealId} />
        <label className="text-xs">
          Insurance Type
          <select
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
            className="mt-1 block h-8 min-w-40 rounded-md border border-input bg-card px-2 text-sm"
            data-ff-insurance-type
          >
            <option value="">None</option>
            {insuranceTypesForFamily("pc").map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Insurance Category
          <select
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
            className="mt-1 block h-8 min-w-40 rounded-md border border-input bg-card px-2 text-sm"
            data-ff-insurance-category
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
          Insurance Form
          <select
            name="quotingForm"
            required
            value={subtypeId}
            disabled={!typeId || !categoryId}
            onChange={(event) => setSubtypeId(event.target.value)}
            className="mt-1 block h-8 min-w-48 rounded-md border border-input bg-card px-2 text-sm"
            data-ff-policy-subtype
          >
            <option value="">None</option>
            {subtypes.map((form) => (
              <option key={form.id} value={form.id}>
                {form.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm">
          {picked ? "Update Line And Fill Risk Profile" : "Fill Risk Profile From Those Docs"}
        </Button>
      </form>
    </section>
  );
}
