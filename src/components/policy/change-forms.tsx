import {
  fileCancellation,
  fileEndorsement,
  fileNonRenewal,
  uploadPolicyAttachment,
} from "@/app/actions/policies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CANCELLATION_REASONS,
  ENDORSEMENT_REASONS,
  NON_RENEWAL_REASONS,
} from "@/lib/policy/reasons";
import { FieldSelect } from "./field-select";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function DeskCopyField() {
  return (
    <label className="flex items-start gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        name="attachDeskCopy"
        defaultChecked
        className="mt-0.5"
      />
      <span>Attach a desk copy of this filing on the Policy (no email).</span>
    </label>
  );
}

function FileField() {
  return (
    <div>
      <Label className="text-xs">Optional source PDF / notice</Label>
      <Input name="file" type="file" className="mt-1 h-9" />
    </div>
  );
}

export function EndorsementForm({
  policyId,
  coverageA,
  premium,
}: {
  policyId: string;
  coverageA: number | null;
  premium: string | null;
}) {
  return (
    <form action={fileEndorsement} className="space-y-3">
      <input type="hidden" name="policyId" value={policyId} />
      <p className="text-sm text-muted-foreground">
        Change in force on this Policy record. Does not open a deal and does not
        create a new policy.
      </p>
      <div>
        <Label className="text-xs">Reason</Label>
        <FieldSelect name="reason" required className="mt-1">
          {ENDORSEMENT_REASONS.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </FieldSelect>
      </div>
      <div>
        <Label className="text-xs">Effective date</Label>
        <Input
          name="effectiveDate"
          type="date"
          required
          defaultValue={todayIso()}
          className="mt-1"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Coverage A</Label>
          <Input
            name="coverageA"
            type="number"
            defaultValue={coverageA ?? undefined}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Premium</Label>
          <Input name="premium" defaultValue={premium ?? undefined} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">What changed</Label>
        <Textarea
          name="summary"
          rows={3}
          className="mt-1"
          placeholder="Rebuild review — raise Coverage A. Same policy."
        />
      </div>
      <FileField />
      <DeskCopyField />
      <Button type="submit" size="sm">
        File endorsement
      </Button>
    </form>
  );
}

export function CancellationForm({ policyId }: { policyId: string }) {
  return (
    <form action={fileCancellation} className="space-y-3">
      <input type="hidden" name="policyId" value={policyId} />
      <p className="text-sm text-muted-foreground">
        Ends this Policy. Reason and date stay on the record. Documents attach
        here — not to a replacement quote.
      </p>
      <div>
        <Label className="text-xs">Reason</Label>
        <FieldSelect name="reason" required className="mt-1">
          {CANCELLATION_REASONS.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </FieldSelect>
      </div>
      <div>
        <Label className="text-xs">Cancellation date</Label>
        <Input
          name="effectiveDate"
          type="date"
          required
          defaultValue={todayIso()}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea name="summary" rows={3} className="mt-1" />
      </div>
      <FileField />
      <DeskCopyField />
      <Button type="submit" size="sm" variant="secondary">
        File cancellation
      </Button>
    </form>
  );
}

export function NonRenewalForm({ policyId }: { policyId: string }) {
  return (
    <form action={fileNonRenewal} className="space-y-3">
      <input type="hidden" name="policyId" value={policyId} />
      <p className="text-sm text-muted-foreground">
        Same end as a cancellation — policy is over — with a non-renewal reason.
        Docs stay on this Policy.
      </p>
      <div>
        <Label className="text-xs">Reason</Label>
        <FieldSelect name="reason" required className="mt-1">
          {NON_RENEWAL_REASONS.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </FieldSelect>
      </div>
      <div>
        <Label className="text-xs">Non-renewal date</Label>
        <Input
          name="effectiveDate"
          type="date"
          required
          defaultValue={todayIso()}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea name="summary" rows={3} className="mt-1" />
      </div>
      <FileField />
      <DeskCopyField />
      <Button type="submit" size="sm" variant="secondary">
        File non-renewal
      </Button>
    </form>
  );
}

export function PolicyAttachForm({ policyId }: { policyId: string }) {
  return (
    <form action={uploadPolicyAttachment} className="space-y-3">
      <input type="hidden" name="policyId" value={policyId} />
      <p className="text-sm text-muted-foreground">
        Notices and endorsement forms live on the Policy. Shopping decs stay on
        the deal.
      </p>
      <div>
        <Label className="text-xs">Document type</Label>
        <FieldSelect name="docType" defaultValue="other" className="mt-1">
          <option value="endorsement">Endorsement</option>
          <option value="cancellation_notice">Cancellation notice</option>
          <option value="non_renewal_notice">Non-renewal notice</option>
          <option value="other">Other</option>
        </FieldSelect>
      </div>
      <FileField />
      <Button type="submit" size="sm">
        Attach to Policy
      </Button>
    </form>
  );
}
