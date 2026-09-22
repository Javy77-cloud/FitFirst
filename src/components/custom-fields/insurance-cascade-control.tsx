"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cascadeFromDeal,
  categoriesForType,
  formsForCategory,
  INSURANCE_TYPE_OPTIONS,
  type InsuranceTypeId,
  type PipelineFamily,
} from "@/lib/deals/insurance-cascade";
import type { PcPackageLine } from "@/lib/deals/package-lines";
import { isPcPackageLine } from "@/lib/deals/package-lines";
import {
  DEFAULT_HEALTH_SUBFILTERS,
  DEFAULT_LIFE_SUBFILTERS,
  visibleInsuranceTypes,
  type DeskLineSettings,
} from "@/lib/desk/line-settings";

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
  lineSettings,
  variant = "stack",
  onPolicyFormChange,
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
  packageLines?: readonly string[];
  activePackageLine?: string | null;
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  /** Horizontal required strip on Deal Details; stacked elsewhere. */
  variant?: "stack" | "strip";
  /** Selected policy form label, so MHO-only Details can show or hide live. */
  onPolicyFormChange?: (formLabel: string) => void;
}) {
  const lifeOpts = lifeOptions.length
    ? lifeOptions
    : lifeHealthOptions.length
      ? lifeHealthOptions
      : DEFAULT_LIFE_SUBFILTERS;
  const healthOpts = healthOptions.length
    ? healthOptions
    : DEFAULT_HEALTH_SUBFILTERS;

  const packageMode =
    family === "pc" &&
    packageLines.length > 0 &&
    packageLines.every((line) => isPcPackageLine(line));
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

  const types = visibleInsuranceTypes(INSURANCE_TYPE_OPTIONS, lineSettings);
  const typeChoices =
    initial.typeId && !types.some((row) => row.id === initial.typeId)
      ? [...types, ...INSURANCE_TYPE_OPTIONS.filter((row) => row.id === initial.typeId)]
      : types;
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
  useEffect(() => {
    onPolicyFormChange?.(storedSubtype);
  }, [onPolicyFormChange, storedSubtype]);
  const storedType = typeId ? (typeChoices.find((t) => t.id === typeId)?.label ?? "") : "";
  const storedCategory = selectedCat?.label ?? "";

  const mustFill = required !== false;
  const typeEmpty = !typeId;
  const categoryEmpty = !categoryId;
  const formEmpty = !subtypeId;
  const selectClass = (empty: boolean) =>
    `mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm text-navy ${
      mustFill && empty ? "border-red-600" : "border-border"
    }`;

  return (
    <div
      className={
        variant === "strip"
          ? "grid grid-cols-3 gap-3 max-[699px]:grid-cols-1"
          : "mt-1 space-y-2"
      }
      data-ff-insurance-cascade={family}
      data-ff-cascade-levels="3"
      data-ff-cascade-variant={variant}
    >
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
      <label className="block text-xs font-medium text-red-700" data-ff-required-field="pipeline">
        Pipeline{" "}
        <span aria-hidden="true">*</span>
        <select
          value={typeId}
          disabled={disabled || packageMode}
          required={mustFill}
          aria-required={mustFill || undefined}
          aria-invalid={mustFill && typeEmpty ? true : undefined}
          onChange={(event) => onTypeChange(event.target.value as InsuranceTypeId | "")}
          className={selectClass(typeEmpty)}
          data-ff-insurance-type
          aria-label="Pipeline"
        >
          <option value="">None</option>
          {typeChoices.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-red-700" data-ff-required-field="insurance-type">
        Insurance type{" "}
        <span aria-hidden="true">*</span>
        <select
          value={selectedCat?.id ?? categoryId ?? ""}
          disabled={
            disabled ||
            !typeId ||
            (packageMode && Boolean(activePackageLine && activePackageLine !== "home"))
          }
          required={mustFill}
          aria-required={mustFill || undefined}
          aria-invalid={mustFill && categoryEmpty ? true : undefined}
          onChange={(event) => onCategoryChange(event.target.value)}
          className={selectClass(categoryEmpty)}
          data-ff-insurance-category
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
      <label className="block text-xs font-medium text-red-700" data-ff-required-field="policy-form">
        Policy form{" "}
        <span aria-hidden="true">*</span>
        <select
          value={selected?.id ?? subtypeId ?? ""}
          disabled={disabled || !typeId || !categoryId}
          required={mustFill}
          aria-required={mustFill || undefined}
          aria-invalid={mustFill && formEmpty ? true : undefined}
          onChange={(event) => setSubtypeId(event.target.value)}
          className={selectClass(formEmpty)}
          data-ff-policy-subtype
          aria-label="Policy form"
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
  return label === "insurance subtype" || label === "insurance form" || label === "policy form";
}

export function isInsuranceCategoryField(field: {
  systemKey?: string | null;
  label?: string;
  key?: string;
}): boolean {
  if (field.key === "insurance_category") return true;
  const label = (field.label ?? "").trim().toLowerCase();
  return label === "insurance category" || label === "insurance line" || label === "insurance type";
}

export function isInsuranceTypeField(field: {
  systemKey?: string | null;
  label?: string;
  key?: string;
}): boolean {
  if (field.key === "insurance_type") return true;
  const label = (field.label ?? "").trim().toLowerCase();
  // "Insurance type" is now the middle (category) label — do not match it here.
  return label === "pipeline" && field.key !== "pipeline";
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
