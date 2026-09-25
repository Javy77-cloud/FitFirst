import { createPolicyInstallment } from "@/app/actions/ams";
import { InstallmentActions } from "@/components/ams/installment-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay, formatMoney } from "@/lib/domain";
import {
  BILL_TYPES,
  INSTALLMENT_DISCLAIMER,
  billTypeLabel,
  installmentNextStep,
  installmentStatusLabel,
} from "@/lib/domain-ams";
import type { PolicyInstallment } from "@/lib/db/schema";

export function InstallmentPanel({
  policyId,
  installments,
  error,
}: {
  policyId: string;
  installments: PolicyInstallment[];
  error?: string;
}) {
  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">Installments</h2>
      <p className="mt-1 text-base text-muted-foreground">{INSTALLMENT_DISCLAIMER}</p>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {installments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No installments on this Policy.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {installments.map((row) => (
            <li key={row.id} className="space-y-2 px-3 py-2">
              <div className="font-medium text-navy">
                {formatMoney(row.amount)} · {billTypeLabel(row.billType)}
              </div>
              <p className="text-sm text-muted-foreground">
                {installmentStatusLabel(row.status)} · due {formatDay(row.dueOn)}
                {row.receivedAt ? ` · received ${formatDay(row.receivedAt)}` : ""}
              </p>
              {row.notes ? <p className="text-sm">{row.notes}</p> : null}
              <p className="text-sm text-muted-foreground">{installmentNextStep(row.status)}</p>
              <InstallmentActions
                installmentId={row.id}
                status={row.status}
                returnTo={`/policies/${policyId}`}
              />
            </li>
          ))}
        </ul>
      )}
      <form action={createPolicyInstallment} className="mt-4 space-y-3 rounded-md border border-border p-3">
        <input type="hidden" name="policyId" value={policyId} />
        <input type="hidden" name="returnTo" value={`/policies/${policyId}`} />
        <div>
          <Label htmlFor="installment-bill" className="text-xs">
            Bill type
          </Label>
          <select
            id="installment-bill"
            name="billType"
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="agency_bill"
          >
            {BILL_TYPES.map((kind) => (
              <option key={kind} value={kind}>
                {billTypeLabel(kind)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="installment-amount" className="text-xs">
            Amount
          </Label>
          <Input id="installment-amount" name="amount" className="mt-1" placeholder="284.00" />
        </div>
        <div>
          <Label htmlFor="installment-due" className="text-xs">
            Due on
          </Label>
          <Input id="installment-due" name="dueOn" type="date" className="mt-1" required />
        </div>
        <div>
          <Label htmlFor="installment-notes" className="text-xs">
            Notes
          </Label>
          <Textarea
            id="installment-notes"
            name="notes"
            rows={2}
            className="mt-1"
            placeholder="Diary only. No Stripe."
          />
        </div>
        <Button type="submit" size="sm">
          Schedule installment
        </Button>
      </form>
    </section>
  );
}
