import { createContact } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listContacts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const rows = await listContacts();
  return (
    <AppShell title="Contacts">
      <p className="mb-3 text-base text-muted-foreground">
        Personal-lines bind creates a Contact and copies lead/risk fields. Client = any related
        policy is Active, Bound, or Pending. Ana is on the book for the shop only — not a client.
      </p>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <form action={createContact} className="ff-card space-y-3 p-4">
          <h2 className="text-base font-semibold text-navy">Add contact</h2>
          <div>
            <Label className="text-xs">First name</Label>
            <Input name="firstName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Last name</Label>
            <Input name="lastName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input name="phone" className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Life notes (CRM only)</Label>
            <Input name="lifeNotes" className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Health notes (CRM only)</Label>
            <Input name="healthNotes" className="mt-1 h-8" />
          </div>
          <Button type="submit" size="sm">
            Save contact
          </Button>
        </form>
        <section className="ff-card overflow-hidden">
          <table className="ff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Lifetime</th>
                <th>In-force</th>
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
                      <RecordLink href={`/contacts/${c.id}`}>
                        {c.lastName}, {c.firstName}
                      </RecordLink>
                    </td>
                    <td>
                      <ClientStatusPill status={c.clientStatus} />
                    </td>
                    <td>{c.policyCount}</td>
                    <td>{c.activePolicyCount}</td>
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
