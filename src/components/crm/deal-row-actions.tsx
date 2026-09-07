import Link from "next/link";
import { ChangeOwnerDialog } from "@/components/deals/change-owner-dialog";
import type { DeskUserOption } from "@/lib/deals/transfer";

export function DealRowActions({
  dealId,
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
    <div className="flex flex-wrap gap-1" data-testid="deal-comms">
      <Link
        href={`/deals/${dealId}/compare`}
        className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15"
      >
        Send quote
      </Link>
      {users.length > 0 ? (
        <ChangeOwnerDialog dealId={dealId} ownerId={ownerId} users={users} />
      ) : null}
      <Link
        href={`/deals/${dealId}#bind`}
        className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-navy hover:bg-secondary"
      >
        Bind policy
      </Link>
    </div>
  );
}
