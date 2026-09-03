import Link from "next/link";
import { createContact } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listContacts } from "@/lib/db/queries";
import { formatDay } from "@/lib/domain";

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
          <h2 className="text-sm font-semibold text-navy">Add contact</h2>
          <div>
            <Label className="text-xs">First name</Label>
            <Input name="firstName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Last name</Label>
            <Input name="lastName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input name="email" type="email" className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input name="phone" className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Preferred language</Label>
            <select
              name="preferredLanguage"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue=""
            >
              <option value="">English (default)</option>
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="creole">Creole</option>
            </select>
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
                <th>Email</th>
                <th>Language</th>
                <th>Policies</th>
                <th>Tenure start</th>
                <th>Life / health</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground">
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
                    </td>
                    <td>{c.email ?? "—"}</td>
                    <td>{c.preferredLanguage || "—"}</td>
                    <td>{c.policyCount}</td>
                    <td>{formatDay(c.tenureStart)}</td>
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
