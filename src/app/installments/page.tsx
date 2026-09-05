import { createPolicyInstallment } from "@/app/actions/ams";
import { InstallmentActions } from "@/components/ams/installment-actions";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay, formatMoney } from "@/lib/domain";
import {
  BILL_TYPES,
  INSTALLMENT_DISCLAIMER,
  billTypeLabel,
  installmentNextStep,
  installmentStatusLabel,
} from "@/lib/domain-ams";
import { listPolicyInstallments } from "@/lib/ams/queries";
import { ELENA_POLICY_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function InstallmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const rows = await listPolicyInstallments(undefined, status);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Installments">
      <p className="mb-4 text-base text-muted-foreground">{INSTALLMENT_DISCLAIMER}</p>
      <p className="mb-4 text-sm">
        <RecordLink href="/installments">All</RecordLink>
        {" · "}
        <RecordLink href="/installments?status=past_due">Past due</RecordLink>
        {" · "}
        <RecordLink href="/installments?status=scheduled">Scheduled</RecordLink>
        {" · "}
        <RecordLink href="/inspections">Inspections</RecordLink>
        {" · "}
        <RecordLink href="/settings/carrier-download">IVANS / AL3 (not connected)</RecordLink>
      </p>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-navy">Installment {notice.replaceAll("_", " ")}.</p>
      ) : null}

      <section className="ff-card mb-4 p-4">
        <h2 className="text-base font-semibold text-navy">Schedule an installment</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          Default Policy is Elena HO3. Marking received later does not collect money.
        </p>
        <form action={createPolicyInstallment} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="policyId" value={ELENA_POLICY_ID} />
          <input type="hidden" name="returnTo" value="/installments" />
          <select
            name="billType"
            className="h-9 rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="agency_bill"
          >
            {BILL_TYPES.map((kind) => (
              <option key={kind} value={kind}>
                {billTypeLabel(kind)}
              </option>
            ))}
          </select>
          <input
            name="amount"
            placeholder="Amount"
            className="h-9 rounded-md border border-input bg-card px-2 text-sm"
          />
          <input name="dueOn" type="date" required className="h-9 rounded-md border border-input bg-card px-2 text-sm" />
          <Button type="submit" size="sm">
            Schedule
          </Button>
        </form>
      </section>

      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No installments in this view. Elena October is scheduled; Hale August is past due.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Amount</th>
                <th>Bill</th>
                <th>Status</th>
                <th>Next step</th>
                <th>Party</th>
                <th>Due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ installment, policy, contact, account }) => (
                <tr key={installment.id}>
                  <td className="font-medium">
                    <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                    {installment.notes ? (
                      <div className="text-sm text-muted-foreground">{installment.notes}</div>
                    ) : null}
                  </td>
                  <td>{formatMoney(installment.amount)}</td>
                  <td>{billTypeLabel(installment.billType)}</td>
                  <td>
                    <span className="rounded-full bg-[var(--ff-sidebar)] px-2 py-0.5 text-xs font-semibold text-white">
                      {installmentStatusLabel(installment.status)}
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground">
                    {installmentNextStep(installment.status)}
                  </td>
                  <td>{contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—"}</td>
                  <td>{formatDay(installment.dueOn)}</td>
                  <td>
                    <InstallmentActions installmentId={installment.id} status={installment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
