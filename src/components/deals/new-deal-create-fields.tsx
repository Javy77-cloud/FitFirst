"use client";

import { useState } from "react";
import { DealFlowRail } from "@/components/deals/deal-flow-rail";
import { ProductPicker } from "@/components/deals/product-picker";
import { normalizeDealProducts, type DealProductId } from "@/lib/deals/deal-products";

export function NewDealCreateFields({
  initialLines,
  sourceDealId,
  products: productsProp,
  onProductsChange,
}: {
  initialLines: readonly string[];
  sourceDealId?: string | null;
  products?: DealProductId[];
  onProductsChange?: (next: DealProductId[]) => void;
}) {
  const [internal, setInternal] = useState<DealProductId[]>(() =>
    normalizeDealProducts(initialLines),
  );
  const products = productsProp ?? internal;
  const setProducts = onProductsChange ?? setInternal;

  return (
    <div className="space-y-3" data-ff-new-deal-create-fields="">
      <input type="hidden" name="intent" value="new-shop" />
      {sourceDealId ? <input type="hidden" name="sourceDealId" value={sourceDealId} /> : null}
      <DealFlowRail current="create" />
      <ProductPicker
        selected={products}
        onChange={setProducts}
        idPrefix="new-deal-pkg"
      />
    </div>
  );
}
