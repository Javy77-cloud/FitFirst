import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { RecordLink } from "@/components/record-links";
import { defaultColumns } from "@/lib/desk/columns";
import { formatDay, formatMoney } from "@/lib/domain";
import { BookFilterBar } from "@/components/desk/book-filter-bar";
import { listPolicies, listUsersById, type PolicyListFilter } from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
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
    lifeSub: first(params.lifeSub),
    healthSub: first(params.healthSub),
  };
  const [rows, users, lineSettings] = await Promise.all([
    listPolicies(filter),
    listUsersById(),
    loadDeskLineSettings(),
  ]);
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
      <BookFilterBar
        action="/policies"
        settings={lineSettings}
        family={filter.family}
        pcSub={filter.pcSub}
        lifeSub={filter.lifeSub}
        healthSub={filter.healthSub}
      />
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
                <Col table="policies" col="subType" as="th">Sub-type</Col>
                <Col table="policies" col="carrier" as="th">Carrier</Col>
                <Col table="policies" col="premium" as="th">Premium</Col>
                <Col table="policies" col="coverageA" as="th">Cov A</Col>
                <Col table="policies" col="billingFrequency" as="th">Premium frequency</Col>
                <Col table="policies" col="premises" as="th">Premises</Col>
                <Col table="policies" col="premisesCity" as="th">Premises city</Col>
                <Col table="policies" col="effective" as="th">Effective</Col>
                <Col table="policies" col="expires" as="th">X-Date</Col>
                <Col table="policies" col="assigned" as="th">Assigned</Col>
              </tr>
            </thead>
            <SheetTbody>
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
                  <Col table="policies" col="subType">{policy.policySubType ?? "—"}</Col>
                  <Col table="policies" col="carrier">{carrier?.name ?? "—"}</Col>
                  <Col table="policies" col="premium" sortValue={policy.premium}>
                    {formatMoney(policy.premium)}
                  </Col>
                  <Col table="policies" col="coverageA" sortValue={policy.coverageA}>
                    {policy.coverageA != null ? formatMoney(policy.coverageA) : "—"}
                  </Col>
                  <Col table="policies" col="billingFrequency">{policy.billingFrequency ?? "—"}</Col>
                  <Col table="policies" col="premises">{policy.premisesAddress ?? "—"}</Col>
                  <Col table="policies" col="premisesCity">{policy.premisesCity ?? "—"}</Col>
                  <Col table="policies" col="effective">{formatDay(policy.effectiveDate)}</Col>
                  <Col table="policies" col="expires">{formatDay(policy.expirationDate)}</Col>
                  <Col table="policies" col="assigned">{policy.ownerId ? users.get(policy.ownerId) ?? "—" : "—"}</Col>
                </tr>
              ))}
            </SheetTbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
