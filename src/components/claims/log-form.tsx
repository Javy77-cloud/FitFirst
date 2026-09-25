import { logClaim } from "@/app/actions/claims";
import {
  ClaimCauseSelect,
  ClaimChannelSelect,
  ClaimStatusSelect,
  fieldClass,
} from "@/components/claims/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LogClaimForm({
  policyId,
  policies = [],
  postedBy = "Javy",
}: {
  policyId?: string;
  policies?: Array<{ id: string; label: string }>;
  postedBy?: string;
}) {
  return (
    <form action={logClaim} className="ff-card space-y-3 p-4">
      <h2 className="text-base font-semibold text-navy">Log a notice</h2>

      {policyId && policies.length === 0 ? (
        <input type="hidden" name="policyId" value={policyId} />
      ) : (
        <div>
          <Label className="text-xs">Policy (optional on this stub)</Label>
          <select
            name="policyId"
            defaultValue={policyId ?? ""}
            className={fieldClass}
          >
            <option value="">No policy yet — save the row anyway</option>
            {policies.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <input type="hidden" name="postedBy" value={postedBy} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Date reported</Label>
          <Input name="dateReported" type="date" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Date of loss</Label>
          <Input name="dateOfLoss" type="date" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Cause / type</Label>
          <ClaimCauseSelect />
        </div>
        <div>
          <Label className="text-xs">How they told us</Label>
          <ClaimChannelSelect />
        </div>
        <div>
          <Label className="text-xs">Carrier claim number</Label>
          <Input
            name="carrierClaimNumber"
            placeholder="If they already have one"
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Desk status</Label>
          <ClaimStatusSelect />
        </div>
      </div>
      <div>
        <Label className="text-xs">Short why</Label>
        <Textarea
          name="description"
          rows={3}
          placeholder="Fire, water, auto accident — one or two sentences."
          className={`${fieldClass} h-auto min-h-16`}
        />
      </div>
      <Button type="submit" size="lg">
        Save claim
      </Button>
    </form>
  );
}
