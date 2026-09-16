import Link from "next/link";
import { RereadDeclarationButton } from "@/components/policy/reread-declaration-button";

export function FromDealStrip({
  dealId,
  dealTitle,
  decFilename,
  reconciled,
  policyId,
  canReread,
}: {
  dealId?: string | null;
  dealTitle?: string | null;
  decFilename?: string | null;
  reconciled?: boolean;
  policyId?: string | null;
  canReread?: boolean;
}) {
  if (!dealId) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-navy/10 bg-[var(--ff-paper,#f7f3ec)] px-3 py-2 text-[12px] text-navy"
      data-ff-from-deal-strip=""
    >
      <span className="font-semibold">From deal</span>
      <Link href={`/deals/${dealId}?tab=quotes`} className="underline-offset-2 hover:underline">
        {dealTitle || "Open deal"}
      </Link>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <span data-ff-dec-reconciled={reconciled ? "1" : "0"}>
        {reconciled ? "Dec reconciled" : "Dec attached"}
      </span>
      {decFilename ? (
        <span className="truncate text-muted-foreground">{decFilename}</span>
      ) : null}
      {canReread && policyId ? <RereadDeclarationButton policyId={policyId} /> : null}
    </div>
  );
}
