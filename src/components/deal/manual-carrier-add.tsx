import { addManualMarket } from "@/app/actions/deal-desk";
import { Button } from "@/components/ui/button";
import { carriersForDealLine } from "@/lib/deals/carriers-for-line";

export function ManualCarrierAdd({
  dealId,
  carriers,
  alreadyIds,
  dealLine,
  line,
  product,
}: {
  dealId: string;
  carriers: { id: string; name: string; writtenLines?: string[] | null }[];
  alreadyIds: string[];
  dealLine: string;
  line?: string | null;
  product?: string | null;
}) {
  const available = carriersForDealLine(carriers, dealLine).filter(
    (carrier) => !alreadyIds.includes(carrier.id),
  );

  return (
    <form action={addManualMarket} className="flex flex-wrap items-end gap-2" data-ff-manual-carrier>
      <input type="hidden" name="dealId" value={dealId} />
      {line ? <input type="hidden" name="line" value={line} /> : null}
      {product ? <input type="hidden" name="product" value={product} /> : null}
      <label className="min-w-[12rem] flex-1 text-xs">
        Add carrier manually
        <select
          name="carrierId"
          required
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Carriers that write this line
          </option>
          {available.map((carrier) => (
            <option key={carrier.id} value={carrier.id}>
              {carrier.name}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" variant="outline" disabled={available.length === 0}>
        Add · manual tag
      </Button>
    </form>
  );
}
