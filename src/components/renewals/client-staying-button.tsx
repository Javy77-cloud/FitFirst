"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markClientStaying } from "@/app/actions/renewals-board";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CLIENT_STAYING_EARLY_CANCEL,
  CLIENT_STAYING_EARLY_CONFIRM,
  RENEWAL_HANDLED_LABEL,
  RENEWAL_HANDLED_SUCCESS_BODY,
  RENEWAL_HANDLED_SUCCESS_CONGRATS,
  RENEWAL_HANDLED_SUCCESS_DONE,
  RENEWAL_HANDLED_SUCCESS_TITLE,
  isClientStayingEarlyResult,
  planClientStayingClick,
} from "@/lib/renewal/handled";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

export function ClientStayingButton({
  policyId,
  renewalDate,
  className,
  size = "xs",
  variant = "outline",
}: {
  policyId: string;
  /** Policy renewalDate. Missing, or already past, stays disabled. */
  renewalDate?: Date | string | null;
  className?: string;
  size?: "xs" | "sm" | "default";
  variant?: "outline" | "ghost" | "secondary";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [successOpen, setSuccessOpen] = useState(false);
  const [earlyOpen, setEarlyOpen] = useState(false);
  const [earlyMessage, setEarlyMessage] = useState<string | null>(null);

  const plan = planClientStayingClick(renewalDate);

  function save(confirmEarly: boolean) {
    start(async () => {
      const fd = new FormData();
      fd.set("policyId", policyId);
      if (confirmEarly) fd.set("confirmEarlyClientStaying", "true");
      try {
        const result = await markClientStaying(fd);
        if (isClientStayingEarlyResult(result)) {
          setEarlyMessage(result.message);
          setEarlyOpen(true);
          return;
        }
        setEarlyOpen(false);
        flashAction("client-staying");
        setSuccessOpen(true);
        router.refresh();
      } catch (err) {
        flashAction(
          err instanceof Error ? err.message : "Could not mark Client staying",
          "error",
        );
      }
    });
  }

  if (plan.kind === "blocked") {
    return (
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn("ff-client-staying-btn", className)}
        data-ff-client-staying=""
        data-ff-client-staying-blocked=""
        disabled
        title={plan.reason}
        aria-label={plan.reason}
      >
        {RENEWAL_HANDLED_LABEL}
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn("ff-client-staying-btn", className)}
        data-ff-client-staying=""
        data-ff-client-staying-early={plan.kind === "confirm" ? "" : undefined}
        disabled={pending}
        title="Client staying — clears chase and moves to Handled (policy stays live)"
        aria-label="Client staying — marks renewal handled"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (plan.kind === "confirm") {
            setEarlyMessage(plan.message);
            setEarlyOpen(true);
            return;
          }
          save(false);
        }}
      >
        {pending ? <ProcessingLabel>Saving…</ProcessingLabel> : RENEWAL_HANDLED_LABEL}
      </Button>

      <Dialog open={earlyOpen} onOpenChange={setEarlyOpen}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          data-ff-client-staying-early-dialog=""
          data-testid="client-staying-early"
        >
          <DialogHeader>
            <DialogTitle>{RENEWAL_HANDLED_SUCCESS_TITLE}</DialogTitle>
            <DialogDescription className="sr-only">
              Confirm marking Client staying before the last 90 days.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-navy" data-ff-client-staying-early-copy="">
            {earlyMessage}
          </p>
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setEarlyOpen(false)}
              data-ff-client-staying-early-cancel=""
            >
              {CLIENT_STAYING_EARLY_CANCEL}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => save(true)}
              data-ff-client-staying-early-confirm=""
            >
              {pending ? <ProcessingLabel>Saving…</ProcessingLabel> : CLIENT_STAYING_EARLY_CONFIRM}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          data-ff-client-staying-success=""
          data-testid="client-staying-success"
        >
          <DialogHeader>
            <DialogTitle>{RENEWAL_HANDLED_SUCCESS_TITLE}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-emerald-900">
              {RENEWAL_HANDLED_SUCCESS_CONGRATS}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-navy">{RENEWAL_HANDLED_SUCCESS_BODY}</p>
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => setSuccessOpen(false)}
              data-ff-client-staying-done=""
            >
              {RENEWAL_HANDLED_SUCCESS_DONE}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
