"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issuePolicyFromDeclaration, saveIssuedPolicyUpload } from "@/app/actions/policy-mint";
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
import { CreatePolicyBusyPanel } from "@/components/deal/create-policy-busy-panel";
import { PolicyMintSuccessPanel } from "@/components/deal/policy-mint-success-panel";
import { isBoundReadyForIssue, mintFailureFlashText, mintFailureToast } from "@/lib/policy/mint-gate";
import {
  ISSUED_POLICY_ACCEPT,
  ISSUED_POLICY_FOLDER_SAVED,
  type IssuedPolicyFolderSavedDetail,
} from "@/lib/policy/issued-upload";
import { flashAction } from "@/lib/flash-client";

export const OPEN_ISSUED_POLICY_UPLOAD = "ff-open-issued-policy-upload";

const SUCCESS_HOLD_MS = 1800;

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
  folderHasPolicy = false,
}: {
  dealId: string;
  product: string;
  stage?: string | null;
  selectedQuoteIds: string[];
  mintStatus?: string | null;
  issued?: IssuedPolicyChip | null;
  autoOpen?: boolean;
  /** Selected quote already has a Manual or carrier file. Do not reopen the upload popup. */
  folderHasPolicy?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(autoOpen && !folderHasPolicy);
  const [creating, setCreating] = useState(mintStatus === "creating");
  const [successPolicyId, setSuccessPolicyId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const bound = isBoundReadyForIssue(stage);
  const hasQuote = selectedQuoteIds.length > 0;
  const holdOpen = creating || pending || Boolean(successPolicyId);

  useEffect(() => {
    setCreating(mintStatus === "creating");
  }, [mintStatus]);

  useEffect(() => {
    if (folderHasPolicy) return;
    if (autoOpen && bound && hasQuote && !issued?.id) setOpen(true);
  }, [autoOpen, bound, folderHasPolicy, hasQuote, issued?.id]);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ dealId?: string; product?: string }>).detail;
      if (detail?.dealId && detail.dealId !== dealId) return;
      if (detail?.product && detail.product !== product) return;
      if (folderHasPolicy) return;
      if (bound && hasQuote && !issued?.id) setOpen(true);
    }
    window.addEventListener(OPEN_ISSUED_POLICY_UPLOAD, onOpen);
    return () => window.removeEventListener(OPEN_ISSUED_POLICY_UPLOAD, onOpen);
  }, [bound, dealId, folderHasPolicy, hasQuote, issued?.id, product]);

  async function celebrateAndGo(policyId: string) {
    flashAction("policy-minted");
    setSuccessPolicyId(policyId);
    await new Promise((resolve) => setTimeout(resolve, SUCCESS_HOLD_MS));
    router.push(`/policies/${policyId}`);
    router.refresh();
  }

  function mint(documentId?: string, force = false) {
    setCreating(true);
    startTransition(async () => {
      const result = await issuePolicyFromDeclaration({
        dealId,
        product,
        selectedQuoteIds,
        surface: "quotes",
        documentId,
        force,
      });
      if (!result.ok) {
        setCreating(false);
        if (result.reason === "need_dec") {
          setOpen(true);
          return;
        }
        const toast = mintFailureToast(result.reason);
        flashAction(mintFailureFlashText(result), toast.kind);
        return;
      }
      setOpen(false);
      await celebrateAndGo(result.policyId);
    });
  }

  async function uploadAndMint(file: File) {
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("product", product);
    data.set("file", file);
    for (const id of selectedQuoteIds) data.append("quoteId", id);
    setCreating(true);
    setOpen(false);
    const saved = await saveIssuedPolicyUpload(data);
    if (!saved.ok) {
      setCreating(false);
      if (saved.reason === "need_dec") setOpen(true);
      const toast = mintFailureToast(saved.reason);
      flashAction(toast.key, toast.kind);
      return;
    }
    if (saved.quoteId) {
      const detail: IssuedPolicyFolderSavedDetail = {
        quoteId: saved.quoteId,
        documentId: saved.documentId,
        folder: saved.folder,
      };
      window.dispatchEvent(new CustomEvent(ISSUED_POLICY_FOLDER_SAVED, { detail }));
    }
    router.refresh();
    const result = await issuePolicyFromDeclaration({
      dealId,
      product,
      selectedQuoteIds,
      surface: "quotes",
      documentId: saved.documentId,
    });
    if (!result.ok) {
      setCreating(false);
      router.refresh();
      if (result.reason === "need_dec") setOpen(true);
      const toast = mintFailureToast(result.reason);
      flashAction(mintFailureFlashText(result), toast.kind);
      return;
    }
    await celebrateAndGo(result.policyId);
  }

  if (holdOpen) {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          data-ff-creating-policy=""
          data-ff-mint-hold=""
          aria-busy="true"
        >
          <DialogHeader>
            <DialogTitle>{successPolicyId ? "Policy created" : "Processing declaration"}</DialogTitle>
          </DialogHeader>
          {successPolicyId ? <PolicyMintSuccessPanel /> : <CreatePolicyBusyPanel />}
        </DialogContent>
      </Dialog>
    );
  }

  if (issued?.id && issued.published) {
    return (
      <a
        href={`/policies/${issued.id}`}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-700/30 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-900 hover:bg-emerald-100"
        data-ff-issued-policy-chip={issued.id}
      >
        <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden />
        Policy
        {issued.policyNumber ? <span className="font-medium">· {issued.policyNumber}</span> : null}
      </a>
    );
  }

  if (issued?.id) {
    return (
      <div className="flex flex-wrap items-center gap-2" data-ff-issue-policy="">
        <a
          href={`/policies/${issued.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-700/30 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-900 hover:bg-emerald-100"
          data-ff-issued-policy-chip={issued.id}
        >
          <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden />
          Confirm policy
          {issued.policyNumber ? <span className="font-medium">· {issued.policyNumber}</span> : null}
        </a>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-ff-reread-declaration=""
          onClick={() => mint(undefined, true)}
        >
          Re-read declaration
        </Button>
      </div>
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
              Upload the issued declaration or policy (PDF or a photo). It is saved on this quote’s Manual
              folder, or the carrier folder when that quote already has carrier files, before Gemini reads
              the policy number, premium, and dates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <ChooseFileButton
              name="file"
              accept={ISSUED_POLICY_ACCEPT}
              keepLabel
              className="h-8"
              onFile={(file) => {
                setFileName(file?.name ?? "");
                if (file) void uploadAndMint(file);
              }}
            />
            {fileName ? (
              <p className="truncate text-sm text-navy" data-ff-mint-dec-filename="">
                {fileName}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">PDF or a photo of the issued policy page.</p>
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
