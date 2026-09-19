import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FileList } from "@/components/documents/file-list";
import { FolderTools } from "@/components/documents/folder-tools";
import { FolderTree } from "@/components/documents/folder-tree";
import { FormSendLoop } from "@/components/documents/form-send-loop";
import { LibraryTabs } from "@/components/documents/library-tabs";
import { LibraryUpload } from "@/components/documents/library-upload";
import { TypeCarrierBrowse } from "@/components/documents/type-carrier-browse";
import { buttonVariants } from "@/components/ui/button";
import {
  folderFileCounts,
  getFolder,
  listDocumentsInFolder,
  listLibraryDocuments,
  listLibraryFolders,
} from "@/lib/db/ops-queries";
import { listDealLookup, listFormTemplates } from "@/lib/db/queries";
import { listRecentDocumentPipelineJobs } from "@/lib/document-pipeline/store";
import { isDocumentPipelineJobType, isDocumentPipelineStatus } from "@/lib/document-pipeline/types";
import { buildFolderTree, libraryHref, libraryLabel, parseLibrary } from "@/lib/documents/library";
import { groupFoldersByTypeAndCarrier } from "@/lib/documents/type-folders";
import { docusignSandboxIdentity } from "@/lib/integrations/docusign-envelopes";
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

  const [libraryFolders, { counts }, templates, deals, recentJobs, docusign] = await Promise.all([
    listLibraryFolders(library),
    folderFileCounts(),
    listFormTemplates(),
    listDealLookup().catch(() => []),
    listRecentDocumentPipelineJobs(24).catch(() => []),
    docusignSandboxIdentity(),
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
        <div className="flex flex-wrap gap-2">
          <Link href="/esign" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Signed
          </Link>
          <Link href="/documents?library=shared" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Library
          </Link>
        </div>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Documents by type, carrier nested inside. Forms hold ACORD, No Run Loss, Cancellation, and AOR.
        Signed envelopes live on Signed. Email templates are their own nav section, not this library.
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

      <FormSendLoop
        deals={deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          partyName: deal.partyName,
          email: deal.email,
          firstName: deal.firstName,
          lastName: deal.lastName,
        }))}
        jobs={recentJobs
          .filter((job) => isDocumentPipelineJobType(job.type) && isDocumentPipelineStatus(job.status))
          .map((job) => ({
            id: job.id,
            dealId: job.dealId,
            type: job.type,
            status: job.status,
            extractFields: job.extractPayload?.fields ?? [],
            confirmedFields: job.confirmedFields ?? {},
            confirmedAt: job.confirmedAt ? job.confirmedAt.toISOString() : null,
            filledDocumentId: job.filledDocumentId,
            envelopeId: job.envelopeId ?? null,
            envelopeStatus: job.envelopeStatus ?? null,
            signerName: job.signerName ?? null,
            signerEmail: job.signerEmail ?? null,
            message: job.message,
            createdAt: job.createdAt.toISOString(),
          }))}
        docusignReady={docusign.ready}
        docusignLabel={docusign.label}
      />

      <div className="mb-3 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <LibraryTabs library={library} />
        <p className="text-xs text-muted-foreground">
          {libraryFolders.length} folders ·{" "}
          {library === "forms"
            ? "fillable ACORD / loss run / cancellation / AOR"
            : "marketing, appetite, carrier files"}
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

          {!folder ? (
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-navy">Browse by type</h2>
                <p className="text-xs text-muted-foreground">
                  Open a type, then the carrier inside it. Email is not listed here.
                </p>
              </div>
              <TypeCarrierBrowse
                groups={groupFoldersByTypeAndCarrier(
                  libraryFolders.map((row) => ({
                    id: row.id,
                    name: row.name,
                    parentId: row.parentId,
                    library: row.library,
                    kind: row.kind,
                  })),
                )}
                library={library}
                counts={counts}
              />
            </section>
          ) : null}

          <section className="ff-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy">
              {folder ? folder.name : `${libraryLabel(library)} files`}
            </h2>
            <FileList
              docs={files}
              templates={folderTemplates}
              empty={
                folder
                  ? "This folder is empty. Upload files or add a subfolder. Nest a carrier folder inside a type."
                  : "Root files. Prefer a type folder, then nest the carrier inside."
              }
            />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
