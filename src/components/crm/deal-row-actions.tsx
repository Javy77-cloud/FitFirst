import Link from "next/link";
import { requestBindSignature } from "@/app/actions/in-desk-esign";
import { ChangeOwnerDialog } from "@/components/deals/change-owner-dialog";
import { isAnaDeal } from "@/lib/crm/bind-path";
import type { DeskUserOption } from "@/lib/deals/transfer";

export function DealRowActions({
  dealId,
  ownerId,
  users = [],
  boundAt,
  policyId,
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
  boundAt?: Date | string | null;
  policyId?: string | null;
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
      {isAnaDeal(dealId) ? (
        <span
          className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
          title="Ana Dib stays unbound. Coverage A $321,000."
        >
          Bind policy
        </span>
      ) : boundAt || policyId ? (
        <Link
          href={policyId ? `/policies/${policyId}` : `/deals/${dealId}#bind`}
          className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-navy hover:bg-secondary"
        >
          Bind policy
        </Link>
      ) : (
        <form action={requestBindSignature} className="inline">
          <input type="hidden" name="dealId" value={dealId} />
          <button
            type="submit"
            className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-navy hover:bg-secondary"
            title="Requests client signature. On sign, the deal advances to Bound and a policy number attaches."
          >
            Bind policy
          </button>
        </form>
      )}
    </div>
  );
}
