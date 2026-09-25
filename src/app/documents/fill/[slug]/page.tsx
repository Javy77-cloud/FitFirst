import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FillEsignPanel } from "@/components/documents/fill-esign-panel";
import { FillWorkspace } from "@/components/documents/fill-workspace";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getFormFill, getFormTemplate, latestFormFill } from "@/lib/db/queries";
import { libraryHref } from "@/lib/documents/library";
import { docusignSandboxIdentity } from "@/lib/integrations/docusign-envelopes";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DocumentFillPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fillId?: string; notice?: string }>;
}) {
  const { slug } = await params;
  const { fillId, notice } = await searchParams;
  const template = await getFormTemplate(slug);
  if (!template) notFound();
  const [fill, docusign] = await Promise.all([
    fillId ? getFormFill(fillId) : latestFormFill(template.id),
    docusignSandboxIdentity(),
  ]);
  const sourceDoc = fill?.sourceDocumentId
    ? (await db.select().from(documents).where(eq(documents.id, fill.sourceDocumentId)))[0] ?? null
    : null;

  return (
    <AppShell
      title={template.name}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={libraryHref({ library: "forms", folderId: template.folderId })}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Back to Forms
          </Link>
          <Link href={`/forms/${template.slug}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Quote Sheet fill
          </Link>
        </div>
      }
    >

      {notice === "scan-suggested" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Suggested fields applied. Edit anything that looks wrong.
        </p>
      ) : null}
      {notice === "esign-fill-sent" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          DocuSign sandbox envelope created. Check the signer inbox, then open{" "}
          <Link href="/esign" className="text-primary hover:underline">
            E-sign
          </Link>
          .
        </p>
      ) : null}
      {notice === "esign-fill-error" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Sandbox is connected but envelope send failed. Local envelope kept. Recheck Integration
          Key scopes or use the in-desk test path.
        </p>
      ) : null}
      {notice === "esign-need-confirm" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Check the confirm box before sending.
        </p>
      ) : null}
      <p className="mb-4 text-sm text-muted-foreground">
        {template.family} · {template.line}. {template.summary}
      </p>
      <FillWorkspace
        slug={template.slug}
        fillId={fill?.id ?? null}
        fields={template.fields}
        values={fill?.values ?? {}}
        sourceText={fill?.sourceText ?? ""}
        sourceDocumentId={sourceDoc?.id ?? null}
        sourceFilename={sourceDoc?.filename ?? null}
      />
      <div className="mt-4">
        <FillEsignPanel
          slug={template.slug}
          fillId={fill?.id ?? null}
          fields={template.fields}
          values={fill?.values ?? {}}
          sourceDocumentId={sourceDoc?.id ?? null}
          docusignReady={docusign.ready}
          docusignLabel={docusign.label}
        />
      </div>
    </AppShell>
  );
}
