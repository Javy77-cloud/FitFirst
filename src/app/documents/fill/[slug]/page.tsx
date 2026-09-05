import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FillWorkspace } from "@/components/documents/fill-workspace";
import { buttonVariants } from "@/components/ui/button";
import { getFormFill, getFormTemplate, latestFormFill } from "@/lib/db/queries";
import { libraryHref } from "@/lib/documents/library";
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
  const fill = fillId ? await getFormFill(fillId) : await latestFormFill(template.id);

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
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Fillable form. Field map is the template schema. Scan &amp; suggest is not live OCR.
        Quote Sheet fill still lives on /forms/[slug].
      </p>
      {notice === "scan-suggested" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Suggested fields applied. Edit anything that looks wrong.
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
      />
    </AppShell>
  );
}
