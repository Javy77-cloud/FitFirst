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
  MASTER_FILL_STEP_TIMEOUT_MS,
  isMasterFillStepResult,
  masterFillBusyTitle,
  masterFillCaughtMessage,
  masterFillDoneSummary,
  masterFillStepTimeoutMessage,
  masterFillStepsForLine,
  masterFillUnexpectedMessage,
  type MasterFillStepResult,
} from "@/lib/quote-sheet/master-fill";
import type { ShopLine } from "@/lib/domain";
import { isNhtsaTransportFailure } from "@/lib/vin-decode/client";
import { recoverVinDecodeFromBrowser } from "@/lib/vin-decode/browser";

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
          raw = await Promise.race([
            fillMasterSheetStep({ dealId, line, step: step.id }),
            new Promise<never>((_resolve, reject) => {
              setTimeout(
                () => reject(new Error(masterFillStepTimeoutMessage(step.label))),
                MASTER_FILL_STEP_TIMEOUT_MS,
              );
            }),
          ]);
        } catch (error) {
          const raw = error instanceof Error ? error.message : "";
          const message = masterFillCaughtMessage(step.label, error);
          if (
            step.id === "vin" &&
            line === "auto" &&
            (isNhtsaTransportFailure(raw) ||
              isNhtsaTransportFailure(message) ||
              /unexpected|failed to fetch|network/i.test(raw))
          ) {
            const recovered = await recoverVinDecodeFromBrowser({ dealId, line });
            if (recovered.ok) {
              results.push({
                step: "vin",
                filledCount: recovered.filledCount,
                skippedCount: 0,
                note: "NHTSA vPIC",
              });
              continue;
            }
            const failed: MasterFillStepResult = {
              step: step.id,
              filledCount: 0,
              skippedCount: 0,
              error: recovered.error,
            };
            results.push(failed);
            setSummary(masterFillDoneSummary(results));
            setDone(true);
            flashAction(recovered.error, "error");
            router.refresh();
            return;
          }
          const failed: MasterFillStepResult = {
            step: step.id,
            filledCount: 0,
            skippedCount: 0,
            error: message,
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
        let stepResult: MasterFillStepResult = raw;
        if (stepResult.error && step.id === "vin" && line === "auto" && isNhtsaTransportFailure(stepResult.error)) {
          const recovered = await recoverVinDecodeFromBrowser({ dealId, line });
          if (recovered.ok) {
            results.push({
              step: "vin",
              filledCount: recovered.filledCount,
              skippedCount: stepResult.skippedCount,
              note: "NHTSA vPIC",
            });
            continue;
          }
          stepResult = { ...stepResult, error: recovered.error };
        }
        results.push(stepResult);
        if (stepResult.error) {
          setSummary(masterFillDoneSummary(results));
          setDone(true);
          flashAction(stepResult.error, "error");
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
      const message = masterFillCaughtMessage(currentLabel, error);
      const partial = results.length ? ` ${masterFillDoneSummary(results)}` : "";
      setSummary(`${message}.${partial}`);
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
