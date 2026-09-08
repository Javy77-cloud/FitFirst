"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fillMasterSheetStep } from "@/app/actions/quote-sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { flashAction } from "@/lib/flash-client";
import { toastForFillCounts } from "@/lib/quote-sheet/fill-toast";
import {
  FILL_MASTER_SHEET_LABEL,
  MASTER_FILL_REVIEW_NUDGE,
  MASTER_FILL_STEP_DEAL,
  MASTER_FILL_STEP_DOCS,
  MASTER_FILL_STEP_PROPERTY,
  masterFillDoneSummary,
  type MasterFillStepResult,
} from "@/lib/quote-sheet/master-fill";
import type { ShopLine } from "@/lib/domain";

const STEPS = [
  { id: "deal" as const, label: MASTER_FILL_STEP_DEAL },
  { id: "property" as const, label: MASTER_FILL_STEP_PROPERTY },
  { id: "docs" as const, label: MASTER_FILL_STEP_DOCS },
];

export function MasterSheetFillButton({
  dealId,
  line,
}: {
  dealId: string;
  line: ShopLine;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(MASTER_FILL_STEP_DEAL);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState("");

  async function runFill() {
    setOpen(true);
    setBusy(true);
    setDone(false);
    setSummary("");
    const results: MasterFillStepResult[] = [];
    try {
      for (const step of STEPS) {
        setStatus(step.label);
        const result = await fillMasterSheetStep({ dealId, line, step: step.id });
        results.push(result);
        if (result.error) {
          setSummary(masterFillDoneSummary(results));
          setDone(true);
          setBusy(false);
          flashAction(result.error, "error");
          router.refresh();
          return;
        }
      }
      const text = masterFillDoneSummary(results);
      setSummary(text);
      setDone(true);
      const filled = results.reduce((sum, step) => sum + step.filledCount, 0);
      const skipped = results.reduce((sum, step) => sum + step.skippedCount, 0);
      flashAction(toastForFillCounts({ filledCount: filled, skippedCount: skipped }));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Master sheet fill failed";
      setSummary(message);
      setDone(true);
      flashAction(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
            <Button
        type="button"
        size="sm"
        variant="default"
        className="h-9 px-3.5 text-sm font-semibold bg-fit-green-bg text-fit-green hover:bg-fit-green-bg/80 border-fit-green/40 shadow-sm"
        data-ff-fill-master-sheet=""
        disabled={busy}
        onClick={() => void runFill()}
      >
        {FILL_MASTER_SHEET_LABEL}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="sm:max-w-sm" showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>{FILL_MASTER_SHEET_LABEL}</DialogTitle>
            <DialogDescription data-ff-master-fill-status="">
              {done ? summary : status}
            </DialogDescription>
          </DialogHeader>
          {done ? (
            <p className="text-xs text-muted-foreground" data-ff-master-fill-review="">
              {MASTER_FILL_REVIEW_NUDGE}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Deal → Property → Docs. Empty cells only.</p>
          )}
          {done ? (
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
