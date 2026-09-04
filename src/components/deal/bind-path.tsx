"use client";

import { useState } from "react";
import { bindDeal } from "@/app/actions/crm";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bindPathCopy,
  closedWonPathSentence,
  type BindPathTarget,
} from "@/lib/crm/bind-path";

type BoundParty = {
  id: string;
  name: string;
  href: string;
  kind: "contact" | "account";
};

type BoundPolicy = {
  id: string;
  policyNumber: string;
};

export function BindPath({
  dealId,
  defaultTarget,
  lineLabel,
  isAna,
  bound,
  party,
  policies,
}: {
  dealId: string;
  defaultTarget: BindPathTarget;
  lineLabel: string;
  isAna: boolean;
  bound: boolean;
  party: BoundParty | null;
  policies: BoundPolicy[];
}) {
  const [target, setTarget] = useState<BindPathTarget>(defaultTarget);
  const copy = bindPathCopy(target, lineLabel);

  if (isAna) {
    return (
      <div className="rounded-md bg-fit-yellow-bg px-3 py-2 text-xs text-fit-yellow">
        Ana Dib HO3 stays Quote Sent / unbound. Coverage A is $321,000. Closed Won bind is
        locked on this shop. Quotes are not coverage.
      </div>
    );
  }

  if (bound) {
    const first = policies[0];
    const sentence =
      party && first
        ? closedWonPathSentence({
            partyKind: party.kind,
            partyName: party.name,
            policyNumber: first.policyNumber,
          })
        : "This deal is Closed Won. Quotes on this deal stayed quotes.";
    return (
      <div className="ff-card space-y-2 p-4">
        <h2 className="text-sm font-semibold text-navy">Closed Won path</h2>
        <p className="text-sm text-navy/90">{sentence}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {party ? <RecordLink href={party.href}>{party.kind === "account" ? "Business" : "Contact"} {party.name}</RecordLink> : null}
          {policies.map((policy) => (
            <RecordLink key={policy.id} href={`/policies/${policy.id}`}>
              Policy {policy.policyNumber}
            </RecordLink>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form action={bindDeal} className="ff-card space-y-3 p-4">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="bindTarget" value={target} />
      <div>
        <h2 className="text-sm font-semibold text-navy">Closed Won · one-click bind</h2>
        <p className="mt-1 text-xs text-muted-foreground">{copy.whatHappens}</p>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Bind path</legend>
        <label
          className={
            target === "contact"
              ? "rounded-md border border-primary bg-fit-check-bg/40 px-3 py-2 text-sm"
              : "rounded-md border border-border bg-card px-3 py-2 text-sm"
          }
        >
          <input
            type="radio"
            name="bindPath"
            className="sr-only"
            checked={target === "contact"}
            onChange={() => setTarget("contact")}
          />
          <span className="font-semibold text-navy">Personal · Contact + Policy</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            Creates or reuses a Contact, then one {lineLabel} Policy.
          </span>
        </label>
        <label
          className={
            target === "account"
              ? "rounded-md border border-primary bg-fit-check-bg/40 px-3 py-2 text-sm"
              : "rounded-md border border-border bg-card px-3 py-2 text-sm"
          }
        >
          <input
            type="radio"
            name="bindPath"
            className="sr-only"
            checked={target === "account"}
            onChange={() => setTarget("account")}
          />
          <span className="font-semibold text-navy">Commercial · Business + Policy</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            Creates or reuses a Business, then one {lineLabel} Policy.
          </span>
        </label>
      </fieldset>
      {target === "account" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="businessName" className="text-xs">
              Business legal name
            </Label>
            <Input
              id="businessName"
              name="businessName"
              placeholder="Copied from the sheet if you leave this blank"
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label htmlFor="ein" className="text-xs">
              EIN / FEIN
            </Label>
            <Input id="ein" name="ein" placeholder="Optional — sheet first" className="mt-1 h-8" />
          </div>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="policyNumber" className="text-xs">
            Policy # at bind
          </Label>
          <Input
            id="policyNumber"
            name="policyNumber"
            placeholder="Leave blank for an FF- stub"
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
            placeholder="Copied from the cheapest bindable quote if blank"
            className="mt-1 h-8"
          />
        </div>
      </div>
      <Button type="submit" size="sm">
        {copy.button}
      </Button>
    </form>
  );
}
