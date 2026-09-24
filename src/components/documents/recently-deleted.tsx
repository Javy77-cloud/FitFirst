import { restoreUploadedFile } from "@/app/actions/documents";
import { currentDeskSession } from "@/lib/auth/session";
import { formatDocumentAuditStamp } from "@/lib/documents/file-audit";
import { listHiddenDocuments, type HiddenDocumentScope } from "@/lib/documents/hidden-files";

export async function RecentlyDeletedFiles({
  returnTo,
  ...scope
}: HiddenDocumentScope & { returnTo?: string }) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return null;
  const files = await listHiddenDocuments(scope);
  if (files.length === 0) return null;

  return (
    <section className="ff-card p-3" data-ff-recently-deleted="">
      <h3 className="text-sm font-semibold text-navy">Recently deleted</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Admin only. These files are hidden. Restore puts them back on the list.
      </p>
      <ul className="mt-2 space-y-1">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-2 text-sm"
            data-ff-recently-deleted-row={file.id}
          >
            <span className="min-w-0 truncate">
              <span className="font-medium text-navy">{file.filename}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {file.hiddenAt ? formatDocumentAuditStamp(file.hiddenAt) : "Hidden"}
                {file.actorName ? ` · ${file.actorName}` : ""}
              </span>
            </span>
            <form action={restoreUploadedFile}>
              <input type="hidden" name="documentId" value={file.id} />
              {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
              <button
                type="submit"
                className="text-xs font-medium text-primary hover:underline"
                data-ff-restore-file={file.id}
              >
                Restore
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
