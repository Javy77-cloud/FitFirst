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
  isMasterFillStepResult,
  masterFillBusyTitle,
  masterFillDoneSummary,
  masterFillStepsForLine,
  masterFillUnexpectedMessage,
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
    let currentLabel = MASTER_FILL_STEP_DEAL;
    try {
      for (const step of steps) {
        currentLabel = step.label;
        setStatus(step.label);
        let raw: unknown;
        try {
          raw = await fillMasterSheetStep({ dealId, line, step: step.id });
        } catch (error) {
          const message =
            error instanceof Error && error.message.trim()
              ? error.message
              : masterFillUnexpectedMessage(step.label);
          const failed: MasterFillStepResult = {
            step: step.id,
            filledCount: 0,
            skippedCount: 0,
            error: `${step.label} failed. ${message}`,
          };
          results.push(failed);
          setSummary(masterFillDoneSummary(results));
          setDone(true);
          flashAction(failed.error ?? message, "error");
          router.refresh();
          return;
        }
        if (!isMasterFillStepResult(raw)) {
          const failed: MasterFillStepResult = {
            step: step.id,
            filledCount: 0,
            skippedCount: 0,
            error: masterFillUnexpectedMessage(step.label),
          };
          results.push(failed);
          setSummary(masterFillDoneSummary(results));
          setDone(true);
          flashAction(failed.error ?? masterFillUnexpectedMessage(step.label), "error");
          router.refresh();
          return;
        }
        results.push(raw);
        if (raw.error) {
          setSummary(masterFillDoneSummary(results));
          setDone(true);
          flashAction(raw.error, "error");
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
      const message = error instanceof Error ? error.message : masterFillUnexpectedMessage(currentLabel);
      const partial = results.length ? ` ${masterFillDoneSummary(results)}` : "";
      setSummary(`${currentLabel} failed. ${message}.${partial}`);
      setDone(true);
      flashAction(`${currentLabel} failed. ${message}`, "error");
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
                  title={masterFillBusyTitle(status) || MASTER_FILL_BUSY_TITLE}
                  message={MASTER_FILL_BUSY_COPY}
                  data-ff-master-fill-busy=""
                  data-ff-master-fill-step={status}
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
