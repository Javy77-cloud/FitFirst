"use client";

import { useMemo, useState } from "react";
import { uploadDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { docTypeLabel, inferDocTypeFromName, libraryDocTypes } from "@/lib/documents/library";
import { DOC_TYPE_LABELS, type DocumentLibrary, type DocType } from "@/lib/domain";

export function LibraryUpload({
  library,
  folderId,
}: {
  library: DocumentLibrary;
  folderId: string | null;
}) {
  const types = libraryDocTypes(library);
  const [files, setFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState<string>("auto");

  const preview = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        type:
          docType === "auto"
            ? inferDocTypeFromName(file.name, library)
            : (docType as DocType),
        size: file.size,
      })),
    [files, docType, library],
  );

  return (
    <form action={uploadDocument} className="ff-card space-y-2 p-3">
      <div className="text-sm font-semibold text-navy">Upload files</div>
      <p className="text-xs text-muted-foreground">
        Multi-file. Type and name show before you save
        {library === "forms" ? " — Forms uploads are marked fillable." : " — Library files are marketing, appetite, and carrier info."}
      </p>
      <input type="hidden" name="library" value={library} />
      {folderId ? <input type="hidden" name="folderId" value={folderId} /> : null}
      {library === "forms" ? <input type="hidden" name="fillable" value="true" /> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Type</Label>
          <select
            name="docType"
            value={docType}
            onChange={(event) => setDocType(event.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="auto">Guess from file name</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Tags</Label>
          <Input name="tags" className="mt-1 h-8" placeholder="optional tags" />
        </div>
      </div>
      <input
        name="files"
        type="file"
        multiple
        required
        className="block w-full text-xs"
        onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
      />
      {preview.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-border bg-muted px-2 py-2 text-xs">
          {preview.map((file) => (
            <li key={file.name} className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-navy">{file.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground">{docTypeLabel(file.type)}</span>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  data-ff-delete-file
                  onClick={() => setFiles((current) => current.filter((item) => item.name !== file.name))}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No files selected yet.</p>
      )}
      <Button type="submit" size="sm">
        Upload{preview.length ? ` ${preview.length}` : ""}
      </Button>
    </form>
  );
}
