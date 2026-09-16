import { formatDay, formatMoney, formatRatePct } from "@/lib/domain";
import { billTypeLabel } from "@/lib/domain-ams";
import {
  commissionEarnedPending,
  earnedUnearnedPremium,
  installmentDisplayLabel,
  installmentDisplayStatus,
} from "@/lib/ams/billing-depth";
import { AddInstallmentDialog } from "@/components/policy/tabs/add-installment-dialog";

type InstallmentRow = {
  id: string;
  amount: string | null;
  billType: string;
  status: string;
  dueOn: Date;
  receivedAt: Date | null;
  notes: string | null;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function dueTime(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function PolicyBillingTab({
  policyId,
  policy,
  installments,
  showCommission = true,
}: {
  policyId: string;
  policy: {
    premium: string | null;
    billingFrequency: string | null;
    premiumFrequency: string | null;
    commission4Pct: string | null;
    commission4: string | null;
    gwp: string | null;
    sellingAgency: string | null;
    producer: string | null;
    effectiveDate: Date | string;
    expirationDate: Date | string;
    /** Honest stubs — columns not on policies yet. */
    downPayment?: string | null;
    financeCharge?: string | null;
    financeAgreementNumber?: string | null;
    paymentMethod?: string | null;
  };
  installments: InstallmentRow[];
  showCommission?: boolean;
}) {
  const billing = policy.billingFrequency || policy.premiumFrequency;
  const commissionRate =
    policy.commission4Pct != null && policy.commission4Pct !== ""
      ? policy.commission4Pct
      : policy.commission4 != null && policy.commission4 !== ""
        ? policy.commission4
        : null;
  const commission =
    commissionRate != null ? formatRatePct(commissionRate) : null;

  const upcoming = [...installments]
    .filter((row) => !row.receivedAt && row.status !== "waived" && row.status !== "cancelled")
    .sort((a, b) => dueTime(a.dueOn) - dueTime(b.dueOn))[0];

  const history = [...installments].sort((a, b) => dueTime(a.dueOn) - dueTime(b.dueOn));

  const earned = earnedUnearnedPremium({
    premium: policy.premium,
    effectiveDate: policy.effectiveDate,
    expirationDate: policy.expirationDate,
  });
  const commissionSplit = commissionEarnedPending({
    premium: policy.premium,
    ratePct: commissionRate,
    earnedPct: earned.pctEarned,
  });

  return (
    <div className="space-y-4" data-ff-policy-tab="billing">
      <section className="ff-card p-4">
        <h2 className="text-base font-semibold text-navy">Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Premium and schedule from the policy record. Payment method is shown only when stored —
          FitFirst does not invent card or ACH details.
        </p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-helper text-muted-foreground">Premium</dt>
            <dd className="font-medium text-navy">{formatMoney(policy.premium)}</dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Billing frequency</dt>
            <dd className="font-medium text-navy">{billing ? titleCase(billing) : "—"}</dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Next due</dt>
            <dd className="font-medium text-navy">
              {upcoming
                ? `${formatDay(upcoming.dueOn)} · ${formatMoney(upcoming.amount)}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Payment method</dt>
            <dd className="font-medium text-navy">{policy.paymentMethod?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Down payment</dt>
            <dd className="font-medium text-navy">
              {policy.downPayment != null && policy.downPayment !== ""
                ? formatMoney(policy.downPayment)
                : "—"}
            </dd>
            {!(policy.downPayment != null && policy.downPayment !== "") ? (
              <p className="text-xs text-muted-foreground">Stub — not stored on policies yet.</p>
            ) : null}
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Finance charge</dt>
            <dd className="font-medium text-navy">
              {policy.financeCharge != null && policy.financeCharge !== ""
                ? formatMoney(policy.financeCharge)
                : "—"}
            </dd>
            {!(policy.financeCharge != null && policy.financeCharge !== "") ? (
              <p className="text-xs text-muted-foreground">Stub — not stored on policies yet.</p>
            ) : null}
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Finance agreement #</dt>
            <dd className="font-medium text-navy">
              {policy.financeAgreementNumber?.trim() || "—"}
            </dd>
            {!policy.financeAgreementNumber?.trim() ? (
              <p className="text-xs text-muted-foreground">Stub — not stored on policies yet.</p>
            ) : null}
          </div>
        </dl>
      </section>

      <section className="ff-card p-4" data-ff-policy-billing-earned="">
        <h2 className="text-base font-semibold text-navy">Earned vs unearned</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pro-rata from effective / expiration and written premium. Desk estimate only — not a
          carrier statement.
        </p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-helper text-muted-foreground">Earned premium</dt>
            <dd className="font-medium text-navy">
              {earned.earned != null ? formatMoney(earned.earned) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Unearned premium</dt>
            <dd className="font-medium text-navy">
              {earned.unearned != null ? formatMoney(earned.unearned) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">% earned</dt>
            <dd className="font-medium text-navy">
              {earned.pctEarned != null ? `${Math.round(earned.pctEarned * 100)}%` : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {showCommission ? (
      <section className="ff-card p-4" data-ff-policy-billing-commission="">
        <h2 className="text-base font-semibold text-navy">Commission earned vs pending</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only estimate from rate × premium × earned %. Agency edits stay on the Agency tab.
        </p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-helper text-muted-foreground">Split / rate</dt>
            <dd className="font-medium text-navy">{commission ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Commission earned</dt>
            <dd className="font-medium text-navy">
              {commissionSplit.earned != null ? formatMoney(commissionSplit.earned) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Commission pending</dt>
            <dd className="font-medium text-navy">
              {commissionSplit.pending != null ? formatMoney(commissionSplit.pending) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Producer</dt>
            <dd className="font-medium text-navy">{policy.producer?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Selling agency</dt>
            <dd className="font-medium text-navy">{policy.sellingAgency?.trim() || "—"}</dd>
          </div>
        </dl>
      </section>
      ) : null}

      <section className="ff-card p-4" data-ff-policy-payment-schedule="">
        <h2 className="text-base font-semibold text-navy">Payment schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Installments with due date, amount, and paid / due / overdue. Receiving does not collect
          money.
        </p>
        <div className="mt-3">
          <AddInstallmentDialog policyId={policyId} />
        </div>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No installment or payment rows on this policy yet. Click{" "}
            <span className="font-medium text-navy">Add installment</span> above — due date, amount,
            Paid or Overdue — then Save.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {history.map((row) => {
              const display = installmentDisplayStatus(row);
              return (
                <li key={row.id} className="px-3 py-2 text-sm" data-ff-installment-status={display}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-medium text-navy">
                      {formatMoney(row.amount)} · {billTypeLabel(row.billType)}
                    </div>
                    <span
                      className={`text-xs font-semibold uppercase ${
                        display === "overdue"
                          ? "text-destructive"
                          : display === "paid"
                            ? "text-[var(--ff-green)]"
                            : display === "due"
                              ? "text-navy"
                              : "text-muted-foreground"
                      }`}
                    >
                      {installmentDisplayLabel(display)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    Due {formatDay(row.dueOn)}
                    {row.receivedAt ? ` · received ${formatDay(row.receivedAt)}` : ""}
                  </p>
                  {row.notes ? <p className="text-muted-foreground">{row.notes}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
