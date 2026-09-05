import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import { formatInDeskEsignList } from "@/lib/esign/in-desk";
import { listPolicies, type PolicyListFilter } from "@/lib/db/queries";
import { ColumnTable } from "@/components/lists/column-table";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { LINES } from "@/lib/domain";
import { firstParam } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";

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
  const q = firstParam(params.q) ?? "";
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
        searchPlaceholder="Contains policy #, party, carrier…"
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
        <ModuleListActions module="policies" recordIds={rows.map(({ policy }) => policy.id)}>
        <ColumnTable
          moduleId="policies"
          initialQuery={q}
          columns={[
            { id: "pick", label: "", locked: true },
            { id: "policy", label: "Policy", locked: true },
            { id: "status", label: "Status" },
            { id: "party", label: "Party" },
            { id: "carrier", label: "Carrier" },
            { id: "premium", label: "Premium" },
            { id: "expires", label: "Expires" },
            { id: "esign", label: "E-sign", locked: true },
          ]}
          empty="No policies match. Bind a shopping deal when a market is actually written."
          rows={rows.map(({ policy, contact, account, carrier }) => ({
            key: policy.id,
            hay: haystack([
              policy.policyNumber,
              policy.lineOfBusiness,
              policy.status,
              carrier?.name,
              contact ? `${contact.lastName} ${contact.firstName}` : null,
              account?.name,
            ]),
            cells: {
              pick: <SelectRowCheckbox id={policy.id} />,
              policy: (
                <span className="font-medium">
                  <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                </span>
              ),
              status: <PolicyStatusBadge status={policy.status} />,
              party: contact ? (
                <RecordLink href={`/contacts/${contact.id}`}>
                  {contact.lastName}, {contact.firstName}
                </RecordLink>
              ) : account ? (
                <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
              ) : (
                "—"
              ),
              carrier: carrier?.name ?? "—",
              premium: formatMoney(policy.premium),
              expires: formatDay(policy.expirationDate),
              esign: formatInDeskEsignList(
                policy.esignStatus,
                policy.esignSignedAt,
                policy.esignRequestedAt,
              ),
            },
          }))}
        />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
