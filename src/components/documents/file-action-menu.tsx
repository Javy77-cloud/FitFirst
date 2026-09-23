"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { CalendarRange, Download, Eye, MoreVertical, Pencil, Replace, Tags, Trash2 } from "lucide-react";
import {
  renameUploadedFile,
  deleteUploadedFile,
  unlinkDealDocumentFromProduct,
  setDocumentTermRole,
  updateDocumentLabel,
} from "@/app/actions/documents";
import { replaceDocument } from "@/app/actions/document-versions";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteUploadedFileSubject, uploadedFileDeleteMode } from "@/lib/documents/delete-file";
import { multiProductMembershipWarning, shopLinesFromDocTags } from "@/lib/documents/product-doc-membership";
import { confirmPolicyDocumentDelete } from "@/lib/desk/confirm-policy-document-delete";
import { DocumentPreviewDialog } from "@/components/documents/document-preview-dialog";
import { FILE_ACTION_ACCEPT } from "@/lib/documents/file-action-menu";
import {
  DOCUMENT_TERM_ROLES,
  POLICY_ATTACH_DOC_TYPES,
  termRoleFromTags,
  type DocumentTermRole,
} from "@/lib/documents/document-labels";
import { fileDownloadHref } from "@/lib/files/urls";
import { cn } from "@/lib/utils";

export type FileActionMenuProps = {
  documentId: string;
  filename: string;
  mimeType?: string | null;
  slot?: string;
  docType?: string;
  tags?: string[] | null;
  dealId?: string | null;
  policyId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  returnTo?: string;
  className?: string;
  triggerClassName?: string;
  /** Optimistic hide after the one confirm (deal Documents list). */
  onDeleted?: () => void;
  /** Active product shop line — enables Remove from this product. */
  line?: string | null;
  quotingForm?: string | null;
  onUnlinked?: () => void;
  children: ReactNode;
};

export function FileActionMenu({
  documentId,
  filename,
  mimeType,
  slot = "source_doc",
  docType = "other",
  tags,
  dealId,
  policyId,
  contactId,
  leadId,
  returnTo,
  className,
  triggerClassName,
  onDeleted,
  line,
  quotingForm,
  onUnlinked,
  children,
}: FileActionMenuProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceFormRef = useRef<HTMLFormElement>(null);
  const renameFormRef = useRef<HTMLFormElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const typeFormRef = useRef<HTMLFormElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const termFormRef = useRef<HTMLFormElement>(null);
  const termInputRef = useRef<HTMLInputElement>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const unlinkFormRef = useRef<HTMLFormElement>(null);
  const reasonInputRef = useRef<HTMLInputElement>(null);
  const [gone, setGone] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const downloadHref = fileDownloadHref(documentId);
  const mode = uploadedFileDeleteMode({ slot, docType });
  const subject = deleteUploadedFileSubject(filename, mode);
  const multiWarning = multiProductMembershipWarning(tags);
  const membershipLines = shopLinesFromDocTags(tags);
  const deleteSubject = multiWarning
    ? `${subject}. ${multiWarning}`
    : subject;
  const canUnlink = Boolean(dealId && line && membershipLines.includes(line as never));
  const policyDocDelete = Boolean(policyId);
  const currentTermRole = termRoleFromTags(tags);

  function requestPolicyDelete() {
    const reason = confirmPolicyDocumentDelete(subject);
    if (!reason) return;
    if (reasonInputRef.current) reasonInputRef.current.value = reason;
    setGone(true);
    onDeleted?.();
    deleteBtnRef.current?.click();
  }

  function requestRename() {
    const promptFn = typeof globalThis.prompt === "function" ? globalThis.prompt.bind(globalThis) : null;
    if (!promptFn) return;
    const next = promptFn("Rename file:", filename)?.trim() ?? "";
    if (!next || next === filename) return;
    if (renameInputRef.current) renameInputRef.current.value = next;
    renameFormRef.current?.requestSubmit();
  }

  function submitDocType(nextType: string) {
    if (!nextType || nextType === docType) return;
    if (typeInputRef.current) typeInputRef.current.value = nextType;
    typeFormRef.current?.requestSubmit();
  }

  function submitTermRole(nextRole: DocumentTermRole | "clear") {
    if (nextRole === "clear") {
      if (!currentTermRole) return;
      if (termInputRef.current) termInputRef.current.value = "clear";
      termFormRef.current?.requestSubmit();
      return;
    }
    if (nextRole === currentTermRole) return;
    if (termInputRef.current) termInputRef.current.value = nextRole;
    termFormRef.current?.requestSubmit();
  }

  if (gone) return null;

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)} data-ff-file-action-menu="">
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
      <form ref={renameFormRef} action={renameUploadedFile} className="hidden">
        <input type="hidden" name="documentId" value={documentId} />
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <input ref={renameInputRef} type="hidden" name="filename" defaultValue="" />
      </form>
      <form ref={typeFormRef} action={updateDocumentLabel} className="hidden">
        <input type="hidden" name="documentId" value={documentId} />
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <input ref={typeInputRef} type="hidden" name="docType" defaultValue="" />
      </form>
      <form ref={termFormRef} action={setDocumentTermRole} className="hidden">
        <input type="hidden" name="documentId" value={documentId} />
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <input ref={termInputRef} type="hidden" name="termRole" defaultValue="" />
      </form>
      {/* One HardDeleteForm: menu Delete + visible trash both click this submitter (one confirm). */}
      {canUnlink ? (
        <form ref={unlinkFormRef} action={unlinkDealDocumentFromProduct} className="hidden">
          <input type="hidden" name="documentId" value={documentId} />
          {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
          {line ? <input type="hidden" name="line" value={line} /> : null}
          {quotingForm ? <input type="hidden" name="quotingForm" value={quotingForm} /> : null}
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        </form>
      ) : null}
      <HardDeleteForm
        action={deleteUploadedFile}
        subject={deleteSubject}
        className="hidden"
        confirm={!policyDocDelete}
        onConfirmed={() => {
          if (policyDocDelete) return;
          setGone(true);
          onDeleted?.();
        }}
      >
        <input type="hidden" name="documentId" value={documentId} />
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <input ref={reasonInputRef} type="hidden" name="deleteReason" defaultValue="" />
        <button ref={deleteBtnRef} type="submit" tabIndex={-1} aria-hidden className="hidden" />
      </HardDeleteForm>

      <button
        type="button"
        data-ff-file-action="view-trigger"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md border-0 bg-transparent p-0 text-left shadow-none outline-none hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring",
          triggerClassName,
        )}
        onClick={() => setPreviewOpen(true)}
      >
        {children}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label="More file actions"
          title="More actions"
          data-ff-file-action="menu"
          data-ff-file-action-menu-trigger=""
          className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground outline-none hover:bg-secondary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreVertical className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44" data-ff-file-action-menu-items="">
          <DropdownMenuGroup>
            <DropdownMenuItem
              data-ff-file-action="view"
              onClick={() => setPreviewOpen(true)}
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
            <DropdownMenuItem data-ff-file-action="rename" onClick={requestRename}>
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-ff-file-action="change-type">
                <Tags />
                Change type
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-52">
                <DropdownMenuLabel>Document type</DropdownMenuLabel>
                {POLICY_ATTACH_DOC_TYPES.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    data-ff-file-action-type={option.value}
                    onClick={() => submitDocType(option.value)}
                  >
                    {option.label}
                    {option.value === docType ? " ✓" : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-ff-file-action="set-term-role">
                <CalendarRange />
                Set term role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-52">
                <DropdownMenuLabel>Term role</DropdownMenuLabel>
                {DOCUMENT_TERM_ROLES.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    data-ff-file-action-term={option.value}
                    onClick={() => submitTermRole(option.value)}
                  >
                    {option.label}
                    {option.value === currentTermRole ? " ✓" : ""}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  data-ff-file-action-term="clear"
                  onClick={() => submitTermRole("clear")}
                >
                  Clear term role
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              data-ff-file-action="replace"
              onClick={() => replaceInputRef.current?.click()}
            >
              <Replace />
              Replace
            </DropdownMenuItem>
            {canUnlink ? (
              <DropdownMenuItem
                data-ff-file-action="unlink-product"
                onClick={() => {
                  setGone(true);
                  onUnlinked?.();
                  unlinkFormRef.current?.requestSubmit();
                }}
              >
                Remove from this product
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              data-ff-file-action="delete"
              variant="destructive"
              onClick={() => {
                if (policyDocDelete) requestPolicyDelete();
                else deleteBtnRef.current?.click();
              }}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <FileDeleteIcon
        type="button"
        label={mode === "hide" ? "Hide" : "Delete"}
        data-ff-file-action="delete-icon"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (policyDocDelete) requestPolicyDelete();
          else deleteBtnRef.current?.click();
        }}
      />

      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        documentId={documentId}
        filename={filename}
        mimeType={mimeType}
      />
    </div>
  );
}
