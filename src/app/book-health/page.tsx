import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { loadBookHealth } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function BookHealthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const owner = typeof params.owner === "string" ? params.owner : undefined;
  const health = await loadBookHealth(owner);

  return (
    <AppShell title="Book health">
      <p className="mb-4 text-base text-muted-foreground">
        Agency book is every in-force Policy. Producer book is the same rows grouped by owner.
        Use a producer filter to see that book’s missing packets. Lapse risk, monoline gaps, and
        missing decs reuse the servicing gauges. Missing docs are auto-required servicing slots (dec on file).
        AOR and ID cards stay optional on Documents. Quotes are not policies.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Agency active / in force" value={health.counts.active} href="/policies?status=in_force" />
        <Stat label="Agency lapsed / cancelled" value={health.counts.lapsed} href="/policies?attention=lapse" />
        <Stat label="Lapse risk flags" value={health.agency.lapseRisk} href="/renewals" />
        <Stat label="Monoline gaps" value={health.agency.monoline} href="/book-health#monoline" />
        <Stat label="Missing dec" value={health.missingDec.length} href="/book-health#missing-dec" />
        <Stat label="Open service requests" value={health.openServiceRequests} href="/service-requests" />
        <Stat label="Open COI requests" value={health.openCoiRequests} href="/certificates" />
        <Stat label="Open suspense" value={health.openSuspense} href="/suspense" />
        <Stat label="Drafted notices" value={health.openNotices} href="/notices" />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Open claim diary" value={health.openClaimDiary} href="/claims/diary" />
        <Stat label="Drafted endorsements" value={health.openEndorsementDrafts} href="/endorsements" />
        <Stat label="Renewal queue" value={health.openRenewalQueue} href="/renewals/queue" />
        <Stat label="Holder contacts" value={health.activeHolderContacts} href="/certificates/holders" />
        <Stat label="Open inspections" value={health.openInspections} href="/inspections" />
        <Stat label="Open installments" value={health.openInstallments} href="/installments" />
      </div>

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Agency vs producer
        </div>
        <table className="ff-table">
          <thead>
            <tr>
              <th>Book</th>
              <th>Active</th>
              <th>Lapsed</th>
              <th>Lapse risk</th>
              <th>Monoline</th>
              <th>Missing dec</th>
              <th>Missing packets</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-medium">
              <td>{health.agency.ownerName}</td>
              <td>{health.agency.active}</td>
              <td>{health.agency.lapsed}</td>
              <td>{health.agency.lapseRisk}</td>
              <td>{health.agency.monoline}</td>
              <td>{health.agency.missingDec}</td>
              <td>{health.missing.length}</td>
            </tr>
            {health.producers.map((row) => {
              const packets =
                health.producerBooks.find((book) => book.ownerId === row.ownerId)?.missingCount ?? 0;
              return (
                <tr key={row.ownerId ?? row.ownerName}>
                  <td>
                    <Link
                      href={`/book-health?owner=${row.ownerId ?? "unassigned"}`}
                      className="text-primary hover:underline"
                    >
                      {row.ownerName}
                    </Link>
                  </td>
                  <td>{row.active}</td>
                  <td>{row.lapsed}</td>
                  <td>{row.lapseRisk}</td>
                  <td>{row.monoline}</td>
                  <td>{row.missingDec}</td>
                  <td>{packets}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <p className="mb-4 text-sm">
        Viewing{" "}
        {health.ownerName
          ? `${health.ownerName}'s producer book`
          : health.scope === "agency"
            ? "agency book"
            : `${health.viewerName}'s producer book`}
        .{" "}
        {health.ownerId ? (
          <>
            <Link href="/book-health" className="text-primary hover:underline">
              Clear producer filter
            </Link>
            {" · "}
          </>
        ) : null}
        <Link href="/renewals" className="text-primary hover:underline">
          90 / 60 / 30 renewals
        </Link>
        {" · "}
        <Link href="/service-requests" className="text-primary hover:underline">
          Service requests
        </Link>
        {" · "}
        <Link href="/suspense" className="text-primary hover:underline">
          Suspense board
        </Link>
        {" · "}
        <Link href="/notices" className="text-primary hover:underline">
          Notice diary
        </Link>
        {" · "}
        <Link href="/endorsements" className="text-primary hover:underline">
          Endorsement drafts
        </Link>
        {" · "}
        <Link href="/claims/diary" className="text-primary hover:underline">
          Claim diary
        </Link>
        {" · "}
        <Link href="/service-timeline" className="text-primary hover:underline">
          Service timeline
        </Link>
        {" · "}
        <Link href="/renewals/queue" className="text-primary hover:underline">
          Renewal queue
        </Link>
        {" · "}
        <Link href="/certificates/holders" className="text-primary hover:underline">
          Holder contacts
        </Link>
        {" · "}
        <Link href="/inspections" className="text-primary hover:underline">
          Inspections
        </Link>
        {" · "}
        <Link href="/installments" className="text-primary hover:underline">
          Installments
        </Link>
        {" · "}
        <Link href="/settings/carrier-download" className="text-primary hover:underline">
          IVANS / AL3 (not connected)
        </Link>
      </p>

      <section id="lapse-risk" className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Lapse risk
        </div>
        {health.lapseRisk.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No in-force Policies are flagged for lapse risk.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Party</th>
                <th>Producer</th>
                <th>Days</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {health.lapseRisk.map((row) => (
                <tr key={row.policyId}>
                  <td className="font-medium">
                    <RecordLink href={`/policies/${row.policyId}`}>{row.policyNumber}</RecordLink>
                  </td>
                  <td>{row.partyName}</td>
                  <td>{row.ownerName}</td>
                  <td>{row.daysToRenewal ?? "—"}</td>
                  <td>
                    {row.score} · {row.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="monoline" className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Monoline gaps
        </div>
        {health.monoline.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            Every in-force household already has more than one line.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Party</th>
                <th>Only line</th>
                <th>Policy</th>
                <th>Producer</th>
              </tr>
            </thead>
            <tbody>
              {health.monoline.map((row) => (
                <tr key={row.partyKey}>
                  <td>{row.partyName}</td>
                  <td>{row.line}</td>
                  <td>
                    <RecordLink href={`/policies/${row.policyId}`}>{row.policyNumber}</RecordLink>
                  </td>
                  <td>{row.ownerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="missing-dec" className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Missing servicing docs
          {health.ownerName ? ` · ${health.ownerName}` : ""}
        </div>
        {health.missing.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            {health.ownerName
              ? `Every in-force Policy on ${health.ownerName}'s book has the required dec on file.`
              : "Every in-force Policy has the required dec on file."}
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Party</th>
                <th>Missing</th>
              </tr>
            </thead>
            <tbody>
              {health.missing.map((row) => (
                <tr key={row.policyId}>
                  <td className="font-medium">
                    <RecordLink href={`/policies/${row.policyId}`}>{row.policyNumber}</RecordLink>
                  </td>
                  <td>{row.partyName}</td>
                  <td>{row.labels.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="ff-card p-4 hover:border-navy">
      <div className="text-2xl font-semibold text-navy">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Link>
  );
}
