"use client";

import { useState } from "react";
import { setDealPackageLines } from "@/app/actions/quote-sheet";
import { ProductPicker } from "@/components/deals/product-picker";
import { normalizeDealProducts, type DealProductId } from "@/lib/deals/deal-products";

export function DealPackageLinesForm({
  dealId,
  selected,
  activeLine,
  tab,
}: {
  dealId: string;
  selected: readonly string[];
  activeLine?: string | null;
  tab?: string | null;
}) {
  const [products, setProducts] = useState<DealProductId[]>(() => normalizeDealProducts(selected));
  const [open, setOpen] = useState(false);

  return (
    <form action={setDealPackageLines} className="m-0" data-ff-deal-package-edit="">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="currentLine" value={activeLine ?? ""} />
      <input type="hidden" name="tab" value={tab ?? ""} />
      <button
        type="button"
        className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:underline hover:text-navy"
        data-ff-deal-package-toggle=""
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide product picker" : "Add / change products"}
      </button>
      {open ? (
        <div className="mt-2 rounded-lg border border-border bg-[var(--ff-card)] p-3">
          <ProductPicker
            selected={products}
            onChange={setProducts}
            idPrefix={`deal-${dealId}-pkg`}
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
