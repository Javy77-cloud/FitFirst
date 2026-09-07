import Link from "next/link";
import { ChangeOwnerDialog } from "@/components/deals/change-owner-dialog";
import { MeetingButton } from "@/components/crm/meeting-button";
import type { DeskUserOption } from "@/lib/deals/transfer";
import { PIPELINE_CARD_ACTIONS } from "@/lib/meetings/types";

export function DealRowActions({
  dealId,
  homeAddress,
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
    <div className="flex flex-wrap gap-1" data-ff-card-actions={PIPELINE_CARD_ACTIONS.join(",")} data-testid="deal-comms">
      <Link
        href={`/deals/${dealId}/compare`}
        className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15"
      >
        Send quote
      </Link>
      {users.length > 0 ? (
        <ChangeOwnerDialog dealId={dealId} ownerId={ownerId} users={users} />
      ) : null}
      <MeetingButton dealId={dealId} homeAddress={homeAddress} />
    </div>
  );
}
