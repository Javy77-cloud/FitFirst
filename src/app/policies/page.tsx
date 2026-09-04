import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import { listPolicies, type PolicyListFilter } from "@/lib/db/queries";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { LINES } from "@/lib/domain";
import { firstParam } from "@/lib/saved-filters";

export const dynamic = "force-dynamic";

const FILTER_COPY: Record<string, string> = {
  "status:in_force": "Active and Bound only. Quotes are not on this list.",
  "written:this_month": "In-force terms effective this desk month (September 2026).",
  "written:last_month": "In-force terms effective last desk month (August 2026).",
  "renewal:30": "In-force terms expiring in the next 30 days.",
  "renewal:60": "In-force terms expiring in the next 60 days.",
  "attention:lapse": "Lapsed, cancelled, or expired — not in-force premium.",
};

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter: PolicyListFilter = {
    status: firstParam(params.status),
    written: firstParam(params.written),
    renewal: firstParam(params.renewal),
    line: firstParam(params.line),
    carrier: firstParam(params.carrier),
    attention: firstParam(params.attention),
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
      <p className="mb-3 text-base text-muted-foreground">{hint}</p>
      <SavedFiltersBar
        moduleId="policies"
        fields={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "in_force", label: "in force" },
              { value: "active", label: "active" },
              { value: "bound", label: "bound" },
              { value: "pending", label: "pending" },
              { value: "lapsed", label: "lapsed" },
            ],
          },
          {
            key: "line",
            label: "Line",
            options: LINES.map((value) => ({ value, label: value })),
          },
          {
            key: "written",
            label: "Written",
            options: [
              { value: "this_month", label: "this month" },
              { value: "last_month", label: "last month" },
            ],
          },
          {
            key: "renewal",
            label: "Renewal",
            options: [
              { value: "30", label: "30 days" },
              { value: "60", label: "60 days" },
            ],
          },
          {
            key: "attention",
            label: "Attention",
            options: [{ value: "lapse", label: "lapse" }],
          },
        ]}
      />
      {key ? (
        <p className="mb-3 text-sm">
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
          <p className="px-4 py-6 text-base text-muted-foreground">
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
