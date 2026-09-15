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

  return (
    <form action={setDealPackageLines} className="mt-2" data-ff-deal-package-edit="">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="currentLine" value={activeLine ?? ""} />
      <input type="hidden" name="tab" value={tab ?? ""} />
      <ProductPicker
        selected={products}
        onChange={setProducts}
        idPrefix={`deal-${dealId}-pkg`}
      />
      <button
        type="submit"
        className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
        data-ff-deal-package-save=""
      >
        Update products
      </button>
    </form>
  );
}
