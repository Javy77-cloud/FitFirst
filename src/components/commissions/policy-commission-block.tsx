"use client";

import { useMemo, useState } from "react";
import { savePolicyCommission } from "@/app/actions/commissions";
import { MarkPaidForm } from "@/components/commissions/mark-paid-form";
import { CommissionStatusPill } from "@/components/commissions/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SELLING_AGENCIES, formatMoney, formatRatePct } from "@/lib/domain";
import {
  computePolicyCommission,
  policyCommissionVisibility,
} from "@/lib/commissions/policy-math";
import {
  INSURANCE_TYPES,
  PAYMENT_STATUSES,
  PREMIUM_FREQUENCIES,
  policySubTypesFor,
  policyTypesFor,
} from "@/lib/commissions/zoho-fields";

export type PolicyCommissionBlockValues = {
  policyId: string;
  commissionId: string | null;
  producerStatus: string | null;
  insuranceType: string;
  policyType: string;
  policySubType: string;
  sellingAgency: string;
  gwp: string;
  commission4: string;
  premiumFrequency: string;
  numberOfInsured: string;
  paymentStatus: string;
  paymentReferenceBatch: string;
  dueDate: string;
  paidDate: string;
};

const selectClass =
  "mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[11px] text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function withCurrent(options: readonly string[], current: string): string[] {
  if (current && !options.includes(current)) return [current, ...options];
  return [...options];
}

export function PolicyCommissionBlock({
  values,
  readOnly,
}: {
  values: PolicyCommissionBlockValues;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState(values);
  const computed = useMemo(
    () =>
      computePolicyCommission({
        insuranceType: form.insuranceType,
        policyType: form.policyType,
        policySubType: form.policySubType,
        sellingAgency: form.sellingAgency,
        gwp: form.gwp,
        commission4: form.commission4,
        premiumFrequency: form.premiumFrequency,
        numberOfInsured: form.numberOfInsured,
      }),
    [form],
  );
  const visibility = policyCommissionVisibility(form);
  const typeOptions = withCurrent(policyTypesFor(form.insuranceType), form.policyType);
  const subOptions = withCurrent(
    policySubTypesFor(form.insuranceType, form.policyType),
    form.policySubType,
  );

  function set<K extends keyof PolicyCommissionBlockValues>(
    key: K,
    value: PolicyCommissionBlockValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="ff-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-navy">Policy commission</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            One layout. Fields switch with Insurance Type, Policy Type, and Policy Sub
            Type. Math is copied from live Zoho Policies — this screen does not write
            to Zoho. There is no New-vs-Renewal field.
          </p>
        </div>
        {form.commissionId && form.producerStatus ? (
          <CommissionStatusPill status={form.producerStatus} />
        ) : null}
      </div>

      <form action={savePolicyCommission} className="space-y-4">
        <input type="hidden" name="policyId" value={form.policyId} />
        <input type="hidden" name="insuranceType" value={form.insuranceType} />
        <input type="hidden" name="policyType" value={form.policyType} />
        <input type="hidden" name="policySubType" value={form.policySubType} />
        <input type="hidden" name="sellingAgency" value={form.sellingAgency} />
        <input type="hidden" name="premiumFrequency" value={form.premiumFrequency} />
        <input type="hidden" name="paymentStatus" value={form.paymentStatus} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Insurance type">
            <select
              className={selectClass}
              value={form.insuranceType}
              disabled={readOnly}
              onChange={(e) => set("insuranceType", e.target.value)}
            >
              <option value="">Select…</option>
              {INSURANCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Policy type">
            <select
              className={selectClass}
              value={form.policyType}
              disabled={readOnly}
              onChange={(e) => set("policyType", e.target.value)}
            >
              <option value="">Select…</option>
              {typeOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Policy sub type">
            <select
              className={selectClass}
              value={form.policySubType}
              disabled={readOnly}
              onChange={(e) => set("policySubType", e.target.value)}
            >
              <option value="">Select…</option>
              {subOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Selling agency">
            <select
              className={selectClass}
              value={form.sellingAgency}
              disabled={readOnly}
              onChange={(e) => set("sellingAgency", e.target.value)}
            >
              {SELLING_AGENCIES.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={visibility.gwpLabel}>
            <Input
              name="gwp"
              type="number"
              step="0.01"
              min="0"
              value={form.gwp}
              disabled={readOnly}
              onChange={(e) => set("gwp", e.target.value)}
              className="mt-1"
            />
          </Field>
          {visibility.showCommission4 ? (
            <Field label="Commission4 (%)">
              <Input
                name="commission4"
                type="number"
                step="0.01"
                min="0"
                value={form.commission4}
                disabled={readOnly}
                onChange={(e) => set("commission4", e.target.value)}
                className="mt-1"
              />
            </Field>
          ) : (
            <input type="hidden" name="commission4" value="" />
          )}
          <Field label="Premium frequency">
            <select
              className={selectClass}
              value={form.premiumFrequency}
              disabled={readOnly}
              onChange={(e) => set("premiumFrequency", e.target.value)}
            >
              <option value="">Select…</option>
              {PREMIUM_FREQUENCIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          {visibility.showNumberOfInsured ? (
            <Field label="Number of insured">
              <Input
                name="numberOfInsured"
                type="number"
                min="0"
                step="1"
                value={form.numberOfInsured}
                disabled={readOnly}
                onChange={(e) => set("numberOfInsured", e.target.value)}
                className="mt-1"
              />
            </Field>
          ) : (
            <input type="hidden" name="numberOfInsured" value={form.numberOfInsured} />
          )}
        </div>

        <p className="text-[12px] text-muted-foreground">{visibility.gwpHint}</p>
        <p className="rounded-md bg-secondary px-3 py-2 text-[12px] text-navy">
          {computed.caption}
          {computed.effectiveRatePct != null
            ? ` Applied rate ${formatRatePct(computed.effectiveRatePct)}.`
            : ""}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibility.showLifeSplit ? (
            <>
              <Computed label="Initial commission" value={computed.initialCommission} />
              <Computed label="Deferred commission" value={computed.deferredCommission} />
            </>
          ) : null}
          <Computed
            label="Monthly commission"
            value={computed.monthlyCommission}
            muted={!visibility.showMonthly && computed.monthlyCommission === 0}
          />
          <Computed label="Total annual commission" value={computed.totalAnnualCommission} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Payment status">
            <select
              className={selectClass}
              value={form.paymentStatus}
              disabled={readOnly}
              onChange={(e) => set("paymentStatus", e.target.value)}
            >
              <option value="">Select…</option>
              {PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment reference batch">
            <Input
              name="paymentReferenceBatch"
              value={form.paymentReferenceBatch}
              disabled={readOnly}
              onChange={(e) => set("paymentReferenceBatch", e.target.value)}
              className="mt-1"
            />
          </Field>
          <Field label="Commission due date">
            <Input
              name="dueDate"
              type="date"
              value={form.dueDate}
              disabled={readOnly}
              onChange={(e) => set("dueDate", e.target.value)}
              className="mt-1"
            />
          </Field>
          <Field label="Commission paid date">
            <Input
              name="paidDate"
              type="date"
              value={form.paidDate}
              disabled={readOnly}
              onChange={(e) => set("paidDate", e.target.value)}
              className="mt-1"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {readOnly ? (
            <p className="text-[12px] text-muted-foreground">View only on this book.</p>
          ) : (
            <Button type="submit" size="sm">
              Save commission math
            </Button>
          )}
          {form.commissionId ? (
            <MarkPaidForm commissionId={form.commissionId} status={form.producerStatus ?? ""} />
          ) : null}
          <span className="text-[11px] text-muted-foreground">
            Mark paid logs producer pay. It does not change Policy status.
          </span>
        </div>
      </form>
    </section>
  );
}

function Computed({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${muted ? "text-muted-foreground" : "text-navy"}`}>
        {formatMoney(value)}
      </div>
    </div>
  );
}
