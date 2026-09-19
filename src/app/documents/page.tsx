import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FileList } from "@/components/documents/file-list";
import { FolderTools } from "@/components/documents/folder-tools";
import { FolderTree } from "@/components/documents/folder-tree";
import { LibraryTabs } from "@/components/documents/library-tabs";
import { LibraryUpload } from "@/components/documents/library-upload";
import { buttonVariants } from "@/components/ui/button";
import {
  folderFileCounts,
  getFolder,
  listDocumentsInFolder,
  listLibraryDocuments,
  listLibraryFolders,
} from "@/lib/db/ops-queries";
import { listFormTemplates } from "@/lib/db/queries";
import { buildFolderTree, libraryHref, libraryLabel, parseLibrary } from "@/lib/documents/library";
import { folderBreadcrumbs } from "@/lib/ops/documents";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const library = parseLibrary(
    typeof params.library === "string"
      ? params.library
      : typeof params.scope === "string"
        ? params.scope
        : "forms",
  );
  const folderId = typeof params.folder === "string" ? params.folder : "";
  const notice = typeof params.notice === "string" ? params.notice : "";
  const folder = folderId ? await getFolder(folderId) : null;

  const [libraryFolders, { counts }, templates] = await Promise.all([
    listLibraryFolders(library),
    folderFileCounts(),
    listFormTemplates(),
  ]);

  const files = folder
    ? await listDocumentsInFolder(folder.id)
    : await listLibraryDocuments(library, null);

  const tree = buildFolderTree(
    libraryFolders.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      library: row.library,
      kind: row.kind,
    })),
  );
  const crumbs = folderBreadcrumbs(
    libraryFolders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })),
    folder?.id ?? null,
  );
  const folderTemplates =
    library === "forms" && folder
      ? templates.filter((t) => t.folderId === folder.id)
      : library === "forms" && !folder
        ? templates.filter((t) => !t.folderId)
        : [];

  return (
    <AppShell
      title="Documents"
      actions={
        <Link href="/documents?library=shared" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Library
        </Link>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Forms (ACORD, cancellation, AOR) and Library (marketing, carrier flyers, appetite
        guides). Folders are by type, with a carrier folder inside. Scan &amp; suggest is not
        live OCR.
      </p>

      {notice === "bad-move" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          That move would nest a folder inside itself. Pick another destination.
        </p>
      ) : null}
      {notice === "scan-suggested" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Suggested fields applied. Edit anything that looks wrong.
        </p>
      ) : null}
      {notice === "uploaded" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Files stored in this library.
        </p>
      ) : null}

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <LibraryTabs library={library} />
        <p className="text-xs text-muted-foreground">
          {libraryFolders.length} folders ·{" "}
          {library === "forms" ? "fillable ACORD / cancellation / AOR" : "marketing, appetite, carrier files"}
        </p>
      </div>

      <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs">
        <Link href={libraryHref({ library })} className="text-primary hover:underline">
          {libraryLabel(library)}
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            <Link
              href={libraryHref({ library, folderId: crumb.id })}
              className="text-primary hover:underline"
            >
              {crumb.name}
            </Link>
          </span>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="ff-card p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Folders
          </div>
          <Link
            href={libraryHref({ library })}
            className={`mb-2 block rounded-md px-2 py-1.5 text-sm ${
              folder ? "text-navy hover:bg-muted" : "bg-fit-check-bg font-semibold text-navy"
            }`}
          >
            {libraryLabel(library)} root
          </Link>
          <FolderTree nodes={tree} library={library} activeId={folder?.id ?? null} counts={counts} />
        </aside>

        <div className="space-y-4">
          <FolderTools library={library} folder={folder} siblings={libraryFolders} />
          <LibraryUpload library={library} folderId={folder?.id ?? null} />

          <section className="ff-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy">
              {folder ? folder.name : `${libraryLabel(library)} files`}
            </h2>
            <FileList
              docs={files}
              templates={folderTemplates}
              empty={
                folder
                  ? "This folder is empty. Upload files or add a subfolder."
                  : "Open a folder to file uploads, or create one on the left."
              }
            />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
