import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultColumns } from "@/lib/desk/columns";
import { listAccounts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = first(params.status);
  const city = first(params.city);
  const rows = await listAccounts({ status, city });

  return (
    <AppShell
      title="Businesses"
      columns={<ColumnPicker tableKey="accounts" initial={defaultColumns("accounts")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Commercial bind creates a Business. Client status is computed from in-force commercial
        policies on this account — personal HO on a linked contact does not flip the business.
      </p>
      <form className="mb-3 flex flex-wrap gap-2 text-sm">
        <select name="status" defaultValue={status ?? ""} className="h-8 rounded-md border border-input bg-card px-2">
          <option value="">All statuses</option>
          <option value="client">Client</option>
          <option value="former_client">Former client</option>
          <option value="not_a_client">Not a client</option>
        </select>
        <Input name="city" defaultValue={city ?? ""} placeholder="City" className="h-8 w-36" />
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
      </form>
      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No businesses yet. Bind a commercial deal as a Business.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="accounts" col="name" as="th">Business</Col>
                <Col table="accounts" col="status" as="th">Status</Col>
                <Col table="accounts" col="ein" as="th">EIN</Col>
                <Col table="accounts" col="phone" as="th">Phone</Col>
                <Col table="accounts" col="city" as="th">City</Col>
                <Col table="accounts" col="employees" as="th">Employees</Col>
                <Col table="accounts" col="lifetime" as="th">Lifetime</Col>
                <Col table="accounts" col="inForce" as="th">In-force</Col>
              </tr>
            </thead>
            <SheetTbody>
              {rows.map((account) => (
                <tr key={account.id}>
                  <Col table="accounts" col="name">
                    <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                  </Col>
                  <Col table="accounts" col="status">
                    <ClientStatusPill status={account.clientStatus} />
                  </Col>
                  <Col table="accounts" col="ein">{account.ein ?? "—"}</Col>
                  <Col table="accounts" col="phone">{account.phone ?? "—"}</Col>
                  <Col table="accounts" col="city">{account.city ?? "—"}</Col>
                  <Col table="accounts" col="employees">{account.employeeCount ?? "—"}</Col>
                  <Col table="accounts" col="lifetime">{account.policyCount}</Col>
                  <Col table="accounts" col="inForce">{account.activePolicyCount}</Col>
                </tr>
              ))}
            </SheetTbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
