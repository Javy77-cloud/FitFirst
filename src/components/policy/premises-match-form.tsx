import { AddressAutofill } from "@/components/address-autofill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PremisesMatchForm({
  action = "/policies",
  defaults,
}: {
  action?: string;
  defaults?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    number?: string;
  };
}) {
  return (
    <form action={action} method="get" className="space-y-3">
      <p className="text-base text-muted-foreground">
        Replacement notice? Match the insured premises. A cancelled policy
        number is not a key — that number should not exist on the rewrite.
      </p>
      <div>
        <Label className="text-xs">Street</Label>
        <AddressAutofill
          name="address"
          defaultValue={defaults?.address}
          placeholder="412 Oak Grove Ln"
          className="mt-1"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label className="text-xs">City</Label>
          <Input name="city" defaultValue={defaults?.city} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">State</Label>
          <Input name="state" defaultValue={defaults?.state ?? "FL"} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">ZIP</Label>
          <Input name="zip" defaultValue={defaults?.zip} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Cancelled number on the notice (ignored)</Label>
        <Input
          name="number"
          defaultValue={defaults?.number}
          placeholder="AIC-HO3-22001"
          className="mt-1"
        />
      </div>
      <Button type="submit" size="sm">
        Match premises
      </Button>
    </form>
  );
}
