"use client";

import { useMemo, useState } from "react";
import { createCertificateRequest } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatHolderAddress } from "@/lib/ams/additional-interests";
import { ACORD_STUB_DISCLAIMER } from "@/lib/ams/coi-requests";
import { interestKindLabel } from "@/lib/domain-ams";

export type CertificateInterestOption = {
  id: string;
  kind: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type CertificateHolderContactOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export function CertificateRequestForm({
  accountId,
  policyId,
  returnTo,
  canRequest,
  error,
  interests = [],
  holderContacts = [],
}: {
  accountId: string;
  policyId?: string;
  returnTo?: string;
  canRequest: boolean;
  error?: string;
  interests?: CertificateInterestOption[];
  holderContacts?: CertificateHolderContactOption[];
}) {
  const [interestId, setInterestId] = useState("");
  const [holderContactId, setHolderContactId] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderAddress, setHolderAddress] = useState("");
  const [additionalInsured, setAdditionalInsured] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selected = useMemo(
    () => interests.find((row) => row.id === interestId) ?? null,
    [interestId, interests],
  );

  function pickInterest(id: string) {
    setInterestId(id);
    setHolderContactId("");
    const found = interests.find((row) => row.id === id);
    if (!found) return;
    setHolderName(found.name);
    setHolderAddress(formatHolderAddress(found));
    if (found.kind === "additional_interest" || found.kind === "certificate_holder") {
      setAdditionalInsured(found.name);
    }
  }

  function pickHolderContact(id: string) {
    setHolderContactId(id);
    setInterestId("");
    const found = holderContacts.find((row) => row.id === id);
    if (!found) return;
    setHolderName(found.name);
    setHolderAddress(formatHolderAddress(found));
    setAdditionalInsured(found.name);
  }

  return (
    <form action={createCertificateRequest} className="space-y-3">
      <input type="hidden" name="accountId" value={accountId} />
      {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {holderContacts.length > 0 ? (
        <div>
          <Label htmlFor="holderContactId" className="text-xs">
            Holder contact
          </Label>
          <select
            id="holderContactId"
            name="holderContactId"
            disabled={!canRequest}
            value={holderContactId}
            onChange={(event) => pickHolderContact(event.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">New or pick from Policy interests</option>
            {holderContacts.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
                {row.email ? ` · ${row.email}` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {interests.length > 0 ? (
        <div>
          <Label htmlFor="interestId" className="text-xs">
            Existing holder / additional insured
          </Label>
          <select
            id="interestId"
            name="interestId"
            disabled={!canRequest}
            value={interestId}
            onChange={(event) => pickInterest(event.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">New holder</option>
            {interests.map((row) => (
              <option key={row.id} value={row.id}>
                {interestKindLabel(row.kind)} · {row.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <Label htmlFor="holderName" className="text-xs">
          Certificate holder
        </Label>
        <Input
          id="holderName"
          name="holderName"
          required
          disabled={!canRequest}
          value={holderName}
          onChange={(event) => setHolderName(event.target.value)}
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
          value={holderAddress}
          onChange={(event) => setHolderAddress(event.target.value)}
          placeholder="Street, city, state, ZIP"
          className="mt-1 min-h-20"
        />
      </div>
      <button
        type="button"
        className="text-sm font-medium text-primary hover:underline"
        onClick={() => setShowAdvanced((v) => !v)}
        data-ff-coi-advanced-toggle=""
      >
        {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
      </button>
      {showAdvanced ? (
        <div className="space-y-3 rounded-md border border-border p-3" data-ff-coi-advanced="">
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
          <div>
            <Label htmlFor="additionalInsured" className="text-xs">
              Additional insured <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="additionalInsured"
              name="additionalInsured"
              disabled={!canRequest}
              value={additionalInsured}
              onChange={(event) => setAdditionalInsured(event.target.value)}
              placeholder="Same as holder, or a named AI"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="specialWording" className="text-xs">
              Special wording <span className="font-normal text-muted-foreground">(stub only)</span>
            </Label>
            <Textarea
              id="specialWording"
              name="specialWording"
              disabled={!canRequest}
              placeholder="Additional insured as respects operations only. Desk stub — not ACORD."
              className="mt-1 min-h-16"
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-navy">
            <input
              type="checkbox"
              name="waiverOfSubrogation"
              value="1"
              disabled={!canRequest}
              className="mt-1"
            />
            Waiver of subrogation (desk stub only — not ACORD)
          </label>
          <label className="flex items-start gap-2 text-sm text-navy">
            <input
              type="checkbox"
              name="primaryNoncontributory"
              value="1"
              disabled={!canRequest}
              className="mt-1"
            />
            Primary &amp; noncontributory (desk stub only — not ACORD)
          </label>
          {policyId && !selected ? (
            <label className="flex items-start gap-2 text-sm text-navy">
              <input
                type="checkbox"
                name="addAsAi"
                value="1"
                defaultChecked
                disabled={!canRequest}
                className="mt-1"
              />
              Also add this holder as an additional insured on the Policy. Does not file an endorsement.
            </label>
          ) : null}
        </div>
      ) : null}
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
