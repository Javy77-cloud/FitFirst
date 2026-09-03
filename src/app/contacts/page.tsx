import Link from "next/link";
import { createContact } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { QueryTabs, resolveQueryTab } from "@/components/crm/query-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountDisplayName } from "@/lib/crm/bind";
import { formatTenure } from "@/lib/crm/display";
import { listContacts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const VIEWS = [
  { id: "all", label: "All accounts" },
  { id: "personal", label: "Personal" },
  { id: "commercial", label: "Business" },
] as const;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const active = resolveQueryTab(VIEWS, view);
  const rows = await listContacts();

  const table = (kind: "all" | "personal" | "commercial") => {
    const list = kind === "all" ? rows : rows.filter((row) => row.accountKind === kind);
    return (
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Kind</th>
              <th>Lifetime</th>
              <th>Active</th>
              <th>Tenure</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground">
                  Empty book. Bind a deal or add an existing client.
                </td>
              </tr>
            ) : (
              list.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">
                    <Link href={`/contacts/${c.id}`} className="text-primary hover:underline">
                      {accountDisplayName(c)}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">
                      {[c.city, c.state].filter(Boolean).join(", ") || "No mailing city"}
                    </div>
                  </td>
                  <td className="capitalize">{c.accountKind === "commercial" ? "Business" : "Personal"}</td>
                  <td>{c.policyCount}</td>
                  <td>{c.activePolicyCount}</td>
                  <td>{formatTenure(c.tenureStart)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    );
  };

  return (
    <AppShell title="Contacts & businesses">
      <p className="mb-3 text-sm text-muted-foreground">
        Bind creates a personal contact or a commercial business, then one policy per line.
        Lifetime and active counts live on the account. Shopping still starts as a deal.
      </p>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <form action={createContact} className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Add existing-book account</h2>
          <div>
            <Label className="text-xs">Account</Label>
            <select
              name="accountKind"
              defaultValue="personal"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="personal">Personal contact</option>
              <option value="commercial">Commercial business</option>
            </select>
          </div>
          <div>
            <Label htmlFor="legalName" className="text-xs">
              Legal / DBA name
            </Label>
            <Input id="legalName" name="legalName" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="firstName" className="text-xs">
              First name
            </Label>
            <Input id="firstName" name="firstName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-xs">
              Last name
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
          <div>
            <Label htmlFor="lifeNotes" className="text-xs">
              Life notes (CRM only)
            </Label>
            <Input id="lifeNotes" name="lifeNotes" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="healthNotes" className="text-xs">
              Health notes (CRM only)
            </Label>
            <Input id="healthNotes" name="healthNotes" className="mt-1 h-8" />
          </div>
          <Button type="submit" size="sm">
            Save account
          </Button>
        </form>
        <QueryTabs
          pathname="/contacts"
          param="view"
          active={active}
          tabs={[
            { id: "all", label: "All accounts", content: table("all") },
            { id: "personal", label: "Personal", content: table("personal") },
            { id: "commercial", label: "Business", content: table("commercial") },
          ]}
        />
      </div>
    </AppShell>
  );
}
