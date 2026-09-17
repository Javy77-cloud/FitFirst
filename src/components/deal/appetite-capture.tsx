import { logAppetiteResult } from "@/app/actions/quoting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LostReasonSelect } from "@/components/quotes/lost-reason-select";
import { APPETITE_CAPTURE_LABELS, APPETITE_CAPTURE_RESULTS } from "@/lib/domain";

export function AppetiteCapture({
  dealId,
  unlocked,
  carriers,
}: {
  dealId: string;
  unlocked: boolean;
  carriers: { id: string; name: string }[];
}) {
  if (!unlocked) {
    return (
      <p className="text-sm text-muted-foreground">
        Approve the Risk Profile first. Then log quoted / declined / maybe from the carrier
        portal paste.
      </p>
    );
  }

  return (
    <form action={logAppetiteResult} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="dealId" value={dealId} />
      <div>
        <Label className="text-xs">Carrier</Label>
        <select
          name="carrierId"
          required
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Choose carrier
          </option>
          {carriers.map((carrier) => (
            <option key={carrier.id} value={carrier.id}>
              {carrier.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Result</Label>
        <select
          name="result"
          required
          defaultValue="quoted"
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {APPETITE_CAPTURE_RESULTS.map((result) => (
            <option key={result} value={result}>
              {APPETITE_CAPTURE_LABELS[result]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Premium (optional)</Label>
        <Input name="premium" className="mt-1 h-8" placeholder="5607.53" />
      </div>
      <div>
        <Label className="text-xs">Quote # (optional)</Label>
        <Input name="quoteNumber" className="mt-1 h-8" />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs">Why / notes</Label>
        <Input name="why" className="mt-1 h-8" placeholder="Portal declined roof age · maybe after 4-point" />
      </div>
      <div className="sm:col-span-2">
        <LostReasonSelect label="Lost / declined reason (required when declined)" />
      </div>
      <div>
        <Button type="submit" size="sm">
          Log appetite result
        </Button>
      </div>
    </form>
  );
}
