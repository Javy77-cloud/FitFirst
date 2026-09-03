import { createContact } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { AccountFilters, AccountListTable, filterAccounts } from "@/components/crm/account-list-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listContacts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  const { q = "", state = "" } = await searchParams;
  const all = await listContacts();
  const rows = filterAccounts(
    all.filter((row) => row.accountKind === "commercial"),
    q,
    state,
  );

  return (
    <AppShell title="Businesses">
      <p className="mb-3 text-sm text-muted-foreground">
        Commercial accounts only. Same contact table, <code>account_kind = commercial</code>. A GL
        bind writes the business, then one policy for that line.
      </p>
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <form action={createContact} className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Add business</h2>
          <input type="hidden" name="accountKind" value="commercial" />
          <div>
            <Label htmlFor="legalName" className="text-xs">
              Legal / DBA name
            </Label>
            <Input id="legalName" name="legalName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="firstName" className="text-xs">
              Contact first
            </Label>
            <Input id="firstName" name="firstName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-xs">
              Contact last
            </Label>
            <Input id="lastName" name="lastName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs">
              Phone
            </Label>
            <Input id="phone" name="phone" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs">
              Email
            </Label>
            <Input id="email" name="email" type="email" className="mt-1 h-8" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="city" className="text-xs">
                City
              </Label>
              <Input id="city" name="city" className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="state" className="text-xs">
                State
              </Label>
              <Input id="state" name="state" defaultValue="FL" className="mt-1 h-8" />
            </div>
          </div>
          <Button type="submit" size="sm">
            Save business
          </Button>
        </form>
        <div className="space-y-3">
          <AccountFilters pathname="/businesses" q={q} state={state} />
          <AccountListTable
            rows={rows}
            kind="commercial"
            empty="No businesses match. Bind a commercial deal or add one here."
          />
        </div>
      </div>
    </AppShell>
  );
}
