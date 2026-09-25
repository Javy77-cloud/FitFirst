"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  fillPolicyFromDec,
  previewFillPolicyFromDec,
} from "@/app/actions/policy-fill-from-dec";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FILL_DEC_CURRENT_NOTICE, fillOverwriteWarning } from "@/lib/policy/fill-from-dec";
import { flashAction } from "@/lib/flash-client";

export function FillPolicyFromDecButton({ policyId }: { policyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [phase, setPhase] = useState<"form" | "warn">("form");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    agentName: string;
    serverNow: string;
    overwriteCount: number;
    filename: string;
  } | null>(null);

  function close() {
    if (pending) return;
    setOpen(false);
  }

  function openModal() {
    setReason("");
    setPhase("form");
    setError(null);
    setPreview(null);
    setOpen(true);
    startTransition(async () => {
      const result = await previewFillPolicyFromDec(policyId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview({
        agentName: result.agentName,
        serverNow: result.serverNow,
        overwriteCount: result.overwriteCount,
        filename: result.filename,
      });
    });
  }

  function confirm() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Reason is required.");
      return;
    }
    if (phase === "form" && (preview?.overwriteCount ?? 0) > 0) {
      setPhase("warn");
      setError(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await fillPolicyFromDec({
        policyId,
        reason: trimmed,
        source: "manual",
        confirmOverwrite: phase === "warn" || (preview?.overwriteCount ?? 0) === 0,
      });
      if (!result.ok) {
        if (result.overwriteCount && result.overwriteCount > 0) {
          setPreview((current) =>
            current ? { ...current, overwriteCount: result.overwriteCount ?? current.overwriteCount } : current,
          );
          setPhase("warn");
          setError(null);
          return;
        }
        setError(result.error);
        flashAction(result.error, "error");
        return;
      }
      flashAction(FILL_DEC_CURRENT_NOTICE);
      setOpen(false);
      router.refresh();
    });
  }

  const overwriteCount = preview?.overwriteCount ?? 0;
  const warning = phase === "warn" ? fillOverwriteWarning(overwriteCount) : null;

  return (
    <div data-ff-fill-policy-from-dec="">
      <Button type="button" size="sm" onClick={openModal} data-ff-fill-policy-from-dec-open="">
        Fill from declaration page
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!pending}
          data-ff-fill-policy-from-dec-modal=""
        >
          <DialogHeader>
            <DialogTitle>Fill from declaration page</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!pending) confirm();
            }}
          >
            <div>
              <div className="text-helper text-muted-foreground">Agent</div>
              <div className="font-medium text-navy" data-ff-fill-policy-from-dec-agent="">
                {preview?.agentName ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-helper text-muted-foreground">Date / time</div>
              <div className="font-medium text-navy" data-ff-fill-policy-from-dec-time="">
                {preview?.serverNow ?? "—"}
              </div>
            </div>
            {preview?.filename ? (
              <div>
                <div className="text-helper text-muted-foreground">Declaration</div>
                <div className="font-medium text-navy">{preview.filename}</div>
              </div>
            ) : null}
            <label className="grid gap-1" htmlFor={`fill-dec-reason-${policyId}`}>
              <span className="text-helper text-muted-foreground">Reason</span>
              <Input
                id={`fill-dec-reason-${policyId}`}
                name="reason"
                value={reason}
                required
                disabled={pending || !preview}
                onChange={(event) => setReason(event.target.value)}
                data-ff-fill-policy-from-dec-reason=""
              />
            </label>
            {warning ? (
              <p className="text-sm font-medium text-navy" data-ff-fill-policy-from-dec-overwrite="">
                {warning}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-fit-red" data-ff-fill-policy-from-dec-error="">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={close}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending || !preview}
                data-ff-fill-policy-from-dec-confirm=""
              >
                {pending ? "Working" : phase === "warn" ? "Confirm" : "Fill from declaration page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
