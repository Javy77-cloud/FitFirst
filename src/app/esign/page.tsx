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

      <p className="mb-4 text-xs text-navy">
        {docusign.ready
          ? `DocuSign sandbox connected${docusign.label ? ` · ${docusign.label}` : ""}`
          : "DocuSign sandbox is not connected."}{" "}
        {rows.length} envelope{rows.length === 1 ? "" : "s"} shown.
      </p>
      <SignedRetrievalDesk rows={rows} filters={filters} />
    </AppShell>
  );
}
