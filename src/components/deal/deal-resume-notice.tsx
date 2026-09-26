import { deletedProductNotice } from "@/lib/deals/deal-resume";

/** Shown when the last-worked form is no longer on the deal. */
export function DealResumeNotice({
  missingProductKey,
  openedLabel,
}: {
  missingProductKey?: string | null;
  openedLabel?: string | null;
}) {
  if (!missingProductKey) return null;
  return (
    <div
      role="status"
      data-ff-deal-resume-notice=""
      data-ff-deal-resume-fallback={missingProductKey}
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      <p data-ff-deal-resume-product-note="">{deletedProductNotice(missingProductKey, openedLabel ?? "")}</p>
    </div>
  );
}
