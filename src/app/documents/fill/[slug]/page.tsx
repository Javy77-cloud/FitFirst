import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FillWorkspace } from "@/components/documents/fill-workspace";
import { StubBanner } from "@/components/ops/stub-banner";
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
            Back to Forms library
          </Link>
          <Link href={`/forms/${template.slug}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Quote Sheet fill
          </Link>
        </div>
      }
    >
      <StubBanner>
        Fillable stub. Field map is the template schema. Scan &amp; suggest pre-fills demo values —
        not live OCR, not Ana Dib. Quote Sheet fill still lives on the original Forms catalog.
      </StubBanner>
      {notice === "scan-suggested" ? (
        <StubBanner>Suggested fields applied. Pasted lines overrode matching demo keys.</StubBanner>
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
