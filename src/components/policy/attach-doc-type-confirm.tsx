"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { attachDocTypeConfirmLabel } from "@/lib/policy/attach-doc-type-confirm";

/** Prominent ALL CAPS type. Larger and heavier than the sentence around it. */
export function AttachDocTypeConfirmCopy({ docTypes }: { docTypes: readonly string[] }) {
  return (
    <div data-ff-attach-confirm-copy="">
      <p className="text-2xl font-extrabold leading-tight tracking-wide text-navy" data-ff-attach-confirm-type="">
        {docTypes.map((docType) => (
          <span key={docType} className="block" data-ff-attach-confirm-type={docType}>
            {attachDocTypeConfirmLabel(docType)}
          </span>
        ))}
      </p>
      <p className="mt-2 text-sm font-normal text-muted-foreground">
        This file will be saved as the type above. Go back if you need to change Type first.
      </p>
    </div>
  );
}

export function AttachDocTypeConfirmDialog({
  open,
  docTypes,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  docTypes: readonly string[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent data-ff-attach-confirm="" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="sr-only">Confirm document type</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm the document type before attaching. Go back to change Type.
          </DialogDescription>
          <AttachDocTypeConfirmCopy docTypes={docTypes} />
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} data-ff-attach-confirm-cancel="">
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} data-ff-attach-confirm-ok="">
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
