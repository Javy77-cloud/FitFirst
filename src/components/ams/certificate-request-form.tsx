import { createCertificateRequest } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACORD_STUB_DISCLAIMER } from "@/lib/ams/coi-requests";

export function CertificateRequestForm({
  accountId,
  policyId,
  returnTo,
  canRequest,
  error,
}: {
  accountId: string;
  policyId?: string;
  returnTo?: string;
  canRequest: boolean;
  error?: string;
}) {
  return (
    <form action={createCertificateRequest} className="space-y-3">
      <input type="hidden" name="accountId" value={accountId} />
      {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <div>
        <Label htmlFor="holderName" className="text-xs">
          Certificate holder
        </Label>
        <Input
          id="holderName"
          name="holderName"
          required
          disabled={!canRequest}
          placeholder="General contractor, owner, or additional interest"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="holderAddress" className="text-xs">
          Holder address
        </Label>
        <Textarea
          id="holderAddress"
          name="holderAddress"
          required
          disabled={!canRequest}
          placeholder="Street, city, state, ZIP"
          className="mt-1 min-h-20"
        />
      </div>
      <div>
        <Label htmlFor="jobLocation" className="text-xs">
          Job / location <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="jobLocation"
          name="jobLocation"
          disabled={!canRequest}
          placeholder="Job site, project name, or operations description"
          className="mt-1"
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={!canRequest}>
        Queue COI request
      </Button>
      <p className="text-base text-muted-foreground">{ACORD_STUB_DISCLAIMER}</p>
    </form>
  );
}
