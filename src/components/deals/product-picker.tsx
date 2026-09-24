"use client";

import { useAgencyLobs } from "@/components/desk/agency-lob-context";
import {
  DEAL_PRODUCT_DEFS,
  DEAL_PRODUCT_GROUPS,
  isDealProductId,
  type DealProductId,
} from "@/lib/deals/deal-products";
import {
  addProductInstance,
  normalizeProductInstanceList,
  removeProductInstance,
} from "@/lib/deals/product-instances";
import {
  labelProductInstances,
  type VehicleLabelFact,
} from "@/lib/deals/product-instance-label";
import { DEAL_GROUP_THEMES } from "@/lib/deals/product-ui";
import { cn } from "@/lib/utils";

export function ProductPicker({
  selected,
  onChange,
  name = "shopProducts",
  disabled,
  idPrefix = "deal-product",
  labelFacts,
}: {
  selected: readonly string[];
  onChange?: (next: string[]) => void;
  name?: string;
  disabled?: boolean;
  idPrefix?: string;
  labelFacts?: Partial<
    Record<
      string,
      {
        quotingForm?: string | null;
        sheetForm?: string | null;
        address?: string | null;
        city?: string | null;
        vehicles?: readonly VehicleLabelFact[] | null;
      }
    >
  >;
}) {
  const catalog = useAgencyLobs();
  const instances = normalizeProductInstanceList(selected);
  const allowed = new Set(
    catalog
      .filter((row) => row.active)
      .map((row) => row.productId)
      .filter(isDealProductId),
  );
  const labelById = new Map(catalog.map((row) => [row.productId, row.label]));
  const pickedIds = new Set(instances.map((row) => row.productId));
  const defs = DEAL_PRODUCT_DEFS.filter((row) => allowed.has(row.id) || pickedIds.has(row.id)).map(
    (row) => ({ ...row, label: labelById.get(row.id) ?? row.label }),
  );
  const groups = DEAL_PRODUCT_GROUPS.filter((group) => defs.some((row) => row.group === group.id));
  const instanceLabels = labelProductInstances(
    instances.map((row) => ({
      key: row.key,
      productId: row.productId,
      ...labelFacts?.[row.key],
    })),
  );

  function commit(next: { key: string }[]) {
    onChange?.(next.map((row) => row.key));
  }

  function add(id: DealProductId) {
    commit(addProductInstance(instances.map((row) => row.key), id));
  }

  function remove(key: string) {
    commit(removeProductInstance(instances.map((row) => row.key), key));
  }

  return (
    <fieldset className="space-y-3" data-ff-package-lines="" data-ff-product-picker="">
      <legend className="text-sm font-semibold text-navy">Products on this deal</legend>
      <p className="text-[13px] leading-snug text-muted-foreground">
        Mix Personal, Commercial, Life, and Health on <span className="font-medium text-navy">one deal</span>.
        The same product can be added again for another home or vehicle. Nothing is saved until Save Deal.
      </p>
      <div className="flex flex-wrap items-center gap-1.5" data-ff-product-picker-summary="">
        <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">
          {`${instances.length} selected`}
        </span>
        {instances.map((row) => (
          <span
            key={row.key}
            className="inline-flex items-center gap-1 rounded-full border border-navy/25 bg-[var(--ff-card)] px-2 py-0.5 text-[11px] font-medium text-navy"
            data-ff-product-instance={row.key}
          >
            {instanceLabels.get(row.key) ?? labelById.get(row.productId) ?? row.productId}
            <button
              type="button"
              className="text-muted-foreground hover:text-navy"
              aria-label={`Remove ${instanceLabels.get(row.key) ?? row.productId}`}
              disabled={disabled}
              data-ff-remove-product-instance={row.key}
              onClick={() => remove(row.key)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {instances.map((row) => (
        <input key={row.key} type="hidden" name={name} value={row.key} />
      ))}
      <div className="space-y-3">
        {groups.map((group) => {
          const theme = DEAL_GROUP_THEMES[group.id];
          const items = defs.filter((row) => row.group === group.id);
          const groupCount = instances.filter((row) => items.some((item) => item.id === row.productId)).length;
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
                    const copies = instances.filter((row) => row.productId === item.id);
                    const checked = copies.length > 0;
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
                          value={item.id}
                          checked={checked}
                          disabled={disabled}
                          className="sr-only"
                          data-ff-package-line={item.id}
                          data-ff-deal-product={item.id}
                          onChange={(event) => {
                            if (event.target.checked) add(item.id);
                            else if (copies[copies.length - 1]) remove(copies[copies.length - 1]!.key);
                          }}
                        />
                        {checked ? (
                          <span className="text-[11px] leading-none" aria-hidden>
                            ✓
                          </span>
                        ) : null}
                        {item.label}
                        {copies.length > 1 ? <span className="text-xs">×{copies.length}</span> : null}
                        {checked ? (
                          <button
                            type="button"
                            className="ml-1 text-xs underline"
                            disabled={disabled}
                            data-ff-add-product-instance={item.id}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              add(item.id);
                            }}
                          >
                            Add another
                          </button>
                        ) : null}
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
