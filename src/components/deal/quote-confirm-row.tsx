import { confirmQuotePull } from "@/app/actions/deal-desk";
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
  // skip + admin: no UI (admin correction / Send to admin removed per Javy 2026-09-09)
  if (kind === "skip" || kind === "admin") return null;

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
