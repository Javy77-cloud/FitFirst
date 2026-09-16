"use client";

import { setDealProductInspection } from "@/app/actions/product-stage";
import {
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUSES,
  canonicalizeProductStage,
  type InspectionStatus,
} from "@/lib/deals/product-stages";

export function QuotesStageFlags({
  dealId,
  product,
  stage,
  inspectionStatus = "none",
}: {
  dealId: string;
  product?: string | null;
  stage?: string | null;
  inspectionStatus?: InspectionStatus | null;
}) {
  const canonical = canonicalizeProductStage(stage);
  return (
    <div
      className="flex w-fit flex-wrap items-center gap-3 rounded-md border border-border/70 px-2 py-1.5"
      data-ff-quotes-stage-flags=""
    >
      <form action={setDealProductInspection} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="product" value={product ?? "homeowners"} />
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Inspection
          <select
            name="inspectionStatus"
            defaultValue={inspectionStatus ?? "none"}
            className="ml-2 h-7 rounded-md border border-border bg-background px-2 text-xs font-medium normal-case tracking-normal text-navy"
            data-ff-inspection-status=""
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            {INSPECTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {INSPECTION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </form>
      {canonical === "policy_issued" ? (
        <p className="text-[11px] text-muted-foreground" data-ff-policy-escrow-stub="">
          Mortgage / escrow is not a pipeline stage. Track it on the issued policy.
        </p>
      ) : null}
    </div>
  );
}
