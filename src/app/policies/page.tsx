import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { RecordLink } from "@/components/record-links";
import { defaultColumns } from "@/lib/desk/columns";
import { formatDay, formatMoney } from "@/lib/domain";
import { listPolicies, listUsersById, type PolicyListFilter } from "@/lib/db/queries";
import { partyLabel, policyRecordName } from "@/lib/desk/policy-name";

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
    family: first(params.family),
    pcSub: first(params.pcSub),
  };
  const rows = await listPolicies(filter);
  const users = await listUsersById();
  const key = Object.entries(filter)
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}:${value}`)
    .join(" · ");
  const pair = Object.entries(filter).find(([, value]) => value);
  const hint =
    FILTER_COPY[pair ? `${pair[0]}:${pair[1]}` : ""] ??
    (key
      ? `Filtered · ${key}`
      : "Policies exist only after bind. Name click opens the policy record — insured, not Party.");

  return (
    <AppShell
      title="Policies"
      columns={<ColumnPicker tableKey="policies" initial={defaultColumns("policies")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
      <form className="mb-3 flex flex-wrap gap-2 text-sm">
        <select name="family" defaultValue={filter.family ?? ""} className="h-8 rounded-md border border-input bg-card px-2">
          <option value="">All families</option>
          <option value="pc">P&amp;C</option>
          <option value="life">Life</option>
          <option value="health">Health</option>
        </select>
        <select name="pcSub" defaultValue={filter.pcSub ?? ""} className="h-8 rounded-md border border-input bg-card px-2">
          <option value="">P&amp;C subfilter</option>
          <option value="home">Home</option>
          <option value="auto">Auto</option>
          <option value="flood">Flood</option>
          <option value="commercial">Commercial</option>
        </select>
        <button type="submit" className="h-8 rounded-md border border-input px-3 text-xs">
          Apply
        </button>
      </form>
      {key ? (
        <p className="mb-3 text-[12px]">
          <Link href="/policies" className="text-primary hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}
      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No policies match. Bind a shopping deal when a market is actually written.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="policies" col="number" as="th">Policy</Col>
                <Col table="policies" col="status" as="th">Status</Col>
                <Col table="policies" col="insured" as="th">Insured</Col>
                <Col table="policies" col="line" as="th">Line</Col>
                <Col table="policies" col="carrier" as="th">Carrier</Col>
                <Col table="policies" col="premium" as="th">Premium</Col>
                <Col table="policies" col="effective" as="th">Effective</Col>
                <Col table="policies" col="expires" as="th">X-Date</Col>
                <Col table="policies" col="assigned" as="th">Assigned</Col>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ policy, contact, account, carrier }) => (
                <tr key={policy.id}>
                  <Col table="policies" col="number">
                    <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                    <div className="text-[11px] text-muted-foreground">
                      {policyRecordName({
                        contactName: partyLabel(contact, null) || null,
                        businessName: account?.name,
                        subType: policy.policySubType,
                        lineOfBusiness: policy.lineOfBusiness,
                        formType: policy.formType,
                        carrierName: carrier?.name,
                        effectiveDate: policy.effectiveDate,
                      })}
                    </div>
                  </Col>
                  <Col table="policies" col="status" className="uppercase">
                    {policy.status}
                  </Col>
                  <Col table="policies" col="insured">
                    {contact ? (
                      <RecordLink href={`/contacts/${contact.id}`}>
                        {contact.lastName}, {contact.firstName}
                      </RecordLink>
                    ) : account ? (
                      <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                    ) : (
                      "—"
                    )}
                  </Col>
                  <Col table="policies" col="line">{policy.lineOfBusiness}</Col>
                  <Col table="policies" col="carrier">{carrier?.name ?? "—"}</Col>
                  <Col table="policies" col="premium">{formatMoney(policy.premium)}</Col>
                  <Col table="policies" col="effective">{formatDay(policy.effectiveDate)}</Col>
                  <Col table="policies" col="expires">{formatDay(policy.expirationDate)}</Col>
                  <Col table="policies" col="assigned">{policy.ownerId ? users.get(policy.ownerId) ?? "—" : "—"}</Col>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
