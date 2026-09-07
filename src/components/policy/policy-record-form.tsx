"use client";

import { useMemo, useState } from "react";
import { updatePolicyRecord } from "@/app/actions/policy-record";
import { AddressAutofill } from "@/components/address-autofill";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SELLING_AGENCIES } from "@/lib/domain";
import { policyRecordName } from "@/lib/desk/policy-name";
import {
  INSURANCE_FAMILIES,
  POLICY_STATUS_OPTIONS,
  defaultTermForFamily,
  expirationFromTerm,
  premiumLabel,
  subTypesForFamily,
  termsForFamily,
  typesForFamily,
  type InsuranceFamily,
} from "@/lib/desk/policy-family";

export type PolicyFormMailing = {
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type PolicyFormLists = {
  types: Record<InsuranceFamily, string[]>;
  subTypes: Record<InsuranceFamily, string[]>;
  terms: Record<InsuranceFamily, string[]>;
};

const selectClass = "mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm";

function withCurrent(options: readonly string[], current: string): string[] {
  if (current && !options.includes(current)) return [current, ...options];
  return [...options];
}

export function PolicyRecordForm({
  policyId,
  family: initialFamily,
  policyNumber,
  status,
  effectiveDate,
  expirationDate,
  premium,
  billingFrequency,
  policySubType,
  policyType,
  policyTerm,
  faceAmount,
  insuredCount,
  oepStart,
  sellingAgency,
  showSellingAgency,
  insuredSameAsMailing,
  premises,
  mailing,
  partyName,
  carrierName,
  lists,
}: {
  policyId: string;
  family: InsuranceFamily;
  policyNumber: string;
  status: string;
  effectiveDate: string;
  expirationDate: string;
  premium: string;
  billingFrequency: string;
  policySubType: string;
  policyType: string;
  policyTerm: string;
  faceAmount: string;
  insuredCount: string;
  oepStart: string;
  sellingAgency: string;
  showSellingAgency: boolean;
  insuredSameAsMailing: boolean;
  premises: PolicyFormMailing;
  mailing: PolicyFormMailing;
  partyName: string;
  carrierName: string;
  lists: PolicyFormLists;
}) {
  const [family, setFamily] = useState<InsuranceFamily>(initialFamily);
  const [type, setType] = useState(policyType);
  const [subType, setSubType] = useState(policySubType);
  const [term, setTerm] = useState(policyTerm || defaultTermForFamily(initialFamily));
  const [effective, setEffective] = useState(effectiveDate);
  const [expires, setExpires] = useState(expirationDate);
  const [statusValue, setStatusValue] = useState(status);
  const [sameAs, setSameAs] = useState(insuredSameAsMailing);
  const [address, setAddress] = useState(insuredSameAsMailing && mailing.address ? mailing : premises);

  const typeOptions = withCurrent(
    lists.types[family]?.length ? lists.types[family] : typesForFamily(family),
    type,
  );
  const subOptions = withCurrent(
    lists.subTypes[family]?.length ? lists.subTypes[family] : subTypesForFamily(family, type),
    subType,
  );
  const termOptions = withCurrent(
    lists.terms[family]?.length ? lists.terms[family] : [...termsForFamily(family)],
    term,
  );

  const autoName = useMemo(
    () =>
      policyRecordName({
        contactName: partyName,
        subType: subType || type,
        lineOfBusiness: family,
        formType: type,
        carrierName,
        effectiveDate: effective || null,
      }),
    [partyName, subType, type, family, carrierName, effective],
  );

  function applyFamily(next: InsuranceFamily) {
    setFamily(next);
    const nextTypes = lists.types[next]?.length ? lists.types[next] : typesForFamily(next);
    const nextType = nextTypes.includes(type) ? type : (nextTypes[0] ?? "");
    setType(nextType);
    const nextSubs = lists.subTypes[next]?.length ? lists.subTypes[next] : subTypesForFamily(next, nextType);
    if (!nextSubs.includes(subType)) setSubType(nextSubs[0] ?? "");
    const nextTerms = lists.terms[next]?.length ? lists.terms[next] : [...termsForFamily(next)];
    const nextTerm = nextTerms.includes(term) ? term : defaultTermForFamily(next);
    setTerm(nextTerm);
    applyTerm(effective, nextTerm);
  }

  function applyTerm(nextEffective: string, nextTerm: string) {
    if (!nextEffective) return;
    const base = new Date(`${nextEffective}T12:00:00.000Z`);
    if (Number.isNaN(base.getTime())) return;
    const next = expirationFromTerm(base, nextTerm, null);
    if (next) setExpires(next.toISOString().slice(0, 10));
  }

  function toggleSameAs(checked: boolean) {
    setSameAs(checked);
    if (checked) setAddress(mailing);
  }

  return (
    <form action={updatePolicyRecord} className="mb-6 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="policyId" value={policyId} />
      <input type="hidden" name="insuranceType" value={family} />

      <div className="sm:col-span-2 rounded-md bg-secondary/50 px-3 py-2">
        <div className="text-caption uppercase tracking-wide text-muted-foreground">Policy name</div>
        <div className="text-sm font-semibold text-navy">{autoName}</div>
        <p className="mt-0.5 text-helper text-muted-foreground">
          Auto: insured / sub-type / carrier / effective date. Not typed.
        </p>
      </div>

      <div>
        <Label className="text-xs">Insurance type</Label>
        <select
          name="insuranceTypeDisplay"
          value={family}
          onChange={(e) => applyFamily(e.target.value as InsuranceFamily)}
          className={selectClass}
        >
          {INSURANCE_FAMILIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Status</Label>
        <div className="mt-1 flex items-center gap-2">
          <select
            name="status"
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
            className={selectClass + " mt-0"}
          >
            {POLICY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {statusValue && !POLICY_STATUS_OPTIONS.some((option) => option.value === statusValue) ? (
              <option value={statusValue}>{statusValue}</option>
            ) : null}
          </select>
          <PolicyStatusBadge status={statusValue} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Policy type</Label>
        <select
          name="policyType"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            const nextSubs = subTypesForFamily(family, e.target.value);
            if (subType && !nextSubs.includes(subType)) setSubType(nextSubs[0] ?? "");
          }}
          className={selectClass}
        >
          <option value="">—</option>
          {typeOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Sub-policy type</Label>
        <select
          name="policySubType"
          value={subType}
          onChange={(e) => setSubType(e.target.value)}
          className={selectClass}
        >
          <option value="">—</option>
          {subOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-xs">Policy #</Label>
        <Input name="policyNumber" defaultValue={policyNumber} className="mt-1 h-8" />
      </div>
      <div>
        <Label className="text-xs">Effective date</Label>
        <Input
          name="effectiveDate"
          type="date"
          value={effective}
          onChange={(e) => {
            setEffective(e.target.value);
            applyTerm(e.target.value, term);
          }}
          className="mt-1 h-8"
        />
      </div>
      <div>
        <Label className="text-xs">Policy term</Label>
        <select
          name="policyTerm"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            applyTerm(effective, e.target.value);
          }}
          className={selectClass}
        >
          {termOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">{family === "P&C" ? "X-Date / expiration" : "Expiration"}</Label>
        <Input
          name="expirationDate"
          type="date"
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
          className="mt-1 h-8"
        />
      </div>

      <div>
        <Label className="text-xs">{premiumLabel(family, subType)}</Label>
        <Input name="premium" defaultValue={premium} className="mt-1 h-8" />
      </div>
      <div>
        <Label className="text-xs">Premium frequency</Label>
        <select name="billingFrequency" defaultValue={billingFrequency || "annual"} className={selectClass}>
          <option value="annual">Annual</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="semi-annual">Semi-annual</option>
        </select>
      </div>

      {family === "Life" ? (
        <div>
          <Label className="text-xs">Face amount</Label>
          <Input name="faceAmount" defaultValue={faceAmount} className="mt-1 h-8" />
        </div>
      ) : null}

      {family === "Health" ? (
        <>
          <div>
            <Label className="text-xs">Number of insured</Label>
            <Input name="insuredCount" defaultValue={insuredCount} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">OEP start</Label>
            <Input name="oepStart" type="date" defaultValue={oepStart} className="mt-1 h-8" />
          </div>
        </>
      ) : (
        <input type="hidden" name="insuredCount" value={insuredCount} />
      )}

      {showSellingAgency ? (
        <div>
          <Label className="text-xs">Selling agency</Label>
          <select name="sellingAgency" defaultValue={sellingAgency} className={selectClass}>
            <option value="">—</option>
            {SELLING_AGENCIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="sellingAgency" value={sellingAgency} />
      )}

      {family === "P&C" ? (
        <>
          <label className="sm:col-span-2 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="insuredSameAsMailing"
              checked={sameAs}
              onChange={(e) => toggleSameAs(e.target.checked)}
              className="mt-1"
              value="true"
            />
            <span>
              <span className="font-medium text-navy">Insured address same as mailing</span>
              <span className="mt-0.5 block text-helper text-muted-foreground">
                Copies the contact or business mailing address onto this policy.
              </span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <Label className="text-xs">Insured address</Label>
            <AddressAutofill
              key={sameAs ? "mailing" : "custom"}
              name="premisesAddress"
              defaultValue={address.address}
              fill={{ city: "premisesCity", state: "premisesState", zip: "premisesZip" }}
              className="mt-1 h-8"
              readOnly={sameAs}
              onConfirm={(parsed) =>
                setAddress((prev) => ({
                  ...prev,
                  address: parsed.street || prev.address,
                  city: parsed.city || prev.city,
                  state: parsed.state || prev.state,
                  zip: parsed.zip || prev.zip,
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input
              name="premisesCity"
              value={address.city}
              onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
              readOnly={sameAs}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label className="text-xs">State / ZIP</Label>
            <div className="mt-1 flex gap-2">
              <Input
                name="premisesState"
                value={address.state}
                onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                readOnly={sameAs}
                className="h-8 w-20"
              />
              <Input
                name="premisesZip"
                value={address.zip}
                onChange={(e) => setAddress((prev) => ({ ...prev, zip: e.target.value }))}
                readOnly={sameAs}
                className="h-8"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="premisesAddress" value={premises.address} />
          <input type="hidden" name="premisesCity" value={premises.city} />
          <input type="hidden" name="premisesState" value={premises.state} />
          <input type="hidden" name="premisesZip" value={premises.zip} />
        </>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" size="sm">
          Save policy
        </Button>
      </div>
    </form>
  );
}
