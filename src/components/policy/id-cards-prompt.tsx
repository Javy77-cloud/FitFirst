"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissIdCardsPrompt } from "@/app/actions/policy-mint";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChooseFileButton } from "@/components/choose-file-button";
import { uploadDealSlot } from "@/app/actions/lifecycle";
import { flashAction } from "@/lib/flash-client";

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
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function dismissForever() {
    const data = new FormData();
    data.set("policyId", policyId);
    startTransition(async () => {
      await dismissIdCardsPrompt(data);
      setOpen(false);
      flashAction("changes-saved");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismissForever(); }}>
      <DialogContent className="sm:max-w-md" data-ff-id-cards-prompt="">
        <DialogHeader>
          <DialogTitle>Upload ID cards?</DialogTitle>
          <DialogDescription>
            Optional. Yes stores them in this policy’s document folder with the DEC. No dismisses this
            reminder forever.
          </DialogDescription>
        </DialogHeader>
        <form
          action={uploadDealSlot}
          className="space-y-2"
          onSubmit={() => {
            setOpen(false);
          }}
        >
          <input type="hidden" name="policyId" value={policyId} />
          <input type="hidden" name="dealId" value={dealId ?? ""} />
          <input type="hidden" name="slot" value="policy_file" />
          <input type="hidden" name="docType" value="policy_id" />
          <ChooseFileButton name="file" accept="application/pdf,.pdf,image/*" keepLabel className="h-8" />
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={dismissForever} data-ff-id-cards-no="">
              No
            </Button>
            <Button type="submit" size="sm" disabled={pending} data-ff-id-cards-yes="">
              Yes — upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
