import { createPolicyInstallment } from "@/app/actions/ams";
import { InstallmentActions } from "@/components/ams/installment-actions";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { RecordLink } from "@/components/record-links";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDay, formatMoney } from "@/lib/domain";
import { INSTALLMENTS_LIST_COLUMNS } from "@/lib/list-columns";
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
        <DeskColumnTable
          moduleId="installments"
          columns={INSTALLMENTS_LIST_COLUMNS}
          empty="No installments in this view. Elena October is scheduled; Hale August is past due."
          rows={rows.map(({ installment, policy, contact, account }) => ({
            key: installment.id,
            cells: {
              policy: (
                <>
                  <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  {installment.notes ? (
                    <div className="text-sm text-muted-foreground">{installment.notes}</div>
                  ) : null}
                </>
              ),
              amount: formatMoney(installment.amount),
              bill: billTypeLabel(installment.billType),
              status: <StatusBadge status={installment.status}>{installmentStatusLabel(installment.status)}</StatusBadge>,
              next: installmentNextStep(installment.status),
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              due: formatDay(installment.dueOn),
              actions: <InstallmentActions installmentId={installment.id} status={installment.status} />,
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
