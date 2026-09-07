import { confirmQuotePull, flagQuotePullForAdmin } from "@/app/actions/deal-desk";
import { Button } from "@/components/ui/button";
import type { QuoteConfirmKind } from "@/lib/deals/quote-confirm";

export function QuoteConfirmRow({
  dealId,
  quoteId,
  carrierId,
  carrierName,
  formId,
  kind,
}: {
  dealId: string;
  quoteId: string;
  carrierId: string;
  carrierName: string;
  formId: string;
  kind: QuoteConfirmKind;
}) {
  if (kind === "skip") return null;

  if (kind === "admin") {
    return (
      <form action={flagQuotePullForAdmin} className="mt-1 flex flex-wrap items-center gap-2">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="carrierId" value={carrierId} />
        <input type="hidden" name="carrierName" value={carrierName} />
        <input type="hidden" name="formId" value={formId} />
        <input type="hidden" name="reason" value="Low-confidence or denied pull" />
        <p className="text-[11px] text-fit-flag">Needs an admin correction rule.</p>
        <Button type="submit" size="xs" variant="outline">
          Send to admin
        </Button>
      </form>
    );
  }

  return (
    <form action={confirmQuotePull} className="mt-1 flex flex-wrap items-center gap-2">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="carrierId" value={carrierId} />
      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="kind" value={kind} />
      <p className="text-[11px] text-fit-yellow">
        {kind === "first"
          ? "First pull from this carrier / form — confirm the numbers."
          : "Sample check (about 1 in 5). Confirm this pull."}
      </p>
      <Button type="submit" size="xs">
        Confirm pull
      </Button>
    </form>
  );
}
