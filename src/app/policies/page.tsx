import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker } from "@/components/crm/column-picker";
import { ExpirationBadge } from "@/components/crm/expiration-badge";
import { FilterLinks } from "@/components/crm/filter-links";
import { InsuredLink } from "@/components/crm/insured-link";
import {
  insuredContactName,
  insuredHref,
  matchesPolicyFilters,
  parsePcSubfilter,
  parsePolicyBook,
  PC_SUBFILTERS,
  POLICY_BOOKS,
  policyBook,
} from "@/lib/crm/lists";
import { formatMoney } from "@/lib/domain";
import { listPolicies } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { id: "policy", header: "Policy", defaultVisible: true, hideable: false },
  { id: "insured", header: "Insured / contact name", defaultVisible: true },
  { id: "line", header: "Line", defaultVisible: true },
  { id: "book", header: "Book", defaultVisible: true },
  { id: "status", header: "Status", defaultVisible: true },
  { id: "carrier", header: "Carrier", defaultVisible: true },
  { id: "premium", header: "Premium", defaultVisible: true },
  { id: "coverageA", header: "Cov A", defaultVisible: false },
  { id: "effective", header: "Effective", defaultVisible: false },
  { id: "expires", header: "Expires", defaultVisible: true },
  { id: "deal", header: "Deal", defaultVisible: true },
];

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string; sub?: string }>;
}) {
  const params = await searchParams;
  const book = parsePolicyBook(params.book);
  const sub = parsePcSubfilter(params.sub);
  const all = await listPolicies();
  const rows = all.filter(({ policy }) => matchesPolicyFilters(policy.lineOfBusiness, book, sub));

  return (
    <AppShell title="Policies">
      <p className="mb-3 text-sm text-muted-foreground">
        Policies exist only after bind. Filter the book first (P&amp;C / Life / Health), then the
        P&amp;C line. The insured / contact name opens the contact — never a blank party link.
      </p>
      <div className="mb-3 space-y-2">
        <FilterLinks
          pathname="/policies"
          param="book"
          value={book}
          extra={{ sub: book === "pc" ? sub : "all" }}
          options={POLICY_BOOKS}
        />
        {book === "pc" ? (
          <FilterLinks
            pathname="/policies"
            param="sub"
            value={sub}
            extra={{ book }}
            options={PC_SUBFILTERS}
          />
        ) : null}
      </div>
      <ColumnPicker tableId="policies" columns={COLUMNS}>
        <section className="ff-card overflow-x-auto">
          <table className="ff-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.id} data-col={col.id}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-muted-foreground">
                    No policies in this filter. Bind a shopping deal when a market is actually written.
                  </td>
                </tr>
              ) : (
                rows.map(({ policy, contact, carrier, deal }) => {
                  const name = insuredContactName({
                    primaryNamedInsured: deal?.primaryNamedInsured,
                    secondaryNamedInsured: deal?.secondaryNamedInsured,
                    contact,
                  });
                  const href = insuredHref({ contactId: policy.contactId, leadId: deal?.leadId });
                  const bookLabel =
                    policyBook(policy.lineOfBusiness) === "pc"
                      ? "P&C"
                      : policyBook(policy.lineOfBusiness) === "life"
                        ? "Life"
                        : "Health";
                  return (
                    <tr key={policy.id}>
                      <td data-col="policy" className="font-medium">
                        <Link href={`/policies/${policy.id}`} className="text-primary hover:underline">
                          {policy.policyNumber}
                        </Link>
                      </td>
                      <td data-col="insured">
                        <InsuredLink href={href} name={name} />
                      </td>
                      <td data-col="line">{policy.lineOfBusiness}</td>
                      <td data-col="book">{bookLabel}</td>
                      <td data-col="status" className="capitalize">
                        {policy.status}
                      </td>
                      <td data-col="carrier">{carrier?.name ?? "—"}</td>
                      <td data-col="premium">{formatMoney(policy.premium)}</td>
                      <td data-col="coverageA">
                        {policy.coverageA != null ? formatMoney(policy.coverageA) : "—"}
                      </td>
                      <td data-col="effective">
                        {policy.effectiveDate.toISOString().slice(0, 10)}
                      </td>
                      <td data-col="expires">
                        <ExpirationBadge date={policy.expirationDate} />
                      </td>
                      <td data-col="deal">
                        {deal ? (
                          <Link href={`/deals/${deal.id}`} className="hover:underline">
                            {deal.title}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </ColumnPicker>
    </AppShell>
  );
}
