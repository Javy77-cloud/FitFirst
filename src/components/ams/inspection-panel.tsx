import { createPolicyInspection } from "@/app/actions/ams";
import { InspectionActions } from "@/components/ams/inspection-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay } from "@/lib/domain";
import {
  INSPECTION_DISCLAIMER,
  INSPECTION_KINDS,
  inspectionKindLabel,
  inspectionNextStep,
  inspectionStatusLabel,
} from "@/lib/domain-ams";
import type { PolicyInspection } from "@/lib/db/schema";

export function InspectionPanel({
  policyId,
  inspections,
  error,
}: {
  policyId: string;
  inspections: PolicyInspection[];
  error?: string;
}) {
  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">Inspections</h2>
      <p className="mt-1 text-base text-muted-foreground">{INSPECTION_DISCLAIMER}</p>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {inspections.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No inspections on this Policy.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {inspections.map((row) => (
            <li key={row.id} className="space-y-2 px-3 py-2">
              <div className="font-medium text-navy">{inspectionKindLabel(row.kind)}</div>
              <p className="text-sm text-muted-foreground">
                {inspectionStatusLabel(row.status)}
                {row.vendor ? ` · ${row.vendor}` : ""}
                {row.scheduledOn ? ` · ${formatDay(row.scheduledOn)}` : ""}
              </p>
              {row.notes ? <p className="text-sm">{row.notes}</p> : null}
              <p className="text-sm text-muted-foreground">{inspectionNextStep(row.status)}</p>
              <InspectionActions
                inspectionId={row.id}
                status={row.status}
                returnTo={`/policies/${policyId}`}
              />
            </li>
          ))}
        </ul>
      )}
      <form action={createPolicyInspection} className="mt-4 space-y-3 rounded-md border border-border p-3">
        <input type="hidden" name="policyId" value={policyId} />
        <input type="hidden" name="returnTo" value={`/policies/${policyId}`} />
        <div>
          <Label htmlFor="inspection-kind" className="text-xs">
            Inspection kind
          </Label>
          <select
            id="inspection-kind"
            name="kind"
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="roof"
          >
            {INSPECTION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {inspectionKindLabel(kind)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="inspection-vendor" className="text-xs">
            Vendor
          </Label>
          <Input id="inspection-vendor" name="vendor" className="mt-1" placeholder="Brevard Roof Docs" />
        </div>
        <div>
          <Label htmlFor="inspection-when" className="text-xs">
            Scheduled on
          </Label>
          <Input id="inspection-when" name="scheduledOn" type="date" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="inspection-notes" className="text-xs">
            Notes
          </Label>
          <Textarea
            id="inspection-notes"
            name="notes"
            rows={2}
            className="mt-1"
            placeholder="Diary only. Does not file."
          />
        </div>
        <Button type="submit" size="sm">
          Request inspection
        </Button>
      </form>
    </section>
  );
}
