"use client";

import { useMemo, useState } from "react";
import { savePolicyCommission } from "@/app/actions/commissions";
import { MarkPaidForm } from "@/components/commissions/mark-paid-form";
import { CommissionStatusPill } from "@/components/commissions/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SELLING_AGENCIES, formatMoney, formatRatePct } from "@/lib/domain";
import {
  coerceLine,
  suggestCommission4,
  suggestPremiumFrequency,
} from "@/lib/commissions/master-defaults";
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
  bookPremium?: string;
};

const selectClass =
  "mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block text-[11px] text-muted-foreground">
      <div className="mb-0">{label}</div>
      {children}
      {hint ? <span className="mt-1 block text-[10px] leading-snug">{hint}</span> : null}
    </div>
  );
}

function withCurrent(options: readonly string[], current: string): string[] {
  if (current && !options.includes(current)) return [current, ...options];
  return [...options];
}

function applyLineDefaults(
  prev: PolicyCommissionBlockValues,
  next: Partial<Pick<PolicyCommissionBlockValues, "insuranceType" | "policyType" | "policySubType" | "sellingAgency">>,
  rateLocked: boolean,
  freqLocked: boolean,
): PolicyCommissionBlockValues {
  const sellingAgency = next.sellingAgency ?? prev.sellingAgency;
  const changed =
    next.insuranceType !== undefined
      ? "insuranceType"
      : next.policyType !== undefined
        ? "policyType"
        : next.policySubType !== undefined
          ? "policySubType"
          : undefined;
  const line = coerceLine({
    insuranceType: next.insuranceType ?? prev.insuranceType,
    policyType: next.policyType ?? prev.policyType,
    policySubType: next.policySubType ?? prev.policySubType,
    changed,
  });
  const { insuranceType, policyType, policySubType } = line;

  const rate = suggestCommission4({ sellingAgency, insuranceType, policySubType });
  const frequency = suggestPremiumFrequency({ insuranceType, policySubType });

  return {
    ...prev,
    sellingAgency,
    insuranceType,
    policyType,
    policySubType,
    commission4: rateLocked ? prev.commission4 : rate.value == null ? "" : String(rate.value),
    premiumFrequency: freqLocked ? prev.premiumFrequency : frequency ?? prev.premiumFrequency,
  };
}

export function PolicyCommissionBlock({
  values,
  readOnly,
  showSellingAgency = false,
}: {
  values: PolicyCommissionBlockValues;
  readOnly?: boolean;
  showSellingAgency?: boolean;
}) {
  const [rateLocked, setRateLocked] = useState(false);
  const [freqLocked, setFreqLocked] = useState(false);
  const [form, setForm] = useState(() => {
    const gwp = values.gwp || values.bookPremium || "";
    const base = { ...values, gwp };
    if (!values.commission4 && (values.insuranceType || values.policySubType)) {
      return applyLineDefaults(base, {}, false, Boolean(values.premiumFrequency));
    }
    return base;
  });

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
  const rateHint = suggestCommission4(form).source;
  const typeOptions = withCurrent(policyTypesFor(form.insuranceType), form.policyType);
  const subOptions = withCurrent(
    policySubTypesFor(form.insuranceType, form.policyType),
    form.policySubType,
  );

  function setLine(
    patch: Partial<Pick<PolicyCommissionBlockValues, "insuranceType" | "policyType" | "policySubType" | "sellingAgency">>,
  ) {
    setForm((prev) => applyLineDefaults(prev, patch, rateLocked, freqLocked));
  }

  return (
    <section className="ff-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-navy">Policy commission</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Enter line and GWP. Rate % fills from the live desk (agency + line).
            TAC, initial, deferred, and monthly fill themselves — do not retype
            them. No New-vs-Renewal field. Selling Agency stays off this form
            unless Settings turns the picklists on.
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

        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy">You enter</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {showSellingAgency ? (
            <Field label="Selling agency">
              <select
                aria-label="Selling agency"
                className={selectClass}
                value={form.sellingAgency}
                disabled={readOnly}
                onChange={(e) => setLine({ sellingAgency: e.target.value })}
              >
                {SELLING_AGENCIES.map((row) => (
                  <option key={row} value={row}>
                    {row}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Insurance type">
            <select
              aria-label="Insurance type"
              className={selectClass}
              value={form.insuranceType}
              disabled={readOnly}
              onChange={(e) => setLine({ insuranceType: e.target.value })}
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
              aria-label="Policy type"
              className={selectClass}
              value={form.policyType}
              disabled={readOnly}
              onChange={(e) => setLine({ policyType: e.target.value })}
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
              aria-label="Policy sub type"
              className={selectClass}
              value={form.policySubType}
              disabled={readOnly}
              onChange={(e) => setLine({ policySubType: e.target.value })}
            >
              <option value="">Select…</option>
              {subOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={visibility.gwpLabel} hint={visibility.gwpHint}>
            <Input
              name="gwp"
              type="number"
              step="0.01"
              min="0"
              value={form.gwp}
              disabled={readOnly}
              onChange={(e) => setForm((prev) => ({ ...prev, gwp: e.target.value }))}
              className="mt-1"
            />
          </Field>
          {visibility.showCommission4 ? (
            <Field
              label="Rate % (Commission4)"
              hint={rateLocked ? "Override — typed on this record." : (rateHint ?? undefined)}
            >
              <Input
                name="commission4"
                type="number"
                step="0.01"
                min="0"
                value={form.commission4}
                disabled={readOnly}
                onChange={(e) => {
                  setRateLocked(true);
                  setForm((prev) => ({ ...prev, commission4: e.target.value }));
                }}
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
              onChange={(e) => {
                setFreqLocked(true);
                setForm((prev) => ({ ...prev, premiumFrequency: e.target.value }));
              }}
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
                onChange={(e) => setForm((prev) => ({ ...prev, numberOfInsured: e.target.value }))}
                className="mt-1"
              />
            </Field>
          ) : (
            <input type="hidden" name="numberOfInsured" value={form.numberOfInsured} />
          )}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy">
          Filled for you
        </p>
        <p className="rounded-md bg-secondary px-3 py-2 text-[12px] text-navy">
          {computed.caption}
          {computed.effectiveRatePct != null
            ? ` Applied rate ${formatRatePct(computed.effectiveRatePct)}.`
            : ""}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Computed label="Initial commission" value={computed.initialCommission} />
          <Computed label="Deferred commission" value={computed.deferredCommission} />
          <Computed label="Monthly commission" value={computed.monthlyCommission} />
          <Computed label="Total annual commission" value={computed.totalAnnualCommission} />
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy">
          Due / paid
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Payment status">
            <select
              className={selectClass}
              value={form.paymentStatus}
              disabled={readOnly}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
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
              onChange={(e) =>
                setForm((prev) => ({ ...prev, paymentReferenceBatch: e.target.value }))
              }
              className="mt-1"
            />
          </Field>
          <Field label="Commission due date">
            <Input
              name="dueDate"
              type="date"
              value={form.dueDate}
              disabled={readOnly}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="mt-1"
            />
          </Field>
          <Field label="Commission paid date">
            <Input
              name="paidDate"
              type="date"
              value={form.paidDate}
              disabled={readOnly}
              onChange={(e) => setForm((prev) => ({ ...prev, paidDate: e.target.value }))}
              className="mt-1"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {readOnly ? (
            <p className="text-[12px] text-muted-foreground">View only on this book.</p>
          ) : (
            <Button type="submit" size="sm">
              Save inputs
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

function Computed({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-navy">{formatMoney(value)}</div>
    </div>
  );
}
