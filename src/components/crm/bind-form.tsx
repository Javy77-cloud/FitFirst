import { bindDeal } from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BindForm({ dealId }: { dealId: string }) {
  return (
    <form action={bindDeal} className="ff-card space-y-3 p-4">
      <input type="hidden" name="dealId" value={dealId} />
      <div>
        <h2 className="text-sm font-semibold text-navy">Stub bind</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Bind is the only path that creates a contact and a policy from this deal. Quotes stay
          on the shop and never write a policy.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="policyNumber" className="text-xs">
            Policy number
          </Label>
          <Input
            id="policyNumber"
            name="policyNumber"
            placeholder="Leave blank for FF- stub"
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label htmlFor="premium" className="text-xs">
            Written premium
          </Label>
          <Input
            id="premium"
            name="premium"
            inputMode="decimal"
            placeholder="0.00"
            className="mt-1 h-8"
          />
        </div>
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Bind (creates contact + policy)
      </Button>
    </form>
  );
}
