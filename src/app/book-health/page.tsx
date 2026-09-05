import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { loadBookHealth } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function BookHealthPage() {
  const health = await loadBookHealth();

  return (
    <AppShell title="Book health">
      <p className="mb-4 text-base text-muted-foreground">
        In-force vs off-book counts from Policies that already exist. Missing docs are
        actionable servicing slots — dec, ID card, AOR. Quotes are not policies. Ana Dib is
        not on this book.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active / in force" value={health.counts.active} href="/policies?status=in_force" />
        <Stat label="Lapsed / cancelled / non-renewed" value={health.counts.lapsed} href="/policies?attention=lapse" />
        <Stat label="Open service requests" value={health.openServiceRequests} href="/service-requests" />
        <Stat label="Open COI requests" value={health.openCoiRequests} href="/certificates" />
      </div>

      <p className="mb-4 text-sm">
        <Link href="/renewals" className="text-primary hover:underline">
          Upcoming renewals
        </Link>
        {" · "}
        <Link href="/settings/carrier-download" className="text-primary hover:underline">
          IVANS / AL3 (not connected)
        </Link>
      </p>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Missing servicing docs
        </div>
        {health.missing.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            Every in-force Policy has a dec, ID card, and AOR packet on file.
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
