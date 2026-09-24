"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { restoreDealFromHold } from "@/app/actions/deal-on-hold";
import { DealOnHoldControl } from "@/components/deals/deal-on-hold-control";
import { OutsideStageOverrideDialog } from "@/components/deals/outside-stage-override-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { flashAction } from "@/lib/flash-client";

/**
 * Single Pipeline chrome control: Hold/Restore + Bypass pipeline (outside-FF Override).
 * Replaces the separate Hold and Override buttons.
 */
export function DealPipelineActions({
  dealId,
  product,
  pipelineSlug,
  dealTitle,
  currentStage,
  onHold,
  outsideOverride = false,
}: {
  dealId: string;
  product: string;
  pipelineSlug: string;
  dealTitle?: string;
  currentStage?: string | null;
  onHold: boolean;
  outsideOverride?: boolean;
}) {
  const router = useRouter();
  const [holdOpen, setHoldOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="inline-flex items-center gap-1.5" data-ff-pipeline-actions="">
      {outsideOverride ? (
        <span
          className="rounded-full border border-amber-700/30 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-950"
          data-ff-outside-stage-active=""
        >
          Outside FitFirst
        </span>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-ff-pipeline-actions-trigger=""
              className="h-7 gap-1 px-2 text-[11px] font-semibold"
              disabled={pending}
            />
          }
        >
          Actions
          <ChevronDown className="size-3 opacity-80" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44" data-ff-pipeline-actions-menu="">
          {onHold ? (
            <DropdownMenuItem
              data-ff-pipeline-action-restore=""
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const result = await restoreDealFromHold({ dealId });
                  if (!result.ok) {
                    flashAction(result.error ?? "Could not restore", "error");
                    return;
                  }
                  flashAction("Restored — back in the active stack");
                  router.refresh();
                });
              }}
            >
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              data-ff-pipeline-action-hold=""
              onClick={() => setHoldOpen(true)}
            >
              Place on hold
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            data-ff-pipeline-action-bypass=""
            onClick={() => setOverrideOpen(true)}
          >
            Bypass pipeline
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DealOnHoldControl
        dealId={dealId}
        onHold={false}
        dealTitle={dealTitle}
        trigger={false}
        open={holdOpen}
        onOpenChange={setHoldOpen}
      />
      <OutsideStageOverrideDialog
        dealId={dealId}
        product={product}
        pipelineSlug={pipelineSlug}
        dealTitle={dealTitle}
        currentStage={currentStage}
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        trigger={false}
      />
    </div>
  );
}
