import { bindDeal } from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountKind } from "@/lib/crm/bind";

export function BindForm({
  dealId,
  defaultAccountKind = "personal",
  line,
}: {
  dealId: string;
  defaultAccountKind?: AccountKind;
  line?: string;
}) {
  return (
    <form action={bindDeal} className="ff-card space-y-3 p-4">
      <input type="hidden" name="dealId" value={dealId} />
      <div>
        <h2 className="text-sm font-semibold text-navy">Stub bind</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Bind writes one {line ?? "line"} policy onto a personal contact or a commercial
          business. Quotes stay on the deal and never write a policy.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="accountKind" className="text-xs">
            Account
          </Label>
          <select
            id="accountKind"
            name="accountKind"
            defaultValue={defaultAccountKind}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="personal">Personal contact</option>
            <option value="commercial">Commercial business</option>
          </select>
        </div>
        <div>
          <Label htmlFor="legalName" className="text-xs">
            Legal / DBA name
          </Label>
          <Input
            id="legalName"
            name="legalName"
            placeholder="Required for business"
            className="mt-1 h-8"
          />
        </div>
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
        Bind (account + one policy)
      </Button>
    </form>
  );
}
