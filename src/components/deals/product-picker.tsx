"use client";

import {
  DEAL_PRODUCT_DEFS,
  DEAL_PRODUCT_GROUPS,
  normalizeDealProducts,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { cn } from "@/lib/utils";

export function ProductPicker({
  selected,
  onChange,
  name = "shopProducts",
  disabled,
  idPrefix = "deal-product",
}: {
  selected: readonly DealProductId[];
  onChange?: (next: DealProductId[]) => void;
  name?: string;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const picked = new Set(selected);

  function toggle(id: DealProductId, checked: boolean) {
    if (!onChange) return;
    const next = DEAL_PRODUCT_DEFS.filter((row) => (row.id === id ? checked : picked.has(row.id))).map(
      (row) => row.id,
    );
    onChange(normalizeDealProducts(next));
  }

  return (
    <fieldset className="space-y-2" data-ff-package-lines="" data-ff-product-picker="">
      <legend className="text-xs font-medium text-navy">Products</legend>
      <p className="text-[11px] text-muted-foreground">
        Mix Personal, Commercial, Life, and Health on one deal. Nothing is saved until Save Deal.
      </p>
      <div className="space-y-2.5">
        {DEAL_PRODUCT_GROUPS.map((group) => {
          const items = DEAL_PRODUCT_DEFS.filter((row) => row.group === group.id);
          return (
            <div key={group.id} data-ff-product-group={group.id}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {items.map((item) => {
                  const id = `${idPrefix}-${item.id}`;
                  const checked = picked.has(item.id);
                  return (
                    <label
                      key={item.id}
                      htmlFor={id}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-sm text-navy",
                        disabled && "opacity-60",
                      )}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        name={name}
                        value={item.id}
                        checked={checked}
                        disabled={disabled}
                        className="h-3.5 w-3.5 accent-[#002868]"
                        data-ff-package-line={item.id}
                        data-ff-deal-product={item.id}
                        onChange={(event) => toggle(item.id, event.target.checked)}
                      />
                      {item.label}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
