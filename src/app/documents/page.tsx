import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  FileGrid,
  FolderGrid,
  ManagerToolbar,
  ScopeTabs,
} from "@/components/ops/document-manager";
import { StubBanner } from "@/components/ops/stub-banner";
import { buttonVariants } from "@/components/ui/button";
import {
  folderFileCounts,
  getFolder,
  listDocumentsInFolder,
  listDocumentsWithExtracted,
  listFolderChildren,
  listFolders,
  listRelatedOptions,
} from "@/lib/db/ops-queries";
import { CONFIDENCE_THRESHOLD, formatPct } from "@/lib/domain";
import { folderBreadcrumbs, folderHref } from "@/lib/ops/documents";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = typeof params.scope === "string" ? params.scope : "library";
  const folderId = typeof params.folder === "string" ? params.folder : "";
  const folder = folderId ? await getFolder(folderId) : null;

  const [allFolders, related, { counts, unfiled }, { fields }] = await Promise.all([
    listFolders(),
    listRelatedOptions(),
    folderFileCounts(),
    listDocumentsWithExtracted(),
  ]);

  const childKind =
    folder?.kind ??
    (scope === "accounts" ? "account" : scope === "deals" ? "deal" : scope === "library" ? "agency_library" : undefined);

  const folders = folder
    ? await listFolderChildren(folder.id)
    : scope === "all"
      ? []
      : await listFolderChildren(null, childKind);

  const files = folder
    ? await listDocumentsInFolder(folder.id)
    : scope === "all"
      ? (await listDocumentsWithExtracted()).docs
      : [];

  const crumbs = folderBreadcrumbs(
    allFolders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })),
    folder?.id ?? null,
  );
  const flagged = fields.filter((f) => f.flagged && !f.appliedToRisk);
  const returnTo = folderHref({ scope, folderId: folder?.id });

  const heading = folder
    ? folder.name
    : scope === "accounts"
      ? "Account files"
      : scope === "deals"
        ? "Deal files"
        : scope === "all"
          ? "All files"
          : "Agency library";

  return (
    <AppShell
      title="Documents"
      actions={
        <Link href="/esign" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          E-sign envelopes
        </Link>
      }
    >
      <StubBanner>
        Agency library (ACORD, carrier flyers, marketing) stays separate from per-account and
        per-deal files. Demo names only — no InsuredMine data. No Zoho upload. Extraction
        confidence flags still apply on deal/risk files.
      </StubBanner>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ScopeTabs scope={scope} />
        <div className="text-xs text-muted-foreground">
          {unfiled ? `${unfiled} unfiled · ` : null}
          {allFolders.length} folders
        </div>
      </div>

      <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs">
        <Link href={folderHref({ scope })} className="text-primary hover:underline">
          {scope === "accounts" ? "Accounts" : scope === "deals" ? "Deals" : "Agency library"}
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            <Link href={folderHref({ scope, folderId: crumb.id })} className="text-primary hover:underline">
              {crumb.name}
            </Link>
          </span>
        ))}
      </nav>

      <ManagerToolbar folder={folder} scope={scope} related={related} />

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold text-navy">{heading}</h2>
        {scope === "all" && !folder ? (
          <FileGrid docs={files} returnTo={returnTo} />
        ) : (
          <div className="space-y-4">
            <FolderGrid folders={folders} counts={counts} scope={scope} />
            {folder ? <FileGrid docs={files} returnTo={returnTo} /> : null}
          </div>
        )}
      </section>

      {flagged.length > 0 ? (
        <section className="ff-card mt-4 overflow-hidden p-4">
          <h2 className="mb-1 text-sm font-semibold text-navy">Confidence flags</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Fields under {Math.round(CONFIDENCE_THRESHOLD * 100)}% stay off the worksheet until
            accepted on the deal.
          </p>
          <table className="ff-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Raw</th>
                <th>Conf.</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((field) => (
                <tr key={field.id} className="bg-fit-flag-bg/40">
                  <td>{field.fieldKey.replaceAll("_", " ")}</td>
                  <td className="font-mono text-[11px]">{field.rawValue}</td>
                  <td className="font-semibold text-fit-flag">{formatPct(Number(field.confidence))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </AppShell>
  );
}
