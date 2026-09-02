import Link from "next/link";
import { notFound } from "next/navigation";
import { createDealFromLead, updateLead } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { LineSelect } from "@/components/crm/line-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUSES } from "@/lib/domain";
import { getLead } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <AppShell
      title={`${lead.lastName}, ${lead.firstName}`}
      actions={
        lead.convertedDealId ? (
          <Link href={`/deals/${lead.convertedDealId}`} className={cn(buttonVariants())}>
            Open shopping deal
          </Link>
        ) : null
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Status and notes live here. Converting opens a shopping deal — still no contact or
        policy until bind.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <form action={updateLead} className="ff-card space-y-3 p-4">
          <input type="hidden" name="leadId" value={lead.id} />
          <h2 className="text-sm font-semibold text-navy">Lead record</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName" className="text-xs">
                First name
              </Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={lead.firstName}
                required
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-xs">
                Last name
              </Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={lead.lastName}
                required
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs">
                Phone
              </Label>
              <Input id="phone" name="phone" defaultValue={lead.phone ?? ""} className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={lead.email ?? ""}
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label htmlFor="source" className="text-xs">
                Source
              </Label>
              <Input id="source" name="source" defaultValue={lead.source ?? ""} className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="status" className="text-xs">
                Status
              </Label>
              <select
                id="status"
                name="status"
                defaultValue={lead.status}
                disabled={lead.status === "converted"}
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm disabled:opacity-60"
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {lead.status === "converted" ? (
                <input type="hidden" name="status" value="converted" />
              ) : null}
            </div>
          </div>
          <div>
            <Label htmlFor="notes" className="text-xs">
              Notes
            </Label>
            <Textarea id="notes" name="notes" defaultValue={lead.notes ?? ""} className="mt-1 min-h-24" />
          </div>
          <Button type="submit" size="sm">
            Save lead
          </Button>
        </form>

        <section className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Convert to shopping deal</h2>
          {lead.convertedDealId ? (
            <p className="text-sm text-muted-foreground">
              Already converted. The shop is the deal, not a policy.
            </p>
          ) : (
            <form action={createDealFromLead} className="space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <div>
                <Label htmlFor="line" className="text-xs">
                  Line
                </Label>
                <LineSelect />
              </div>
              <p className="text-xs text-muted-foreground">
                Life and health open a CRM-only deal with no rating UI. P&amp;C lines get the
                master risk worksheet.
              </p>
              <Button type="submit" size="sm">
                Start shop
              </Button>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}
