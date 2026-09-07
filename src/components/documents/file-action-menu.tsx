"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { Download, Eye, Replace, Trash2 } from "lucide-react";
import { deleteUploadedFile } from "@/app/actions/documents";
import { replaceDocument } from "@/app/actions/document-versions";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteUploadedFileSubject, uploadedFileDeleteMode } from "@/lib/documents/delete-file";
import { FILE_ACTION_ACCEPT } from "@/lib/documents/file-action-menu";
import { fileDownloadHref, fileViewHref } from "@/lib/files/urls";
import { cn } from "@/lib/utils";

export type FileActionMenuProps = {
  documentId: string;
  filename: string;
  slot?: string;
  docType?: string;
  dealId?: string | null;
  policyId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  returnTo?: string;
  className?: string;
  triggerClassName?: string;
  children: ReactNode;
};

export function FileActionMenu({
  documentId,
  filename,
  slot = "source_doc",
  docType = "other",
  dealId,
  policyId,
  contactId,
  leadId,
  returnTo,
  className,
  triggerClassName,
  children,
}: FileActionMenuProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceFormRef = useRef<HTMLFormElement>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const viewHref = fileViewHref(documentId);
  const downloadHref = fileDownloadHref(documentId);
  const mode = uploadedFileDeleteMode({ slot, docType });
  const subject = deleteUploadedFileSubject(filename, mode);

  return (
    <div className={cn("min-w-0", className)} data-ff-file-action-menu="">
      <form ref={replaceFormRef} action={replaceDocument} className="hidden">
        <input type="hidden" name="documentId" value={documentId} />
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <input
          ref={replaceInputRef}
          type="file"
          name="file"
          accept={FILE_ACTION_ACCEPT}
          onChange={() => {
            if (replaceInputRef.current?.files?.length) replaceFormRef.current?.requestSubmit();
          }}
        />
      </form>
      <HardDeleteForm action={deleteUploadedFile} subject={subject} className="hidden">
        <input type="hidden" name="documentId" value={documentId} />
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <button ref={deleteBtnRef} type="submit" tabIndex={-1} aria-hidden className="hidden" />
      </HardDeleteForm>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex min-w-0 w-full items-center gap-2 rounded-md border-0 bg-transparent p-0 text-left shadow-none outline-none hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring",
                triggerClassName,
              )}
            />
          }
        >
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44" data-ff-file-action-menu-items="">
          <DropdownMenuGroup>
            <DropdownMenuItem
              data-ff-file-action="view"
              render={<a href={viewHref} target="_blank" rel="noreferrer" />}
            >
              <Eye />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              data-ff-file-action="download"
              render={<a href={downloadHref} />}
            >
              <Download />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              data-ff-file-action="replace"
              onClick={() => replaceInputRef.current?.click()}
            >
              <Replace />
              Replace
            </DropdownMenuItem>
            <DropdownMenuItem
              data-ff-file-action="delete"
              variant="destructive"
              onClick={() => deleteBtnRef.current?.click()}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
