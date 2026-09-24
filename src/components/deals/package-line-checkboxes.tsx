"use client";

import { ProductPicker } from "@/components/deals/product-picker";
import { normalizeDealProducts } from "@/lib/deals/deal-products";

/** Grouped product picker — keeps the old export name for existing create-form wiring. */
export function PackageLineCheckboxes({
  selected,
  onChange,
  name = "shopProducts",
  disabled,
  idPrefix = "package-line",
}: {
  selected: readonly string[];
  onChange?: (next: string[]) => void;
  name?: string;
  disabled?: boolean;
  idPrefix?: string;
}) {
  return (
    <ProductPicker
      selected={normalizeDealProducts(selected)}
      onChange={onChange}
      name={name}
      disabled={disabled}
      idPrefix={idPrefix}
    />
  );
}
