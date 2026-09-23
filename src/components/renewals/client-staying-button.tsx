"use client";

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
  RENEWAL_HANDLED_LABEL,
  RENEWAL_HANDLED_SUCCESS_BODY,
  RENEWAL_HANDLED_SUCCESS_CONGRATS,
  RENEWAL_HANDLED_SUCCESS_DONE,
  RENEWAL_HANDLED_SUCCESS_TITLE,
} from "@/lib/renewal/handled";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

export function ClientStayingButton({
  policyId,
  className,
  size = "xs",
  variant = "outline",
}: {
  policyId: string;
  className?: string;
  size?: "xs" | "sm" | "default";
  variant?: "outline" | "ghost" | "secondary";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [successOpen, setSuccessOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn("ff-client-staying-btn", className)}
        data-ff-client-staying=""
        disabled={pending}
        title="Client staying — clears chase and moves to Handled (policy stays live)"
        aria-label="Client staying — marks renewal handled"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          start(async () => {
            const fd = new FormData();
            fd.set("policyId", policyId);
            try {
              await markClientStaying(fd);
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
        }}
      >
        {pending ? "Saving…" : RENEWAL_HANDLED_LABEL}
      </Button>

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
