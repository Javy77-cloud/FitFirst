"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issuePolicyFromDeclaration, uploadDeclarationAndMint } from "@/app/actions/policy-mint";
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
import { isBoundReadyForIssue } from "@/lib/policy/mint-gate";
import { flashAction } from "@/lib/flash-client";

export type IssuedPolicyChip = {
  id: string;
  policyNumber?: string | null;
  mintStatus?: string | null;
  published?: boolean;
};

export function IssuePolicyFromDec({
  dealId,
  product,
  stage,
  selectedQuoteIds,
  mintStatus,
  issued,
  autoOpen = false,
}: {
  dealId: string;
  product: string;
  stage?: string | null;
  selectedQuoteIds: string[];
  mintStatus?: string | null;
  issued?: IssuedPolicyChip | null;
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(autoOpen);
  const [creating, setCreating] = useState(mintStatus === "creating");
  const [fileName, setFileName] = useState("");
  const bound = isBoundReadyForIssue(stage);
  const hasQuote = selectedQuoteIds.length > 0;

  useEffect(() => {
    setCreating(mintStatus === "creating");
  }, [mintStatus]);

  useEffect(() => {
    if (autoOpen && bound && hasQuote && !issued?.id) setOpen(true);
  }, [autoOpen, bound, hasQuote, issued?.id]);

  function mint(documentId?: string) {
    setCreating(true);
    startTransition(async () => {
      const result = await issuePolicyFromDeclaration({
        dealId,
        product,
        selectedQuoteIds,
        surface: "quotes",
        documentId,
      });
      if (!result.ok) {
        setCreating(false);
        if (result.reason === "need_dec") {
          setOpen(true);
          return;
        }
        flashAction(result.reason === "need_quote" ? "need-quote" : "deal-updated");
        return;
      }
      setOpen(false);
      flashAction("policy-minted");
      router.push(`/policies/${result.policyId}`);
      router.refresh();
    });
  }

  function uploadAndMint(file: File) {
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("product", product);
    data.set("file", file);
    for (const id of selectedQuoteIds) data.append("quoteId", id);
    setCreating(true);
    setOpen(false);
    startTransition(async () => {
      const result = await uploadDeclarationAndMint(data);
      if (!result.ok) {
        setCreating(false);
        if (result.reason === "need_dec") setOpen(true);
        return;
      }
      flashAction("policy-minted");
      router.push(`/policies/${result.policyId}`);
      router.refresh();
    });
  }

  if (issued?.id) {
    return (
      <a
        href={`/policies/${issued.id}`}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-700/30 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-900 hover:bg-emerald-100"
        data-ff-issued-policy-chip={issued.id}
      >
        <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden />
        {issued.published ? "Policy" : "Confirm policy"}
        {issued.policyNumber ? <span className="font-medium">· {issued.policyNumber}</span> : null}
      </a>
    );
  }

  if (creating || pending) {
    return (
      <p
        className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-navy/5 px-3 py-1 text-[12px] font-semibold text-navy"
        data-ff-creating-policy=""
      >
        <span className="size-1.5 animate-pulse rounded-full bg-navy" aria-hidden />
        Creating policy…
      </p>
    );
  }

  if (!bound || !hasQuote) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" data-ff-issue-policy="">
      <Button
        type="button"
        size="sm"
        data-ff-issue-policy-from-dec=""
        onClick={() => mint()}
      >
        Issue policy from declaration
      </Button>
      <button
        type="button"
        className="text-[12px] font-medium text-navy underline-offset-2 hover:underline"
        onClick={() => setOpen(true)}
      >
        Upload dec
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" data-ff-mint-dec-dialog="">
          <DialogHeader>
            <DialogTitle>Declaration PDF</DialogTitle>
            <DialogDescription>
              Policy mint reads the issued declaration only — not a quote packet or wind mit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <ChooseFileButton
              name="file"
              accept="application/pdf,.pdf"
              keepLabel
              className="h-8"
              onFile={(file) => {
                setFileName(file?.name ?? "");
                if (file) uploadAndMint(file);
              }}
            />
            {fileName ? (
              <p className="truncate text-sm text-navy" data-ff-mint-dec-filename="">
                {fileName}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">PDF declarations page from the carrier.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
