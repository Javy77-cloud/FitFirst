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
import { WaitHold } from "@/components/desk/wait-hold";
import { flashAction } from "@/lib/flash-client";
import { toastForFillCounts } from "@/lib/quote-sheet/fill-toast";
import {
  FILL_MASTER_SHEET_LABEL,
  MASTER_FILL_BUSY_COPY,
  MASTER_FILL_BUSY_TITLE,
  MASTER_FILL_REVIEW_NUDGE,
  MASTER_FILL_STEP_DEAL,
  masterFillDoneSummary,
  masterFillStepsForLine,
  type MasterFillStepResult,
} from "@/lib/quote-sheet/master-fill";
import type { ShopLine } from "@/lib/domain";

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
  const steps = masterFillStepsForLine(line);
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
      for (const step of steps) {
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
      const sources = [
        ...new Set(
          results
            .flatMap((step) => (step.note ?? "").split("·"))
            .map((part) => part.trim())
            .filter((part) => part === "NHTSA vPIC"),
        ),
      ];
      const toast = toastForFillCounts({ filledCount: filled, skippedCount: skipped, sources });
      // Stay on Documents after Fill — Markets only after Confirm & request quotes.
      flashAction(toast);
      router.replace(`/deals/${dealId}?tab=documents&line=${line}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Risk Profile fill failed";
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
        size="default"
        variant="default"
        className="h-10 min-w-[9.5rem] px-4 text-base font-semibold tracking-wide whitespace-nowrap shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        data-ff-fill-master-sheet=""
        data-ff-no-hover=""
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
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{line === "auto" ? "Deal → Docs → VIN (NHTSA). Empty cells only." : "Deal → Property → Docs. Empty cells only."}</p>
              {busy ? (
                <WaitHold
                  title={MASTER_FILL_BUSY_TITLE}
                  message={MASTER_FILL_BUSY_COPY}
                  data-ff-master-fill-busy=""
                />
              ) : null}
            </div>
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
