"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  fillPolicyFromDec,
  peekFillPolicyFromDec,
  previewFillPolicyFromDec,
} from "@/app/actions/policy-fill-from-dec";
import { ProcessingLabel, WaitHold } from "@/components/desk/wait-hold";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FILL_DEC_CURRENT_NOTICE, fillDecCaughtError } from "@/lib/policy/fill-from-dec";
import { flashAction } from "@/lib/flash-client";

type FillMeta = {
  agentName: string;
  serverNow: string;
  filename: string;
};

export function FillPolicyFromDecButton({ policyId }: { policyId: string }) {
  const router = useRouter();
  const requestId = useRef(0);
  const [open, setOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [phase, setPhase] = useState<"form" | "warn">("form");
  const [error, setError] = useState<string | null>(null);
  const [peek, setPeek] = useState<FillMeta | null>(null);
  const [preview, setPreview] = useState<(FillMeta & { overwriteCount: number }) | null>(null);

  function close() {
    if (pending) return;
    requestId.current += 1;
    setCollecting(false);
    setOpen(false);
  }

  function openModal() {
    const request = ++requestId.current;
    setReason("");
    setPhase("form");
    setError(null);
    setPreview(null);
    setPeek(null);
    setCollecting(true);
    setOpen(true);
    const peekPromise = peekFillPolicyFromDec(policyId);
    const previewPromise = previewFillPolicyFromDec(policyId);
    let previewDone = false;
    void (async () => {
      try {
        const peeked = await peekPromise;
        if (requestId.current !== request || previewDone) return;
        if (!peeked.ok) {
          setError(peeked.error);
          setCollecting(false);
          return;
        }
        setPeek({
          agentName: peeked.agentName,
          serverNow: peeked.serverNow,
          filename: peeked.filename,
        });
      } catch (caught) {
        if (requestId.current !== request || previewDone) return;
        setError(fillDecCaughtError(caught));
        setCollecting(false);
      }
    })();
    void (async () => {
      try {
        const result = await previewPromise;
        previewDone = true;
        if (requestId.current !== request) return;
        if (!result.ok) {
          setError(result.error);
          setCollecting(false);
          return;
        }
        setPreview({
          agentName: result.agentName,
          serverNow: result.serverNow,
          overwriteCount: result.overwriteCount,
          filename: result.filename,
        });
        setError(null);
        setCollecting(false);
      } catch (caught) {
        previewDone = true;
        if (requestId.current !== request) return;
        setError(fillDecCaughtError(caught));
        setCollecting(false);
      }
    })();
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
      let result: Awaited<ReturnType<typeof fillPolicyFromDec>>;
      try {
        result = await fillPolicyFromDec({
          policyId,
          reason: trimmed,
          source: "manual",
          confirmOverwrite: phase === "warn" || (preview?.overwriteCount ?? 0) === 0,
        });
      } catch (caught) {
        const message = fillDecCaughtError(caught);
        setError(message);
        flashAction(message, "error");
        return;
      }
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

  const meta = preview ?? peek;
  const showWorking = pending || collecting;
  const showForm = !pending && (meta != null || !collecting);

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
          aria-busy={showWorking}
        >
          <DialogHeader>
            <DialogTitle>Fill from declaration page</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!pending && !collecting) confirm();
            }}
          >
            {showWorking ? (
              <WaitHold title="Working" data-ff-fill-policy-from-dec-working="" />
            ) : null}
            {showForm ? (
              <>
                <div>
                  <div className="text-helper text-muted-foreground">Agent</div>
                  <div className="font-medium text-navy" data-ff-fill-policy-from-dec-agent="">
                    {meta?.agentName ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-helper text-muted-foreground">Date / time</div>
                  <div className="font-medium text-navy" data-ff-fill-policy-from-dec-time="">
                    {meta?.serverNow ?? "—"}
                  </div>
                </div>
                {meta?.filename ? (
                  <div>
                    <div className="text-helper text-muted-foreground">Declaration</div>
                    <div className="font-medium text-navy">{meta.filename}</div>
                  </div>
                ) : null}
                {!collecting ? (
                  <label className="grid gap-1" htmlFor={`fill-dec-reason-${policyId}`}>
                    <span className="text-helper text-muted-foreground">Reason</span>
                    <Input
                      id={`fill-dec-reason-${policyId}`}
                      name="reason"
                      value={reason}
                      required
                      disabled={!preview}
                      onChange={(event) => setReason(event.target.value)}
                      data-ff-fill-policy-from-dec-reason=""
                    />
                  </label>
                ) : null}
                {error ? (
                  <p className="text-sm text-fit-red" data-ff-fill-policy-from-dec-error="">
                    {error}
                  </p>
                ) : null}
              </>
            ) : null}
            <DialogFooter>
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={close}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={pending || collecting || !preview}
                data-ff-fill-policy-from-dec-confirm=""
              >
                {showWorking ? (
                  <ProcessingLabel>Working</ProcessingLabel>
                ) : phase === "warn" ? (
                  "Confirm"
                ) : (
                  "Fill from declaration page"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
