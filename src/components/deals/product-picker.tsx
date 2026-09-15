"use client";

import {
  DEAL_PRODUCT_DEFS,
  DEAL_PRODUCT_GROUPS,
  normalizeDealProducts,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { DEAL_GROUP_THEMES } from "@/lib/deals/product-ui";
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
  const labels = DEAL_PRODUCT_DEFS.filter((row) => picked.has(row.id)).map((row) => row.label);

  function toggle(id: DealProductId, checked: boolean) {
    if (!onChange) return;
    const next = DEAL_PRODUCT_DEFS.filter((row) => (row.id === id ? checked : picked.has(row.id))).map(
      (row) => row.id,
    );
    onChange(normalizeDealProducts(next));
  }

  return (
    <fieldset className="space-y-3" data-ff-package-lines="" data-ff-product-picker="">
      <legend className="text-sm font-semibold text-navy">Products on this deal</legend>
      <p className="text-[13px] leading-snug text-muted-foreground">
        Mix Personal, Commercial, Life, and Health on <span className="font-medium text-navy">one deal</span>.
        Shared questions once — each product keeps its own layout. Nothing is saved until Save Deal.
      </p>
      <div className="flex flex-wrap items-center gap-1.5" data-ff-product-picker-summary="">
        <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">
          {`${picked.size} selected`}
        </span>
        {labels.map((label) => (
          <span
            key={label}
            className="rounded-full border border-navy/25 bg-[var(--ff-card)] px-2 py-0.5 text-[11px] font-medium text-navy"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {DEAL_PRODUCT_GROUPS.map((group) => {
          const theme = DEAL_GROUP_THEMES[group.id];
          const items = DEAL_PRODUCT_DEFS.filter((row) => row.group === group.id);
          const groupCount = items.filter((row) => picked.has(row.id)).length;
          return (
            <div
              key={group.id}
              data-ff-product-group={group.id}
              className={cn("overflow-hidden rounded-lg border border-border", theme.wash)}
            >
              <div className={cn("h-1 w-full", theme.stripe)} />
              <div className="px-3 pb-3 pt-2">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className={cn("text-[11px] font-bold uppercase tracking-wide", theme.ink)}>
                    {group.label}
                    {groupCount ? (
                      <span className="ml-1.5 font-semibold normal-case tracking-normal">
                        · {groupCount}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{theme.blurb}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => {
                    const id = `${idPrefix}-${item.id}`;
                    const checked = picked.has(item.id);
                    return (
                      <label
                        key={item.id}
                        htmlFor={id}
                        className={cn(
                          "relative inline-flex cursor-pointer items-center gap-1.5 rounded-md border-2 px-2.5 py-1.5 text-sm font-medium transition-colors",
                          checked ? theme.selected : "border-border bg-[var(--ff-card)] text-navy hover:border-navy/40",
                          disabled && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <input
                          id={id}
                          type="checkbox"
                          name={name}
                          value={item.id}
                          checked={checked}
                          disabled={disabled}
                          className="sr-only"
                          data-ff-package-line={item.id}
                          data-ff-deal-product={item.id}
                          onChange={(event) => toggle(item.id, event.target.checked)}
                        />
                        {checked ? (
                          <span className="text-[11px] leading-none" aria-hidden>
                            ✓
                          </span>
                        ) : null}
                        {item.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
