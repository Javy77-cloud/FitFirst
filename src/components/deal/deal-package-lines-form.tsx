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
}: {
  dealId: string;
  selected: readonly string[];
  activeLine?: string | null;
  tab?: string | null;
  /** Rail column keeps the button on the Quick Communication edge and opens the picker upward. */
  expand?: "down" | "up";
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

  return (
    <form
      action={setDealPackageLines}
      className={cn("m-0", upward && "flex w-full flex-col-reverse")}
      data-ff-deal-package-edit=""
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="currentLine" value={activeLine ?? ""} />
      <input type="hidden" name="tab" value={tab ?? ""} />
      <button
        type="button"
        className={cn(
          "inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold shadow-sm",
          upward && "w-full justify-center",
          open
            ? "border-navy bg-navy text-white"
            : "border-navy/40 bg-white text-navy hover:bg-navy/5",
        )}
        data-ff-deal-package-toggle=""
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide product picker" : "Add / change products"}
      </button>
      {open ? (
        <div className={cn("rounded-lg border border-border bg-[var(--ff-card)] p-3", upward ? "mb-2" : "mt-2")}>
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
