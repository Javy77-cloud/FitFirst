import Link from "next/link";
import { createRenewalFollowup } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay, formatMoney } from "@/lib/domain";
import { formatDeltaPct, formatSignedMoney } from "@/lib/renewal/compare";
import { loadRenewalPipeline } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { rows, buckets } = await loadRenewalPipeline(90);
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <AppShell title="Renewals">
      <p className="mb-3 text-base text-muted-foreground">
        90 / 60 / 30 desk queue tied to Policy expiration. Follow-up creates a Task and an
        in-app Alert — no email to Javy, no rater. Quotes are not renewals.
      </p>
      <p className="mb-3 text-sm">
        <Link href="/book-health" className="text-primary hover:underline">
          Book health
        </Link>
        {" · "}
        {rows.length} in-force terms in the 90-day window
      </p>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice === "followup_created" ? (
        <p className="mb-3 text-sm text-navy">Follow-up Task and Alert created in-desk.</p>
      ) : null}
      {notice === "followup_exists" ? (
        <p className="mb-3 text-sm text-muted-foreground">A renewal follow-up is already open.</p>
      ) : null}

      <RenewalBucket
        id="due-30"
        title="30 days"
        empty="No in-force terms expire in the next 30 days. Hale should land here when seeded."
        rows={buckets.due30}
      />
      <RenewalBucket
        id="due-60"
        title="60 days"
        empty="No in-force terms in the 31–60 day band."
        rows={buckets.due60}
      />
      <RenewalBucket
        id="due-90"
        title="90 days"
        empty="No in-force terms in the 61–90 day band. Nair Auto belongs here when seeded."
        rows={buckets.due90}
      />
    </AppShell>
  );
}

function RenewalBucket({
  id,
  title,
  empty,
  rows,
}: {
  id: string;
  title: string;
  empty: string;
  rows: Awaited<ReturnType<typeof loadRenewalPipeline>>["rows"];
}) {
  return (
    <section id={id} className="ff-card mb-4 overflow-hidden">
      <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
        {title} · {rows.length}
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-base text-muted-foreground">{empty}</p>
      ) : (
        <table className="ff-table">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Party</th>
              <th>Expires</th>
              <th>Days</th>
              <th>Current</th>
              <th>Proposed</th>
              <th>Delta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="font-medium">
                  <RecordLink href={`/policies/${row.id}`}>{row.policyNumber}</RecordLink>
                  <div className="text-xs text-muted-foreground">{row.carrierName}</div>
                </td>
                <td>{row.partyName}</td>
                <td>{formatDay(row.expirationDate)}</td>
                <td>{row.daysUntil}</td>
                <td>{formatMoney(row.currentPremium)}</td>
                <td>{row.proposedPremium ? formatMoney(row.proposedPremium) : "—"}</td>
                <td>
                  {row.delta == null ? (
                    "—"
                  ) : (
                    <>
                      {formatSignedMoney(row.delta)}{" "}
                      <span className="text-muted-foreground">{formatDeltaPct(row.pct)}</span>
                    </>
                  )}
                </td>
                <td className="space-x-2 whitespace-nowrap">
                  <Link href={`/policies/${row.id}/compare`} className="text-sm text-primary hover:underline">
                    Compare
                  </Link>
                  {row.hasFollowup ? (
                    <span className="text-xs uppercase text-muted-foreground">Follow-up open</span>
                  ) : (
                    <form action={createRenewalFollowup} className="inline">
                      <input type="hidden" name="policyId" value={row.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Follow up
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
