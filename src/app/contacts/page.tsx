import Link from "next/link";
import { createContact } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTenure } from "@/lib/crm/display";
import { listContacts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const rows = await listContacts();
  return (
    <AppShell title="Contacts">
      <p className="mb-3 text-sm text-muted-foreground">
        Bound clients live here, with tenure and policy count. You can also add an existing-book
        contact. Shopping still starts as a deal, not a policy.
      </p>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <form action={createContact} className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Add existing-book contact</h2>
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
            Save contact
          </Button>
        </form>
        <section className="ff-card overflow-x-auto">
          <table className="ff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Policies</th>
                <th>Tenure</th>
                <th>Life / health</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted-foreground">
                    Empty book. Bind a deal or add an existing client.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">
                      <Link href={`/contacts/${c.id}`} className="text-primary hover:underline">
                        {c.lastName}, {c.firstName}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">
                        {[c.city, c.state].filter(Boolean).join(", ") || "No mailing city"}
                      </div>
                    </td>
                    <td>{c.policyCount}</td>
                    <td>{formatTenure(c.tenureStart)}</td>
                    <td className="text-xs">
                      {[c.lifeNotes, c.healthNotes].filter(Boolean).join(" · ") || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
