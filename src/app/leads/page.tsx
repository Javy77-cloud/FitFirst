import Link from "next/link";
import { createDealFromLead, createLead } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listLeads } from "@/lib/db/queries";
import { DeskDrop } from "@/components/desk-drop";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const rows = await listLeads();
  return (
    <AppShell title="Leads">
      <div className="mb-4">
        <DeskDrop />
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
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
          <Button type="submit" size="sm">
            Save lead
          </Button>
        </form>

        <section className="ff-card overflow-hidden">
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
                    No leads yet.
                  </td>
                </tr>
              ) : (
                rows.map((lead) => (
                  <tr key={lead.id}>
                    <td className="font-medium">
                      {lead.lastName}, {lead.firstName}
                      <div className="text-[11px] text-muted-foreground">
                        {lead.phone ?? lead.email}
                      </div>
                    </td>
                    <td className="uppercase">{lead.status}</td>
                    <td>{lead.source}</td>
                    <td>
                      {lead.convertedDealId ? (
                        <Link href={`/deals/${lead.convertedDealId}`} className="text-xs text-primary">
                          Open deal
                        </Link>
                      ) : (
                        <form action={createDealFromLead}>
                          <input type="hidden" name="leadId" value={lead.id} />
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
