"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issuePolicyFromDeclaration } from "@/app/actions/policy-mint";
import { notNowCreatePolicy } from "@/app/actions/declaration";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreatePolicyBusyPanel } from "@/components/deal/create-policy-busy-panel";
import { createPolicyPromptCopy } from "@/lib/policy/dec-prompt";
import { mintFailureFlashText, mintFailureToast } from "@/lib/policy/mint-gate";
import { flashAction } from "@/lib/flash-client";

export function CreatePolicyFromDecModal({
  dealId,
  product,
  documentId,
  carrierName,
  selectedQuoteIds,
}: {
  dealId: string;
  product: string;
  documentId: string;
  carrierName?: string | null;
  selectedQuoteIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const carrier = (carrierName ?? "").trim() || "the carrier";
  const busy = creating || pending;

  function closeWithoutMint() {
    if (creating) return;
    const data = new FormData();
    data.set("dealId", dealId);
    startTransition(async () => {
      await notNowCreatePolicy(data);
      setOpen(false);
      router.replace(`/deals/${dealId}?tab=quotes&product=${product}`);
      router.refresh();
    });
  }

  function createPolicy() {
    if (creating || pending) return;
    setCreating(true);
    startTransition(async () => {
      try {
        const result = await issuePolicyFromDeclaration({
          dealId,
          product,
          selectedQuoteIds,
          surface: "quotes",
          documentId,
        });
        if (!result.ok) {
          const toast = mintFailureToast(result.reason);
          flashAction(mintFailureFlashText(result), toast.kind);
          return;
        }
        flashAction("policy-minted");
        setOpen(false);
        router.push(`/policies/${result.policyId}`);
        router.refresh();
      } finally {
        setCreating(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !creating) closeWithoutMint();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!creating}
        data-ff-create-policy-from-dec=""
        aria-busy={creating}
      >
        <DialogHeader>
          <DialogTitle>Declaration received</DialogTitle>
          <DialogDescription data-ff-create-policy-copy="">
            {createPolicyPromptCopy(carrier)}
          </DialogDescription>
        </DialogHeader>
        {creating ? <CreatePolicyBusyPanel /> : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            data-ff-create-policy-not-now=""
            onClick={closeWithoutMint}
          >
            Not now
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            data-ff-create-policy-now=""
            onClick={createPolicy}
          >
            Create policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
