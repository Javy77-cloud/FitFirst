import { archiveDeal, createDealOutreach } from "@/app/actions/crm";

export function DealStaleBadge({
  dealId,
  contactId,
  leadId,
}: {
  dealId: string;
  contactId?: string | null;
  leadId?: string | null;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1" data-testid="deal-stale-flag">
      <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
        Stale
      </span>
      <form action={createDealOutreach} className="inline">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="kind" value="task" />
        <input type="hidden" name="note" value="Re-engage — deal sat untouched past the follow-up threshold." />
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        <button type="submit" className="text-[11px] font-medium text-primary hover:underline">
          Re-engage
        </button>
      </form>
      <form action={archiveDeal} className="inline">
        <input type="hidden" name="dealId" value={dealId} />
        <button type="submit" className="text-[11px] text-muted-foreground hover:underline">
          Archive
        </button>
      </form>
    </div>
  );
}
