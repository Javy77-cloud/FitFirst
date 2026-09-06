import { createLead } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { LeadFormFields } from "@/components/crm/lead-form-fields";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function NewLeadPage() {
  return (
    <AppShell title="Add Lead" eyebrow="Quick action">
      <form action={createLead} className="ff-card max-w-xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Person and coverage they asked for. After you save, drop files on each line of interest
          — never on the lead as a whole.
        </p>
        <LeadFormFields />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="autoRoute" value="1" defaultChecked className="mt-1" />
          <span>
            Auto-route by territory, written line, and producer capacity. No match goes to the
            Home lead-offer board.
          </span>
        </label>
        <Button type="submit" size="sm">
          Save lead
        </Button>
      </form>
    </AppShell>
  );
}
