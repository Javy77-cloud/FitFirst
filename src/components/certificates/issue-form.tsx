import { issueCertificate } from "@/app/actions/certificates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function IssueCertificateForm({
  businessId,
  canIssue,
  error,
}: {
  businessId: string;
  canIssue: boolean;
  error?: string;
}) {
  return (
    <form action={issueCertificate} className="space-y-3">
      <input type="hidden" name="businessId" value={businessId} />
      <div>
        <Label htmlFor="holderName" className="text-xs">
          Certificate holder
        </Label>
        <Input
          id="holderName"
          name="holderName"
          required
          disabled={!canIssue}
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
          disabled={!canIssue}
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
          disabled={!canIssue}
          placeholder="Job site, project name, or operations description"
          className="mt-1"
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={!canIssue}>
        Generate certificate stub
      </Button>

    </form>
  );
}
