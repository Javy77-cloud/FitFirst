import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SignedRetrievalDesk } from "@/components/esign/signed-retrieval-desk";
import { buttonVariants } from "@/components/ui/button";
import { listSignedRetrievalRows } from "@/lib/esign/retrieval-store";
import { docusignSandboxIdentity } from "@/lib/integrations/docusign-envelopes";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SignedDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const filters = {
    q: typeof query.q === "string" ? query.q : "",
    status: typeof query.status === "string" ? query.status : "",
    form: typeof query.form === "string" ? query.form : "",
  };
  const [rows, docusign] = await Promise.all([
    listSignedRetrievalRows(filters),
    docusignSandboxIdentity(),
  ]);

  return (
    <AppShell
      title="Signed documents"
      actions={
        <Link href="/documents" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Send a form
        </Link>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Agency-wide DocuSign and in-desk envelopes sent through FitFirst. Search a client or signer,
        filter by status or form, download the signed PDF when the vendor has it, and jump back to
        the deal or policy when a carrier asks for a copy.
      </p>
      <p className="mb-4 text-xs text-navy">
        {docusign.ready
          ? `DocuSign sandbox connected${docusign.label ? ` · ${docusign.label}` : ""}. Completed envelopes download the combined signed PDF.`
          : "DocuSign sandbox is not connected. In-desk envelopes and filled packets still appear here."}{" "}
        {rows.length} envelope{rows.length === 1 ? "" : "s"} shown.
      </p>
      <SignedRetrievalDesk rows={rows} filters={filters} />
    </AppShell>
  );
}
