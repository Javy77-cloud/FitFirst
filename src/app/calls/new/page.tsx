import { createHeaderCall } from "@/app/actions/header-quick";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listRelatedOptions } from "@/lib/db/activity-queries";

export const dynamic = "force-dynamic";

export default async function NewCallPage() {
  const options = await listRelatedOptions();
  return (
    <AppShell title="Log Call" eyebrow="New">
      <form action={createHeaderCall} className="ff-card max-w-xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Desk call note — not a live trunk. Assign it to a Deal, Contact, Policy, Business, or Lead.
        </p>
        <input type="hidden" name="kind" value="call" />
        <input type="hidden" name="status" value="completed" />
        <input type="hidden" name="returnTo" value="/calendar" />
        <div>
          <Label className="text-xs">Title</Label>
          <Input name="title" required className="mt-1 h-8" defaultValue="Call" />
        </div>
        <div>
          <Label className="text-xs">When</Label>
          <Input name="startAt" type="datetime-local" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Contact</Label>
          <select name="contactId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">—</option>
            {options.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Lead</Label>
          <select name="leadId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">—</option>
            {options.leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.lastName}, {lead.firstName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Deal</Label>
          <select name="dealId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">—</option>
            {options.deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Policy</Label>
          <select name="policyId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">—</option>
            {options.policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.policyNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Business</Label>
          <select name="accountId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">—</option>
            {options.businesses.map((biz) => (
              <option key={biz.id} value={biz.id}>
                {biz.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">
          Log call
        </Button>
      </form>
    </AppShell>
  );
}
