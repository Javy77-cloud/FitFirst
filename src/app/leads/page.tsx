import Link from "next/link";
import { createDealFromLead, createLead } from "@/app/actions/crm";
import { dropLeadPacket, dropSampleDecPacket, stubEmailLead, stubSocialLead } from "@/app/actions/lifecycle";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { LineSelect } from "@/components/crm/line-select";
import { DeskDrop } from "@/components/desk-drop";
import { RecordLink } from "@/components/record-links";
import { AddressFieldset } from "@/components/address-autofill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultColumns } from "@/lib/desk/columns";
import { formatDay } from "@/lib/domain";
import { listLeads } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const rows = await listLeads();
  return (
    <AppShell
      title="Leads"
      columns={<ColumnPicker tableKey="leads" initial={defaultColumns("leads")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Create or match by name + phone or email. Never duplicate. A dropped dec becomes a lead
        first; the deal is the shop. Quotes still do not create a policy.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <form action={dropSampleDecPacket}>
          <Button type="submit" size="sm" variant="outline">
            Drop Melbourne dec (matches Elena)
          </Button>
        </form>
        <form action={stubEmailLead}>
          <Button type="submit" size="sm" variant="outline">
            Stub email lead
          </Button>
        </form>
        <form action={stubSocialLead}>
          <Button type="submit" size="sm" variant="outline">
            Stub social lead
          </Button>
        </form>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <form action={createLead} className="ff-card space-y-3 p-4">
            <h2 className="text-sm font-semibold text-navy">New lead</h2>
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
            <AddressFieldset streetName="mailingAddress" streetLabel="Mailing address" streetId="mailingAddress" />
            <Button type="submit" size="sm">
              Save lead
            </Button>
          </form>
          <form action={dropLeadPacket} className="ff-card space-y-3 p-4">
            <h2 className="text-sm font-semibold text-navy">Drop a dec packet</h2>
            <p className="text-xs text-muted-foreground">
              PDF or text. Named insured + phone or email matches an existing lead. Empty file
              uses the Melbourne sample.
            </p>
            <input name="file" type="file" className="block w-full text-xs" />
            <Button type="submit" size="sm">
              Import packet
            </Button>
          </form>
          <DeskDrop compact />
        </div>

        <section className="ff-card overflow-x-auto">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <Col table="leads" col="name" as="th">Name</Col>
                  <Col table="leads" col="status" as="th">Status</Col>
                  <Col table="leads" col="source" as="th">Source</Col>
                  <Col table="leads" col="phone" as="th">Phone</Col>
                  <Col table="leads" col="email" as="th">Email</Col>
                  <Col table="leads" col="created" as="th">Created</Col>
                  <Col table="leads" col="action" as="th">Shop</Col>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <tr key={lead.id}>
                    <Col table="leads" col="name" className="font-medium">
                      <RecordLink href={`/leads/${lead.id}`}>
                        {lead.lastName}, {lead.firstName}
                      </RecordLink>
                    </Col>
                    <Col table="leads" col="status" className="uppercase">
                      {lead.status}
                    </Col>
                    <Col table="leads" col="source">{lead.source}</Col>
                    <Col table="leads" col="phone">{lead.phone ?? "—"}</Col>
                    <Col table="leads" col="email">{lead.email ?? "—"}</Col>
                    <Col table="leads" col="created">{formatDay(lead.createdAt)}</Col>
                    <Col table="leads" col="action">
                      {lead.convertedDealId ? (
                        <Link href={`/deals/${lead.convertedDealId}`} className="text-xs text-primary">
                          Open deal
                        </Link>
                      ) : (
                        <form action={createDealFromLead} className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                          <input type="hidden" name="leadId" value={lead.id} />
                          <LineSelect id={`line-${lead.id}`} defaultValue="HO" />
                          <Button type="submit" size="xs">
                            Start shop
                          </Button>
                        </form>
                      )}
                    </Col>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
