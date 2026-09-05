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
        Use a producer filter to see that book’s missing packets. Missing docs are actionable
        servicing slots — dec, ID card, AOR. Quotes are not policies. Ana Dib is not on this book.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Agency active / in force" value={health.counts.active} href="/policies?status=in_force" />
        <Stat label="Agency lapsed / cancelled" value={health.counts.lapsed} href="/policies?attention=lapse" />
        <Stat label="Open service requests" value={health.openServiceRequests} href="/service-requests" />
        <Stat label="Open COI requests" value={health.openCoiRequests} href="/certificates" />
        <Stat label="Open suspense" value={health.openSuspense} href="/suspense" />
        <Stat label="Drafted notices" value={health.openNotices} href="/notices" />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Open claim diary" value={health.openClaimDiary} href="/claims/diary" />
        <Stat label="Drafted endorsements" value={health.openEndorsementDrafts} href="/endorsements" />
      </div>

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
          Upcoming renewals
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
        <Link href="/settings/carrier-download" className="text-primary hover:underline">
          IVANS / AL3 (not connected)
        </Link>
      </p>

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Producer book vs agency book
        </div>
        {health.producers.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">No Policies on this book yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Book</th>
                <th>Active</th>
                <th>Lapsed</th>
                <th>Missing packets</th>
              </tr>
            </thead>
            <tbody>
              <tr className={!health.ownerId ? "bg-[var(--ff-check-bg)]" : undefined}>
                <td className="font-medium">
                  <Link href="/book-health" className="text-primary hover:underline">
                    Agency
                  </Link>
                </td>
                <td>{health.agency.active}</td>
                <td>{health.agency.lapsed}</td>
                <td>{health.agencyMissingCount}</td>
              </tr>
              {health.producers.map((row) => {
                const selected = (row.ownerId ?? "unassigned") === health.ownerId;
                return (
                  <tr key={row.ownerId ?? "unassigned"} className={selected ? "bg-[var(--ff-check-bg)]" : undefined}>
                    <td>
                      <Link
                        href={`/book-health?owner=${row.ownerId ?? "unassigned"}`}
                        className="text-primary hover:underline"
                      >
                        {row.ownerName}
                      </Link>
                    </td>
                    <td>{row.counts.active}</td>
                    <td>{row.counts.lapsed}</td>
                    <td>{row.missingCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Missing servicing docs
          {health.ownerName ? ` · ${health.ownerName}` : ""}
        </div>
        {health.missing.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            {health.ownerName
              ? `Every in-force Policy on ${health.ownerName}'s book has a dec, ID card, and AOR packet on file.`
              : "Every in-force Policy has a dec, ID card, and AOR packet on file."}
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
