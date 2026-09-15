"use client";

import { useMemo, useState } from "react";
import {
  cascadeFromDeal,
  categoriesForType,
  formsForCategory,
  INSURANCE_TYPE_OPTIONS,
  type InsuranceTypeId,
  type PipelineFamily,
} from "@/lib/deals/insurance-cascade";
import type { PcPackageLine } from "@/lib/deals/package-lines";
import { DEFAULT_HEALTH_SUBFILTERS, DEFAULT_LIFE_SUBFILTERS } from "@/lib/desk/line-settings";

function typeIdFromLabel(raw: string | null | undefined): InsuranceTypeId | "" {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return "";
  if (v === "pc" || v === "p&c" || v === "p-c" || v.includes("propert")) return "pc";
  if (v === "life" || v.startsWith("life")) return "life";
  if (v === "health" || v.startsWith("health")) return "health";
  // Legacy product-line labels on Type → treat as PC
  return "pc";
}

export function InsuranceCascadeControl({
  typeName = "field_insurance_type",
  categoryName = "field_insurance_category",
  subtypeName,
  form,
  family,
  typeValue = "",
  categoryValue = "",
  value,
  quotingForm,
  policySubType,
  lifeOptions = [],
  healthOptions = [],
  /** @deprecated prefer lifeOptions + healthOptions */
  lifeHealthOptions = [],
  required,
  disabled,
  packageLines = [],
  activePackageLine = null,
}: {
  /** Hidden input name for parent Insurance Type (PC / Life / Health). */
  typeName?: string;
  /** Hidden input name for middle Insurance Category. */
  categoryName?: string;
  /** Hidden input name for child Insurance subtype / form. */
  subtypeName: string;
  form?: string;
  family: PipelineFamily;
  /** Current insurance_type field value (label). */
  typeValue?: string;
  /** Current insurance_category field value (label). */
  categoryValue?: string;
  /** Current subtype field value (label or form id). */
  value: string;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeOptions?: Array<{ slug?: string; label: string }>;
  healthOptions?: Array<{ slug?: string; label: string }>;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
  packageLines?: readonly PcPackageLine[];
  activePackageLine?: PcPackageLine | null;
}) {
  const lifeOpts = lifeOptions.length
    ? lifeOptions
    : lifeHealthOptions.length
      ? lifeHealthOptions
      : DEFAULT_LIFE_SUBFILTERS;
  const healthOpts = healthOptions.length
    ? healthOptions
    : DEFAULT_HEALTH_SUBFILTERS;

  const packageMode = packageLines.length > 0 && family === "pc";
  const initial = useMemo(() => {
    const fromType = packageMode ? "pc" : typeIdFromLabel(typeValue);
    const opts =
      fromType === "health" ? healthOpts : fromType === "life" ? lifeOpts : lifeOpts;
    const base = cascadeFromDeal({
      family: fromType || family,
      quotingForm: quotingForm || value,
      policySubType: policySubType || value,
      categoryValue:
        activePackageLine && activePackageLine !== "home"
          ? activePackageLine
          : categoryValue || undefined,
      lifeHealthOptions: opts,
    });
    return {
      typeId: (fromType || base.typeId) as InsuranceTypeId,
      categoryId:
        activePackageLine && activePackageLine !== "home" ? activePackageLine : base.categoryId,
      subtypeId: base.subtypeId,
    };
    // mount defaults only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const types = INSURANCE_TYPE_OPTIONS;
  const [typeId, setTypeId] = useState<InsuranceTypeId | "">(initial.typeId);

  function optsFor(next: InsuranceTypeId | "") {
    if (next === "life") return lifeOpts;
    if (next === "health") return healthOpts;
    return [];
  }

  const categories = typeId === "" ? [] : categoriesForType(typeId, optsFor(typeId));
  const [categoryId, setCategoryId] = useState(initial.categoryId || categories[0]?.id || "");

  const subtypes =
    typeId === "" || !categoryId
      ? []
      : formsForCategory(typeId, categoryId, optsFor(typeId));
  const [subtypeId, setSubtypeId] = useState(initial.subtypeId);

  function onTypeChange(next: InsuranceTypeId | "") {
    setTypeId(next);
    if (!next) {
      setCategoryId("");
      setSubtypeId("");
      return;
    }
    const nextCats = categoriesForType(next, optsFor(next));
    const nextCat = nextCats[0]?.id ?? "";
    setCategoryId(nextCat);
    const nextForms = formsForCategory(next, nextCat, optsFor(next));
    setSubtypeId(nextForms[0]?.id ?? "");
  }

  function onCategoryChange(next: string) {
    setCategoryId(next);
    if (!typeId || !next) {
      setSubtypeId("");
      return;
    }
    const nextForms = formsForCategory(typeId, next, optsFor(typeId));
    setSubtypeId(nextForms[0]?.id ?? "");
  }

  const selectedCat = categoryId
    ? categories.find((c) => c.id === categoryId)
    : undefined;
  const selected = subtypeId ? subtypes.find((s) => s.id === subtypeId) : undefined;
  const storedSubtype = selected?.label ?? selected?.id ?? "";
  const storedType = typeId ? (types.find((t) => t.id === typeId)?.label ?? "") : "";
  const storedCategory = selectedCat?.label ?? "";

  return (
    <div className="mt-1 space-y-2" data-ff-insurance-cascade={family} data-ff-cascade-levels="3">
      <input type="hidden" name={typeName} value={storedType} form={form} data-ff-cascade-type-value={storedType} />
      <input
        type="hidden"
        name={categoryName}
        value={storedCategory}
        form={form}
        data-ff-cascade-category-value={storedCategory}
      />
      <input
        type="hidden"
        name={subtypeName}
        value={storedSubtype}
        form={form}
        data-ff-cascade-subtype-value={storedSubtype}
      />
      <label className="block text-xs text-muted-foreground">
        Pipeline
        <select
          value={typeId}
          disabled={disabled || packageMode}
          required={required}
          onChange={(event) => onTypeChange(event.target.value as InsuranceTypeId | "")}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-navy"
          data-ff-insurance-type
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
      <label className="block text-xs text-muted-foreground">
        Insurance Category
        <select
          value={selectedCat?.id ?? categoryId ?? ""}
          disabled={
            disabled ||
            !typeId ||
            (packageMode && Boolean(activePackageLine && activePackageLine !== "home"))
          }
          required={required}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-navy"
          data-ff-insurance-category
          aria-label="Insurance Category"
        >
          <option value="">None</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-muted-foreground">
        Insurance Form
        <select
          value={selected?.id ?? subtypeId ?? ""}
          disabled={disabled || !typeId || !categoryId}
          required={required}
          onChange={(event) => setSubtypeId(event.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-navy"
          data-ff-policy-subtype
          aria-label="Insurance Form"
        >
          <option value="">None</option>
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
  key?: string;
}): boolean {
  if (field.systemKey === "quotingForm") return true;
  if (field.key === "insurance_subtype") return true;
  const label = (field.label ?? "").trim().toLowerCase();
  return label === "insurance subtype" || label === "insurance form";
}

export function isInsuranceCategoryField(field: {
  systemKey?: string | null;
  label?: string;
  key?: string;
}): boolean {
  if (field.key === "insurance_category") return true;
  const label = (field.label ?? "").trim().toLowerCase();
  return label === "insurance category" || label === "insurance line";
}

export function isInsuranceTypeField(field: {
  systemKey?: string | null;
  label?: string;
  key?: string;
}): boolean {
  if (field.key === "insurance_type") return true;
  const label = (field.label ?? "").trim().toLowerCase();
  return label === "insurance type";
}

/** Parent / middle / child of the Insurance Type → Category → Form cascade. */
export function isInsuranceCascadeField(field: {
  systemKey?: string | null;
  label?: string;
  key?: string;
}): boolean {
  return (
    isInsuranceTypeField(field) ||
    isInsuranceCategoryField(field) ||
    isInsuranceSubtypeField(field)
  );
}
