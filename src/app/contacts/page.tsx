import Link from "next/link";
import { createContact } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { AddressFieldset } from "@/components/address-autofill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultColumns } from "@/lib/desk/columns";
import { listContacts, listUsersById } from "@/lib/db/queries";
import { ssnMaskFromRow } from "@/lib/pii/vault";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = first(params.status);
  const city = first(params.city);
  const rows = await listContacts({ status, city });
  const users = await listUsersById();

  return (
    <AppShell
      title="Contacts"
      columns={<ColumnPicker tableKey="contacts" initial={defaultColumns("contacts")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Client = at least one Active / Bound / Pending policy. Former client = lifetime ≥ 1 and
        in-force = 0. Ana (0 policies) is Not a client. Status is computed from policies, not a
        stored flag.
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
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <form action={createContact} className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Add personal contact</h2>
          <input type="hidden" name="accountKind" value="personal" />
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
            <Label className="text-xs">Email</Label>
            <Input name="email" type="email" className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input name="phone" className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">SSN</Label>
            <Input name="ssn" autoComplete="off" className="mt-1 h-8" placeholder="Encrypted at rest" />
          </div>
          <AddressFieldset streetName="mailingAddress" streetLabel="Mailing address" />
          <Button type="submit" size="sm">
            Save contact
          </Button>
        </form>
        <section className="ff-card overflow-x-auto">
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="contacts" col="name" as="th">Name</Col>
                <Col table="contacts" col="firstName" as="th">First name</Col>
                <Col table="contacts" col="lastName" as="th">Last name</Col>
                <Col table="contacts" col="status" as="th">Status</Col>
                <Col table="contacts" col="phone" as="th">Phone</Col>
                <Col table="contacts" col="email" as="th">Email</Col>
                <Col table="contacts" col="mailingAddress" as="th">Mailing address</Col>
                <Col table="contacts" col="city" as="th">City</Col>
                <Col table="contacts" col="state" as="th">State</Col>
                <Col table="contacts" col="zip" as="th">ZIP</Col>
                <Col table="contacts" col="dateOfBirth" as="th">Date of birth</Col>
                <Col table="contacts" col="ssn" as="th">SSN</Col>
                <Col table="contacts" col="language" as="th">Language</Col>
                <Col table="contacts" col="maritalStatus" as="th">Marital status</Col>
                <Col table="contacts" col="notes" as="th">Notes</Col>
                <Col table="contacts" col="emailOptOut" as="th">Email opt-out</Col>
                <Col table="contacts" col="smsOptOut" as="th">SMS opt-out</Col>
                <Col table="contacts" col="assigned" as="th">Assigned</Col>
                <Col table="contacts" col="lifetime" as="th">Lifetime</Col>
                <Col table="contacts" col="inForce" as="th">In-force</Col>
              </tr>
            </thead>
            <SheetTbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={20} className="text-muted-foreground">
                    Empty book. Bind a deal or add an existing client.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id}>
                    <Col table="contacts" col="name">
                      <RecordLink href={`/contacts/${c.id}`}>
                        {c.lastName}, {c.firstName}
                      </RecordLink>
                    </Col>
                    <Col table="contacts" col="firstName">{c.firstName}</Col>
                    <Col table="contacts" col="lastName">{c.lastName}</Col>
                    <Col table="contacts" col="status">
                      <ClientStatusPill status={c.clientStatus} />
                    </Col>
                    <Col table="contacts" col="phone">{c.phone ?? "—"}</Col>
                    <Col table="contacts" col="email">{c.email ?? "—"}</Col>
                    <Col table="contacts" col="mailingAddress">{c.mailingAddress ?? "—"}</Col>
                    <Col table="contacts" col="city">{c.city ?? "—"}</Col>
                    <Col table="contacts" col="state">{c.state ?? "—"}</Col>
                    <Col table="contacts" col="zip">{c.zip ?? "—"}</Col>
                    <Col table="contacts" col="dateOfBirth">{c.dateOfBirth || "—"}</Col>
                    <Col table="contacts" col="ssn">{ssnMaskFromRow(c) ?? "—"}</Col>
                    <Col table="contacts" col="language">{c.language ?? "—"}</Col>
                    <Col table="contacts" col="maritalStatus">{c.maritalStatus ?? "—"}</Col>
                    <Col table="contacts" col="notes">{c.notes ?? "—"}</Col>
                    <Col table="contacts" col="emailOptOut">{c.emailOptOut ? "Opted out" : "—"}</Col>
                    <Col table="contacts" col="smsOptOut">{c.smsOptOut ? "Opted out" : "—"}</Col>
                    <Col table="contacts" col="assigned">{c.ownerId ? users.get(c.ownerId) ?? "—" : "—"}</Col>
                    <Col table="contacts" col="lifetime">{c.policyCount}</Col>
                    <Col table="contacts" col="inForce">{c.activePolicyCount}</Col>
                  </tr>
                ))
              )}
            </SheetTbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
