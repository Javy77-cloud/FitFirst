"use client";

import { useMemo, useState } from "react";
import { logClaim } from "@/app/actions/claims";
import {
  ClaimCauseSelect,
  ClaimChannelSelect,
  ClaimStatusSelect,
  fieldClass,
} from "@/components/claims/field";
import { ClaimsDeskNotice } from "@/components/claims/desk-notice";
import { ChooseFiles } from "@/components/choose-files";
import { FormPrimaryActions } from "@/components/desk/form-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FNOL_INTAKE_COPY } from "@/lib/claims";

export type FnolPolicyOption = {
  id: string;
  policyNumber: string;
  lineOfBusiness: string | null;
  contactId: string | null;
  ownerId: string | null;
  party: string | null;
};

export type FnolContactOption = {
  id: string;
  label: string;
  ownerId: string | null;
};

export function FnolIntakeForm({
  policyId,
  contactId,
  policies,
  contacts,
  postedBy = "Javy",
}: {
  policyId?: string;
  contactId?: string;
  policies: FnolPolicyOption[];
  contacts: FnolContactOption[];
  postedBy?: string;
}) {
  const [selectedPolicyId, setSelectedPolicyId] = useState(policyId ?? "");
  const [selectedContactId, setSelectedContactId] = useState(contactId ?? "");

  const selectedPolicy = policies.find((row) => row.id === selectedPolicyId);
  const policiesForContact = useMemo(() => {
    if (!selectedContactId) return policies;
    const matched = policies.filter((row) => row.contactId === selectedContactId);
    return matched.length > 0 ? matched : policies;
  }, [policies, selectedContactId]);

  function onPolicyChange(nextPolicyId: string) {
    setSelectedPolicyId(nextPolicyId);
    const next = policies.find((row) => row.id === nextPolicyId);
    if (next?.contactId) setSelectedContactId(next.contactId);
  }

  function onContactChange(nextContactId: string) {
    setSelectedContactId(nextContactId);
    if (selectedPolicy && selectedPolicy.contactId && selectedPolicy.contactId !== nextContactId) {
      const first = policies.find((row) => row.contactId === nextContactId);
      setSelectedPolicyId(first?.id ?? "");
    }
  }

  return (
    <form action={logClaim} className="ff-card space-y-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-navy">FNOL intake</h2>
        <p className="mt-1 text-xs text-muted-foreground">{FNOL_INTAKE_COPY}</p>
      </div>
      <ClaimsDeskNotice compact />
      <input type="hidden" name="postedBy" value={postedBy} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Contact</Label>
          <select
            name="contactId"
            value={selectedContactId}
            onChange={(event) => onContactChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">Select the insured</option>
            {contacts.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Policy</Label>
          <select
            name="policyId"
            value={selectedPolicyId}
            onChange={(event) => onPolicyChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">Select the in-force policy</option>
            {policiesForContact.map((row) => (
              <option key={row.id} value={row.id}>
                {[row.policyNumber, row.party, row.lineOfBusiness].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Both sides stay linked. Picking a policy fills the Contact.
          </p>
        </div>
        <div>
          <Label className="text-xs">Date of loss</Label>
          <Input name="dateOfLoss" type="date" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Date reported to the agency</Label>
          <Input
            name="dateReported"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Cause</Label>
          <ClaimCauseSelect />
        </div>
        <div>
          <Label className="text-xs">How they told us</Label>
          <ClaimChannelSelect />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Loss location</Label>
          <Input
            name="lossLocation"
            placeholder="Street, city — or same as the policy premises"
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Reporter name</Label>
          <Input name="reporterName" placeholder="Who called it in" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Reporter phone</Label>
          <Input name="reporterPhone" placeholder="321-555-0100" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Carrier claim #</Label>
          <Input
            name="carrierClaimNumber"
            placeholder="If the carrier already assigned one"
            className="mt-1 h-8 font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">Desk status</Label>
          <ClaimStatusSelect />
        </div>
      </div>
      <div>
        <Label className="text-xs">What happened</Label>
        <Textarea
          name="description"
          rows={4}
          placeholder="Kitchen supply line, tree on the lanai, rear-end at I-95 — a few sentences for the producer."
          className={`${fieldClass} h-auto min-h-20`}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Severity</Label>
          <select name="severity" defaultValue="moderate" className={`${fieldClass} mt-1`}>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Loss photos</Label>
          <ChooseFiles name="photos" multiple accept="image/*" className="mt-1" />
          <p className="mt-1 text-[11px] text-muted-foreground">Optional. Stored on the claim file.</p>
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="notifyCarrier" value="1" className="mt-1" />
        <span>
          <span className="font-medium text-navy">Notify carrier</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Honest stub — stamps carrier notified on the claim. No portal push yet.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="notifyProducer" value="1" defaultChecked className="mt-1" />
        <span>
          <span className="font-medium text-navy">Notify the producer in-app</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Pings the Policy / Contact owner in Alerts. Nothing emails. No reserves, no adjuster assignment.
          </span>
        </span>
      </label>
      <FormPrimaryActions submitLabel="Save FNOL to the claims log" />
    </form>
  );
}
