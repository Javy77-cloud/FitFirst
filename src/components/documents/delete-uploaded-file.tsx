"use client";

import { deleteUploadedFile } from "@/app/actions/documents";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
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
  icon: _icon = false,
  immediate = false,
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
  immediate?: boolean;
}) {
  const mode = uploadedFileDeleteMode({ slot, docType });
  return (
    <HardDeleteForm
      action={deleteUploadedFile}
      subject={deleteUploadedFileSubject(filename, mode)}
      className="inline"
      confirm={!immediate}
    >
      <input type="hidden" name="documentId" value={documentId} />
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <FileDeleteIcon label={label ?? (mode === "hide" ? "Hide" : "Delete")} />
    </HardDeleteForm>
  );
}
