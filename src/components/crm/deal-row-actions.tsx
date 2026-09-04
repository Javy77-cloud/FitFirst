import { createDealOutreach } from "@/app/actions/crm";
import { MeetingButton } from "@/components/crm/meeting-button";
import { PIPELINE_CARD_ACTIONS } from "@/lib/meetings/types";

const LOG_KINDS = ["call", "sms", "task"] as const;

export function DealRowActions({
  dealId,
  phone,
  homeAddress,
  contactId,
  leadId,
}: {
  dealId: string;
  phone?: string | null;
  email?: string | null;
  homeAddress?: string | null;
  contactId?: string | null;
  leadId?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-1" data-ff-card-actions={PIPELINE_CARD_ACTIONS.join(",")}>
      {LOG_KINDS.map((kind) => (
        <form key={kind} action={createDealOutreach} className="inline">
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="kind" value={kind} />
          {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
          {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
          {kind === "call" && phone ? <input type="hidden" name="note" value={phone} /> : null}
          <button
            type="submit"
            className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-navy hover:bg-muted"
            title="Logs a desk task. Nothing is sent."
          >
            {kind === "call" ? "Call" : kind === "sms" ? "SMS" : "Task"}
          </button>
        </form>
      ))}
      <MeetingButton dealId={dealId} homeAddress={homeAddress} />
    </div>
  );
}
