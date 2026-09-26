import {
  advancedStepNotice,
  deletedProductNotice,
  type AgentDealTab,
} from "@/lib/deals/deal-resume";

/** Shown when resume cannot open the last product, or the last step is already done. */
export function DealResumeNotice({
  missingProductKey,
  openedLabel,
  advancedTab,
}: {
  missingProductKey?: string | null;
  openedLabel?: string | null;
  advancedTab?: AgentDealTab | null;
}) {
  const productNote = missingProductKey
    ? deletedProductNotice(missingProductKey, openedLabel ?? "")
    : null;
  const stepNote = advancedTab ? advancedStepNotice(advancedTab) : null;
  if (!productNote && !stepNote) return null;
  return (
    <div
      role="status"
      data-ff-deal-resume-notice=""
      data-ff-deal-resume-fallback={missingProductKey || undefined}
      data-ff-deal-resume-advanced={advancedTab || undefined}
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      {productNote ? <p data-ff-deal-resume-product-note="">{productNote}</p> : null}
      {stepNote ? <p data-ff-deal-resume-step-note="">{stepNote}</p> : null}
    </div>
  );
}
