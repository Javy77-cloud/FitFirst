import Link from "next/link";
import {
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  ImageIcon,
  Megaphone,
  Newspaper,
} from "lucide-react";
import { createFolder } from "@/app/actions/folders";
import { uploadDocument } from "@/app/actions/documents";
import { ChooseFiles } from "@/components/choose-files";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Document, DocumentFolder } from "@/lib/db/schema";
import { displayDocumentTags } from "@/lib/documents/document-labels";
import { DOC_TYPE_LABELS, DOC_TYPES, FOLDER_KIND_LABELS, FOLDER_KINDS } from "@/lib/domain";
import { fileGlyph, folderHref } from "@/lib/ops/documents";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { SendForSignature } from "@/components/ops/entity-upload";
import { cn } from "@/lib/utils";

const ICONS = {
  folder: Folder,
  pdf: FileText,
  image: ImageIcon,
  form: FileSpreadsheet,
  flyer: Megaphone,
  note: Newspaper,
  file: File,
};

export function ScopeTabs({ scope }: { scope: string }) {
  const items = [
    ["library", "Agency library"],
    ["accounts", "Accounts"],
    ["deals", "Deals"],
    ["all", "All files"],
  ] as const;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(([value, label]) => (
        <Link
          key={value}
          href={folderHref({ scope: value })}
          className={cn(buttonVariants({ size: "sm", variant: scope === value ? "default" : "outline" }))}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function FolderGrid({
  folders,
  counts,
  scope,
}: {
  folders: DocumentFolder[];
  counts: Map<string, number>;
  scope: string;
}) {
  if (folders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No folders here. Create one with New Folder — agency library stays separate from account and
        deal files.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {folders.map((folder) => {
        const n = counts.get(folder.id) ?? 0;
        return (
          <Link
            key={folder.id}
            href={folderHref({ scope, folderId: folder.id })}
            className="ff-doc-tile"
          >
            <span className="ff-doc-icon ff-doc-navy">
              <Folder className="size-4" />
            </span>
            <div>
              <div className="truncate text-sm font-semibold text-navy">{folder.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {FOLDER_KIND_LABELS[folder.kind as keyof typeof FOLDER_KIND_LABELS] ?? folder.kind}
                {n ? ` · ${n} file${n === 1 ? "" : "s"}` : " · empty"}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function FileGrid({
  docs,
  returnTo,
}: {
  docs: Document[];
  returnTo: string;
}) {
  if (docs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No files in this folder. Upload a dec, ACORD, flyer, or photo — demo names only.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {docs.map((doc) => {
        const glyph = fileGlyph(doc.docType, doc.mimeType);
        const Icon = ICONS[glyph.icon];
        return (
          <div key={doc.id} className="ff-doc-tile">
            <FileActionMenu
              documentId={doc.id}
              filename={doc.filename}
              mimeType={doc.mimeType}
              slot={doc.slot}
              docType={doc.docType}
              tags={doc.tags}
              dealId={doc.dealId}
              policyId={doc.policyId}
              contactId={doc.contactId}
              returnTo={returnTo}
              triggerClassName="flex-col items-start gap-1"
            >
              <span className={`ff-doc-icon ff-doc-${glyph.tone}`}>
                <Icon className="size-4" />
              </span>
              <div>
                <div className="line-clamp-2 text-sm font-semibold text-navy">{doc.filename}</div>
                <div className="text-[11px] text-muted-foreground">
                  {DOC_TYPE_LABELS[doc.docType as keyof typeof DOC_TYPE_LABELS] ?? doc.docType}
                  {displayDocumentTags(doc.tags).length ? ` · ${displayDocumentTags(doc.tags).join(", ")}` : ""}
                </div>
              </div>
            </FileActionMenu>
            <div className="flex flex-wrap items-center gap-2">
              <SendForSignature document={doc} returnTo={returnTo} compact />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ManagerToolbar({
  folder,
  scope,
  related,
}: {
  folder: DocumentFolder | null;
  scope: string;
  related: {
    contacts: { id: string; firstName: string; lastName: string }[];
    deals: { id: string; title: string }[];
  };
}) {
  const defaultKind =
    folder?.kind ??
    (scope === "accounts" ? "account" : scope === "deals" ? "deal" : "agency_library");

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <form action={createFolder} className="ff-card space-y-2 p-3">
        <div className="text-sm font-semibold text-navy">New Folder</div>
        <input type="hidden" name="scope" value={scope} />
        {folder ? <input type="hidden" name="parentId" value={folder.id} /> : null}
        {folder?.contactId ? <input type="hidden" name="contactId" value={folder.contactId} /> : null}
        {folder?.dealId ? <input type="hidden" name="dealId" value={folder.dealId} /> : null}
        <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
          <div>
            <Label className="text-xs">Name</Label>
            <Input name="name" required className="mt-1 h-8" placeholder="HO applications" />
          </div>
          <div>
            <Label className="text-xs">Kind</Label>
            <select
              name="kind"
              defaultValue={defaultKind}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              {FOLDER_KINDS.map((k) => (
                <option key={k} value={k}>
                  {FOLDER_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!folder && scope === "accounts" ? (
          <select name="contactId" className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">Account (optional)</option>
            {related.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        ) : null}
        {!folder && scope === "deals" ? (
          <select name="dealId" className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">Deal (optional)</option>
            {related.deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        ) : null}
        <Button type="submit" size="sm">
          New Folder
        </Button>
      </form>

      <form action={uploadDocument} className="ff-card space-y-2 p-3">
        <div className="text-sm font-semibold text-navy">Upload</div>
        {folder ? <input type="hidden" name="folderId" value={folder.id} /> : null}
        {folder?.dealId ? <input type="hidden" name="dealId" value={folder.dealId} /> : null}
        {folder?.contactId ? <input type="hidden" name="contactId" value={folder.contactId} /> : null}
        {!folder ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <select name="dealId" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
              <option value="">Deal (optional)</option>
              {related.deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <select name="contactId" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
              <option value="">Account (optional)</option>
              {related.contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.lastName}, {c.firstName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            name="docType"
            defaultValue={scope === "library" ? "acord" : "dec"}
            className="h-8 rounded-md border border-input bg-card px-2 text-sm"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <Input name="tags" className="h-8" placeholder="tags" />
        </div>
        <ChooseFiles name="file" required />
        <Button type="submit" size="sm">
          Upload
        </Button>
      </form>
    </div>
  );
}
