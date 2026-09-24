"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { holdDeal, restoreDealFromHold } from "@/app/actions/deal-on-hold";
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
import { ON_HOLD_LABEL } from "@/lib/deals/on-hold";
import { flashAction } from "@/lib/flash-client";

export function DealOnHoldControl({
  dealId,
  onHold,
  dealTitle,
  buttonVariant = "button",
  trigger = true,
  open: openProp,
  onOpenChange,
}: {
  dealId: string;
  onHold: boolean;
  dealTitle?: string;
  buttonVariant?: "button" | "link";
  /** When false, only the hold dialog is rendered (for Pipeline Actions menu). */
  trigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? Boolean(openProp) : internalOpen;
  const setOpen = (next: boolean) => {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  if (onHold && trigger) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        data-ff-deal-restore-hold=""
        className="h-7 border-sky-700/35 bg-sky-50 px-2 text-[11px] font-semibold text-sky-950 hover:bg-sky-100"
        onClick={() => {
          start(async () => {
            const result = await restoreDealFromHold({ dealId });
            if (!result.ok) {
              flashAction(result.error ?? "Could not restore", "error");
              return;
            }
            flashAction(`Restored — back in the active stack`);
            router.refresh();
          });
        }}
      >
        Restore
      </Button>
    );
  }

  if (onHold && !trigger) {
    return null;
  }

  return (
    <>
      {trigger ? (
        buttonVariant === "link" ? (
          <button
            type="button"
            data-ff-deal-hold=""
            className="text-[11px] font-medium text-navy underline-offset-2 hover:underline"
            onClick={() => setOpen(true)}
          >
            Hold
          </button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-ff-deal-hold=""
            className="h-7 px-2 text-[11px] font-semibold"
            onClick={() => setOpen(true)}
          >
            Hold
          </Button>
        )
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setNote("");
        }}
      >
        <DialogContent data-ff-deal-hold-dialog="" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ON_HOLD_LABEL}</DialogTitle>
            <DialogDescription>
              Parks {dealTitle ? <span className="font-medium text-foreground">{dealTitle}</span> : "this deal"}{" "}
              out of Stack / Radar / List priority. Stage and product stay as they are — Restore brings it
              back.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ff-on-hold-note" className="text-xs">
              Note (optional)
            </Label>
            <Textarea
              id="ff-on-hold-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Soft deal — check back after Marioja decides"
              rows={3}
              data-ff-deal-hold-note=""
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              data-ff-deal-hold-confirm=""
              onClick={() => {
                start(async () => {
                  const result = await holdDeal({ dealId, note });
                  if (!result.ok) {
                    flashAction(result.error ?? "Could not hold", "error");
                    return;
                  }
                  flashAction(`${ON_HOLD_LABEL} — parked out of the active stack`);
                  setOpen(false);
                  setNote("");
                  // Holding a deal removes it from the active list; leave the detail screen too.
                  router.push("/deals");
                });
              }}
            >
              Hold deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
