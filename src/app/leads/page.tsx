import Link from "next/link";
import { createDealFromLead, createLead } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { LineSelect } from "@/components/crm/line-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listLeads } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const rows = await listLeads();
  return (
    <AppShell title="Leads">
      <p className="mb-3 text-sm text-muted-foreground">
        A lead is not a client. Convert to a shopping deal; contact and policy wait until bind.
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

        <section className="ff-card overflow-x-auto">
          <table className="ff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted-foreground">
                    No leads yet. Save one on the left.
                  </td>
                </tr>
              ) : (
                rows.map((lead) => (
                  <tr key={lead.id}>
                    <td className="font-medium">
                      <Link href={`/leads/${lead.id}`} className="text-primary hover:underline">
                        {lead.lastName}, {lead.firstName}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">
                        {lead.phone ?? lead.email ?? "No phone or email"}
                      </div>
                    </td>
                    <td className="uppercase">{lead.status}</td>
                    <td>{lead.source ?? "—"}</td>
                    <td>
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
      </div>
    </AppShell>
  );
}
