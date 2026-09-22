"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissIdCardsPrompt } from "@/app/actions/policy-mint";
import { IdCardsUploadPanel } from "@/components/policy/id-cards-upload-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { flashAction } from "@/lib/flash-client";

type Step = "ask" | "upload";

/** One-time optional ID cards prompt after Policy looks good. Never mandatory. */
export function IdCardsPrompt({
  policyId,
  dealId,
  open: initiallyOpen,
}: {
  policyId: string;
  dealId?: string | null;
  open: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [step, setStep] = useState<Step>("ask");
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function dismissForever(after?: () => void) {
    const data = new FormData();
    data.set("policyId", policyId);
    startTransition(async () => {
      await dismissIdCardsPrompt(data);
      setOpen(false);
      after?.();
      flashAction("changes-saved");
      router.refresh();
    });
  }

  function onOpenChange(next: boolean) {
    if (next) return;
    // Closing ask or upload step dismisses forever (ask only once).
    dismissForever();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-ff-id-cards-prompt="" data-ff-id-cards-step={step}>
        {step === "ask" ? (
          <>
            <DialogHeader>
              <DialogTitle>Upload ID cards?</DialogTitle>
              <DialogDescription>
                Optional. Yes opens the upload form. No dismisses this reminder forever — you can still
                upload anytime from Policy documents.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => dismissForever()}
                data-ff-id-cards-no=""
              >
                No
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => setStep("upload")}
                data-ff-id-cards-yes=""
              >
                Yes
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Upload ID cards</DialogTitle>
              <DialogDescription>
                Choose file(s), rename if needed, then Upload. Cancel dismisses this reminder forever.
              </DialogDescription>
            </DialogHeader>
            <IdCardsUploadPanel
              policyId={policyId}
              dealId={dealId}
              dismissOnSuccess
              onSuccess={() => setOpen(false)}
              onCancel={() => dismissForever()}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
