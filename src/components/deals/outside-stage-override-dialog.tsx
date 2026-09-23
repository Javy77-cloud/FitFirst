"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { overrideDealProductStageOutside } from "@/app/actions/product-stage";
import { ClosedDealArchivePopup } from "@/components/deals/closed-deal-archive-popup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isClosedOutcomeStage } from "@/lib/deals/archive-reminder";
import {
  OUTSIDE_FORCE_OUTCOMES,
  outsideForceOutcomeLabel,
  type OutsideForceOutcome,
} from "@/lib/deals/outside-stage-override";
import {
  PRODUCT_LOST_REASON_LABELS,
  PRODUCT_LOST_REASONS,
  type ProductLostReason,
} from "@/lib/deals/product-stages";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

/** Stage control — unlock Policy issued when quoted off FitFirst, or Closed lost when they went elsewhere. */
export function OutsideStageOverrideDialog({
  dealId,
  product,
  pipelineSlug,
  dealTitle,
  currentStage,
  open: openProp,
  onOpenChange,
  trigger = true,
  buttonVariant = "link",
}: {
  dealId: string;
  product: string;
  pipelineSlug: string;
  dealTitle?: string;
  currentStage?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
  buttonVariant?: "link" | "button";
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? Boolean(openProp) : internalOpen;
  const setOpen = (next: boolean) => {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [pending, start] = useTransition();
  const [stage, setStage] = useState<OutsideForceOutcome>("policy_issued");
  const [reason, setReason] = useState("");
  const [lostReason, setLostReason] = useState<ProductLostReason | "">("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const isLost = stage === "closed_lost";
  const canConfirm = isLost
    ? Boolean(lostReason)
    : Boolean(reason.trim());

  useEffect(() => {
    if (!open) return;
    setStage("policy_issued");
    setReason("");
    setLostReason("");
  }, [open, currentStage]);

  return (
    <>
      {trigger ? (
        buttonVariant === "button" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-ff-outside-stage-override=""
            data-ff-outside-stage-override-btn=""
            className="h-7 border-amber-700/35 bg-amber-50 px-2 text-[11px] font-semibold text-amber-950 hover:bg-amber-100"
            onClick={() => setOpen(true)}
          >
            Override
          </Button>
        ) : (
          <button
            type="button"
            data-ff-outside-stage-override=""
            className="text-[11px] font-medium text-navy underline-offset-2 hover:underline"
            onClick={() => setOpen(true)}
          >
            Quoted outside FitFirst
          </button>
        )
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          data-ff-outside-stage-override-dialog=""
        >
          <DialogHeader>
            <DialogTitle>Override stage</DialogTitle>
            <DialogDescription>
              Unlock Policy issued when quoting happened on a carrier portal or legacy system
              (no fake quote rows — upload the Issued declaration to mint). Or mark Closed lost
              when they went elsewhere — Captain reason required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Force stage to</Label>
              <div
                className="grid gap-1.5"
                role="listbox"
                aria-label="Override stage"
                data-ff-outside-stage-options=""
              >
                {OUTSIDE_FORCE_OUTCOMES.map((slug) => (
                  <button
                    key={slug}
                    type="button"
                    role="option"
                    aria-selected={stage === slug}
                    data-ff-outside-stage-option={slug}
                    onClick={() => setStage(slug)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-left text-sm",
                      stage === slug
                        ? "border-navy bg-navy/5 text-navy"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {outsideForceOutcomeLabel(slug)}
                  </button>
                ))}
              </div>
            </div>

            {isLost ? (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Why lost <span className="text-fit-flag">(required)</span>
                </Label>
                <div
                  className="grid gap-1.5"
                  role="listbox"
                  aria-label="Lost reason"
                  data-ff-outside-lost-reasons=""
                >
                  {PRODUCT_LOST_REASONS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={lostReason === key}
                      data-ff-outside-lost-reason={key}
                      onClick={() => setLostReason(key)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-left text-sm",
                        lostReason === key
                          ? "border-navy bg-navy/5 text-navy"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      )}
                    >
                      {PRODUCT_LOST_REASON_LABELS[key]}
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={2}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Optional note (e.g. Bound with competitor on Progressive)"
                  data-ff-outside-stage-reason=""
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="ff-outside-reason" className="text-xs">
                  Notes why <span className="text-fit-flag">(required)</span>
                </Label>
                <Textarea
                  id="ff-outside-reason"
                  rows={3}
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Quoted & bound in Progressive portal offline — Diaflavia legacy GL"
                  data-ff-outside-stage-reason=""
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !canConfirm}
              data-ff-outside-stage-confirm=""
              onClick={() => {
                start(async () => {
                  const result = await overrideDealProductStageOutside({
                    dealId,
                    product,
                    stageSlug: stage,
                    pipelineSlug,
                    reason: isLost
                      ? reason.trim() ||
                        (lostReason ? PRODUCT_LOST_REASON_LABELS[lostReason] : "")
                      : reason,
                    lostReason: isLost ? lostReason || null : null,
                  });
                  if (!result.ok) {
                    flashAction(result.error ?? "Could not apply override", "error");
                    return;
                  }
                  flashAction(
                    isLost
                      ? "Product marked lost"
                      : `Marked ${result.label} outside FitFirst`,
                  );
                  setOpen(false);
                  if (isClosedOutcomeStage(stage)) setArchiveOpen(true);
                  router.refresh();
                });
              }}
            >
              {isLost ? "Mark lost" : "Confirm override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClosedDealArchivePopup
        dealId={dealId}
        dealTitle={dealTitle}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </>
  );
}
