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
          Person record only. Start a shop from the lead when you are ready to quote. Dec pages
          belong on the Deal.
        </p>
        <LeadFormFields />
        <Button type="submit" size="sm">
          Save lead
        </Button>
      </form>
    </AppShell>
  );
}
