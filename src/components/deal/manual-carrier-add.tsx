import { addManualMarket } from "@/app/actions/deal-desk";
import { Button } from "@/components/ui/button";

export function ManualCarrierAdd({
  dealId,
  carriers,
  alreadyIds,
}: {
  dealId: string;
  carriers: { id: string; name: string }[];
  alreadyIds: string[];
}) {
  const available = carriers.filter((carrier) => !alreadyIds.includes(carrier.id));

  return (
    <form action={addManualMarket} className="flex flex-wrap items-end gap-2" data-ff-manual-carrier>
      <input type="hidden" name="dealId" value={dealId} />
      <label className="min-w-[12rem] flex-1 text-xs">
        Add carrier manually
        <select
          name="carrierId"
          required
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Lookup from the carrier list
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
