"use client";

import { useState } from "react";
import { setDealPackageLines } from "@/app/actions/quote-sheet";
import { ProductPicker } from "@/components/deals/product-picker";
import type { VehicleLabelFact } from "@/lib/deals/product-instance-label";
import { cn } from "@/lib/utils";

export function DealPackageLinesForm({
  dealId,
  selected,
  activeLine,
  tab,
  labelFacts,
  expand = "down",
  tone = "button",
}: {
  dealId: string;
  selected: readonly string[];
  activeLine?: string | null;
  tab?: string | null;
  /** Rail column keeps the picker opening upward so it stays off Quick Communication. */
  expand?: "down" | "up";
  /** `link` sits on the products line. `button` is the stacked control. */
  tone?: "button" | "link";
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
  const [products, setProducts] = useState<string[]>(() => [...selected]);
  const [open, setOpen] = useState(false);
  const upward = expand === "up";
  const link = tone === "link";

  return (
    <form
      action={setDealPackageLines}
      className={cn("m-0", link ? "relative shrink-0" : upward && "flex w-full flex-col-reverse")}
      data-ff-deal-package-edit=""
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="currentLine" value={activeLine ?? ""} />
      <input type="hidden" name="tab" value={tab ?? ""} />
      <button
        type="button"
        className={cn(
          link
            ? "whitespace-nowrap text-[13px] font-semibold text-[var(--ff-accent)]"
            : "inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold shadow-sm",
          !link && upward && "w-full justify-center",
          !link &&
            (open
              ? "border-navy bg-navy text-white"
              : "border-navy/40 bg-white text-navy hover:bg-navy/5"),
        )}
        data-ff-deal-package-toggle=""
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {link ? "Add or change product" : open ? "Hide product picker" : "Add / change products"}
      </button>
      {open ? (
        <div
          className={cn(
            "rounded-lg border border-border bg-[var(--ff-card)] p-3",
            link
              ? "absolute bottom-full right-0 z-40 mb-2 w-[min(22rem,70vw)]"
              : upward
                ? "mb-2"
                : "mt-2",
          )}
        >
          <ProductPicker
            selected={products}
            onChange={setProducts}
            idPrefix={`deal-${dealId}-pkg`}
            labelFacts={labelFacts}
          />
          <button
            type="submit"
            className="mt-2 rounded-md bg-navy px-2.5 py-1 text-[11px] font-semibold text-white"
            data-ff-deal-package-save=""
          >
            Update products
          </button>
        </div>
      ) : null}
    </form>
  );
}
