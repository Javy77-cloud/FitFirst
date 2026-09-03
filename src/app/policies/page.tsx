import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import { listPolicies, type PolicyListFilter } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const FILTER_COPY: Record<string, string> = {
  "status:in_force": "Active and Bound only. Quotes are not on this list.",
  "written:this_month": "In-force terms effective this desk month (September 2026).",
  "written:last_month": "In-force terms effective last desk month (August 2026).",
  "renewal:30": "In-force terms expiring in the next 30 days.",
  "renewal:60": "In-force terms expiring in the next 60 days.",
  "attention:lapse": "Lapsed, cancelled, or expired — not in-force premium.",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter: PolicyListFilter = {
    status: first(params.status),
    written: first(params.written),
    renewal: first(params.renewal),
    line: first(params.line),
    carrier: first(params.carrier),
    attention: first(params.attention),
  };
  const rows = await listPolicies(filter);
  const key = Object.entries(filter)
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}:${value}`)
    .join(" · ");
  const pair = Object.entries(filter).find(([, value]) => value);
  const hint =
    FILTER_COPY[pair ? `${pair[0]}:${pair[1]}` : ""] ??
    (key
      ? `Filtered · ${key}`
      : "Policies exist only after bind. Expiration tracking hangs off these records.");

  return (
    <AppShell title="Policies">
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
      {key ? (
        <p className="mb-3 text-[12px]">
          <Link href="/policies" className="text-primary hover:underline">
            Clear filter
          </Link>
          {" · "}
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      ) : null}
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No policies match. Bind a shopping deal when a market is actually written.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Status</th>
                <th>Party</th>
                <th>Carrier</th>
                <th>Premium</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ policy, contact, account, carrier }) => (
                <tr key={policy.id}>
                  <td className="font-medium">
                    <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  </td>
                  <td className="uppercase">{policy.status}</td>
                  <td>
                    {contact ? (
                      <RecordLink href={`/contacts/${contact.id}`}>
                        {contact.lastName}, {contact.firstName}
                      </RecordLink>
                    ) : account ? (
                      <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{carrier?.name ?? "—"}</td>
                  <td>{formatMoney(policy.premium)}</td>
                  <td>{formatDay(policy.expirationDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
