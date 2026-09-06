"use client";

import { Trash2 } from "lucide-react";
import { deleteUploadedFile } from "@/app/actions/documents";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { deleteUploadedFileSubject, uploadedFileDeleteMode } from "@/lib/documents/delete-file";

export function DeleteUploadedFileButton({
  documentId,
  filename,
  slot = "source_doc",
  docType = "other",
  dealId,
  policyId,
  contactId,
  leadId,
  returnTo,
  label,
  icon = false,
}: {
  documentId: string;
  filename: string;
  slot?: string;
  docType?: string;
  dealId?: string | null;
  policyId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  returnTo?: string;
  label?: string;
  icon?: boolean;
}) {
  const mode = uploadedFileDeleteMode({ slot, docType });
  return (
    <HardDeleteForm
      action={deleteUploadedFile}
      subject={deleteUploadedFileSubject(filename, mode)}
      className="inline"
    >
      <input type="hidden" name="documentId" value={documentId} />
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <Button
        type="submit"
        size={icon ? "icon-xs" : "xs"}
        variant="ghost"
        data-ff-delete-file
        aria-label={label ?? (mode === "hide" ? `Hide ${filename}` : `Delete ${filename}`)}
      >
        {icon ? <Trash2 /> : (label ?? (mode === "hide" ? "Hide" : "Delete"))}
      </Button>
    </HardDeleteForm>
  );
}
