import Link from "next/link";
import { createDealOutreach } from "@/app/actions/crm";
import { ChangeOwnerDialog } from "@/components/deals/change-owner-dialog";
import { DealRowComms } from "@/components/deal-row-comms";
import { MeetingButton } from "@/components/crm/meeting-button";
import type { DeskUserOption } from "@/lib/deals/transfer";
import { PIPELINE_CARD_ACTIONS } from "@/lib/meetings/types";

export function DealRowActions({
  dealId,
  phone,
  email,
  homeAddress,
  contactId,
  accountId,
  leadId,
  ownerId,
  users = [],
}: {
  dealId: string;
  phone?: string | null;
  email?: string | null;
  homeAddress?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
  ownerId?: string | null;
  users?: DeskUserOption[];
}) {
  return (
    <div className="flex flex-wrap gap-1" data-ff-card-actions={PIPELINE_CARD_ACTIONS.join(",")}>
      <DealRowComms
        dealId={dealId}
        contactId={contactId}
        accountId={accountId}
        phone={phone}
        email={email}
      />
      <Link
        href={`/deals/${dealId}?tab=quotes`}
        className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15"
      >
        Send quote
      </Link>
      <form action={createDealOutreach} className="inline">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="kind" value="task" />
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        <button
          type="submit"
          className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15"
          title="Adds a desk task on this deal. Nothing is sent."
        >
          Add task
        </button>
      </form>
      {users.length > 0 ? (
        <ChangeOwnerDialog dealId={dealId} ownerId={ownerId} users={users} />
      ) : null}
      <MeetingButton dealId={dealId} homeAddress={homeAddress} />
    </div>
  );
}
