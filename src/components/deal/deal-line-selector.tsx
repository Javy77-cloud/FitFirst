"use client";

import { setDealSheetProduct } from "@/app/actions/quote-sheet";
import { Label } from "@/components/ui/label";
import { useAgencyLobs } from "@/components/desk/agency-lob-context";
import { DEAL_LINE_OPTIONS } from "@/lib/deals/deal-line";
import { isSheetProduct, type SheetProduct } from "@/lib/quote-sheet/products";

export function DealLineSelector({
  dealId,
  product,
}: {
  dealId: string;
  product: SheetProduct;
}) {
  const catalog = useAgencyLobs();
  const fromCatalog = catalog
    .filter((row) => row.active && isSheetProduct(row.sheetProduct))
    .map((row) => ({ value: row.sheetProduct as SheetProduct, label: row.label }));
  const seen = new Set<string>();
  const options = (fromCatalog.length ? fromCatalog : DEAL_LINE_OPTIONS).filter((row) => {
    if (seen.has(row.value)) return false;
    seen.add(row.value);
    return true;
  });
  return (
    <form action={setDealSheetProduct} className="mt-1 max-w-sm" data-ff-deal-lob>
      <input type="hidden" name="dealId" value={dealId} />
      <Label htmlFor="deal-line-of-business" className="mb-1 text-sm font-medium text-navy">
        Line of business.
      </Label>
      <select
        id="deal-line-of-business"
        name="product"
        defaultValue={product}
        className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
