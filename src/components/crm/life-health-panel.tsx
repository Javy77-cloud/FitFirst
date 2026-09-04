import { updateDealCrmNotes } from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LINE_LABELS } from "@/lib/crm/bind";
import type { Deal } from "@/lib/db/schema";

export function LifeHealthPanel({ deal }: { deal: Deal }) {
  const label = LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ?? deal.lineOfBusiness;
  return (
    <div className="space-y-4">
      <form action={updateDealCrmNotes} className="ff-card space-y-3 p-4">
        <input type="hidden" name="dealId" value={deal.id} />
        <h2 className="text-sm font-semibold text-navy">{label} CRM notes</h2>
        <p className="text-xs text-muted-foreground">
          Life and health stay on the contact and deal. There is no rating worksheet, market
          filter, or carrier portal for these lines.
        </p>
        <div>
          <Label htmlFor="primaryNamedInsured" className="text-xs">
            Proposed insured
          </Label>
          <Input
            id="primaryNamedInsured"
            name="primaryNamedInsured"
            defaultValue={deal.primaryNamedInsured ?? ""}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label htmlFor="notes" className="text-xs">
            CRM notes
          </Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={deal.notes ?? ""}
            className="mt-1 min-h-24"
            placeholder="Carrier interest, underwriting notes, referral — desk only."
          />
        </div>
        <Button type="submit" size="sm">
          Save CRM notes
        </Button>
      </form>

      <section className="ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">Rating</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Comparative rating is not available for life or health. Use the notes above, then bind
          when the coverage is actually written so the contact, policy, tenure, and 30/60/90
          tasks are created.
        </p>
      </section>
    </div>
  );
}
