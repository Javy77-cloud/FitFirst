import Link from "next/link";
import { createDealFromLead, createLead } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { visibleColumns } from "@/components/brand/column-layout-fields";
import { getResolvedDesk } from "@/lib/db/brand-queries";
import { listLeads } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [rows, desk] = await Promise.all([listLeads(), getResolvedDesk()]);
  const cols = visibleColumns("leads", desk.columnLayout);
  return (
    <AppShell title="Leads">
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
                {cols.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="text-muted-foreground">
                    No leads yet.
                  </td>
                </tr>
              ) : (
                rows.map((lead) => (
                  <tr key={lead.id}>
                    {cols.map((col) => (
                      <td key={col.key}>
                        {col.key === "name" ? (
                          <div className="font-medium">
                            {lead.lastName}, {lead.firstName}
                            <div className="text-[11px] text-muted-foreground">
                              {lead.phone ?? lead.email}
                            </div>
                          </div>
                        ) : col.key === "status" ? (
                          <span className="uppercase">{lead.status}</span>
                        ) : col.key === "source" ? (
                          lead.source
                        ) : lead.convertedDealId ? (
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
                    ))}
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
