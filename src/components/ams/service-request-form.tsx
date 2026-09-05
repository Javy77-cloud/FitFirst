"use client";

import { useState } from "react";
import { createServiceRequest } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reasonsForKind } from "@/lib/ams/service-requests";
import type { PolicyChangeKind } from "@/lib/policy/status";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ServiceRequestForm({
  policyId,
  coverageA,
  premium,
}: {
  policyId: string;
  coverageA: number | null;
  premium: string | null;
}) {
  const [kind, setKind] = useState<PolicyChangeKind>("endorsement");
  const reasons = reasonsForKind(kind);

  return (
    <form action={createServiceRequest} className="mt-4 grid gap-3 border-t border-border pt-4">
      <input type="hidden" name="policyId" value={policyId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Request type</Label>
          <select
            name="kind"
            required
            value={kind}
            onChange={(event) => setKind(event.target.value as PolicyChangeKind)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="endorsement">Endorsement</option>
            <option value="cancellation">Cancellation</option>
            <option value="non_renewal">Non-renewal</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Effective date</Label>
          <Input name="effectiveDate" type="date" required defaultValue={todayIso()} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Reason</Label>
        <select
          name="reason"
          required
          key={kind}
          defaultValue={reasons[0]?.value}
          className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {reasons.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </div>
      {kind === "endorsement" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Coverage A (required for coverage change)</Label>
            <Input name="coverageA" type="number" defaultValue={coverageA ?? undefined} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Premium</Label>
            <Input name="premium" defaultValue={premium ?? undefined} className="mt-1" />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Filing a {kind === "cancellation" ? "cancellation" : "non-renewal"} takes this Policy off
          the book. Hale and Elena stay in force until you file.
        </p>
      )}
      <div>
        <Label className="text-xs">Work desk</Label>
        <select
          name="workDesk"
          defaultValue="csr"
          className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="csr">CSR — servicing / endorsements</option>
          <option value="producer">Producer — sales follow-up</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">What the insured asked for</Label>
        <Textarea
          name="summary"
          required
          rows={2}
          className="mt-1"
          placeholder="Required. Quote the change in their words so the file does not rekey."
        />
      </div>
      <Button type="submit" size="sm">
        Queue request
      </Button>
    </form>
  );
}
