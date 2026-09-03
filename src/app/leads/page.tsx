import Link from "next/link";
import { createDealFromLead, createLead } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { DecDropForm } from "@/components/crm/dec-drop-form";
import { LineSelect } from "@/components/crm/line-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColumnPicker } from "@/components/crm/column-picker";
import { LinkedValue } from "@/components/crm/linked-value";
import { formatIsoDate } from "@/lib/crm/display";
import { listLeads } from "@/lib/db/queries";

const LEAD_COLUMNS = [
  { id: "name", header: "Name", defaultVisible: true, hideable: false },
  { id: "status", header: "Status", defaultVisible: true },
  { id: "source", header: "Source", defaultVisible: true },
  { id: "phone", header: "Phone", defaultVisible: true },
  { id: "email", header: "Email", defaultVisible: true },
  { id: "created", header: "Created", defaultVisible: false },
  { id: "action", header: "Shop", defaultVisible: true, hideable: false },
];

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const rows = await listLeads();
  return (
    <AppShell title="Leads">
      <p className="mb-3 text-sm text-muted-foreground">
        A lead is not a client. Type the name once — Start shop copies it onto the deal as the
        insured. Phone and email stay on the row so you dial, mail, or copy without opening the
        record. Contact and policy wait until bind.
      </p>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <form action={createLead} className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">New lead</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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
              <Label htmlFor="source" className="text-xs">
                Source
              </Label>
              <Input id="source" name="source" placeholder="referral, walk-in, book" className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="notes" className="text-xs">
                Notes
              </Label>
              <Textarea id="notes" name="notes" className="mt-1 min-h-16" />
            </div>
          </div>
          <Button type="submit" size="sm">
            Save lead
          </Button>
        </form>

        <div className="space-y-4">
        <DecDropForm />
        <ColumnPicker tableId="leads" columns={LEAD_COLUMNS}>
        <section className="ff-card overflow-x-auto">
          <table className="ff-table">
            <thead>
              <tr>
                {LEAD_COLUMNS.map((col) => (
                  <th key={col.id} data-col={col.id}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={LEAD_COLUMNS.length} className="text-muted-foreground">
                    No leads yet. Save one on the left.
                  </td>
                </tr>
              ) : (
                rows.map((lead) => (
                  <tr key={lead.id}>
                    <td data-col="name" className="font-medium">
                      <Link href={`/leads/${lead.id}`} className="text-primary hover:underline">
                        {lead.lastName}, {lead.firstName}
                      </Link>
                    </td>
                    <td data-col="status" className="uppercase">
                      {lead.status}
                    </td>
                    <td data-col="source">{lead.source ?? "—"}</td>
                    <td data-col="phone">
                      <LinkedValue value={lead.phone} kind="tel" />
                    </td>
                    <td data-col="email">
                      <LinkedValue value={lead.email} kind="email" />
                    </td>
                    <td data-col="created">{formatIsoDate(lead.createdAt)}</td>
                    <td data-col="action">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
        </ColumnPicker>
        </div>
      </div>
    </AppShell>
  );
}
