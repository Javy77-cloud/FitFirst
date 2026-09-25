import { recordManualQuoteAction } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";

/** Premium for a carrier already on Markets. Writes a quotes row — no portal pull. */
export function RecordManualQuote({
  dealId,
  carriers,
  shopLine,
  product,
}: {
  dealId: string;
  carriers: { id: string; name: string }[];
  shopLine?: string | null;
  product?: string | null;
}) {
  if (carriers.length === 0) return null;
  return (
    <form
      action={recordManualQuoteAction}
      className="space-y-2 rounded-md border border-border bg-card p-3"
      data-ff-record-manual-quote=""
    >
      <div>
        <h4 className="text-sm font-semibold text-navy">Record manual quote</h4>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="dealId" value={dealId} />
        {shopLine ? <input type="hidden" name="shopLine" value={shopLine} /> : null}
        {product ? <input type="hidden" name="product" value={product} /> : null}
        <label className="min-w-[12rem] flex-1 text-xs text-navy">
          Carrier
          <select
            name="carrierId"
            required
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue=""
            data-ff-record-manual-quote-carrier=""
          >
            <option value="" disabled>
              Select carrier
            </option>
            {carriers.map((carrier) => (
              <option key={carrier.id} value={carrier.id}>
                {carrier.name}
              </option>
            ))}
          </select>
        </label>
        <label className="w-36 text-xs text-navy">
          Premium
          <input
            name="premium"
            type="text"
            inputMode="decimal"
            required
            placeholder="2109"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            data-ff-record-manual-quote-premium=""
          />
        </label>
        <Button type="submit" size="sm" data-ff-record-manual-quote-submit="">
          Record quote
        </Button>
      </div>
    </form>
  );
}
