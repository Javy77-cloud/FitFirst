import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CertificateStub } from "@/components/certificates/coi-stub";
import { PrintCertificateButton } from "@/components/certificates/print-button";
import { buttonVariants } from "@/components/ui/button";
import { getIssuedCertificate } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CertificatePreviewPage({
  params,
}: {
  params: Promise<{ id: string; certId: string }>;
}) {
  const { id, certId } = await params;
  const workspace = await getIssuedCertificate(id, certId);
  if (!workspace) notFound();

  return (
    <AppShell
      title={workspace.certificate.certificateNumber}
      eyebrow="Certificate preview"
      actions={
        <div className="ff-no-print flex items-center gap-2">
          <Link
            href={`/businesses/${workspace.business.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to {workspace.business.dba ?? workspace.business.name}
          </Link>
          <PrintCertificateButton />
        </div>
      }
    >
      <p className="ff-no-print mb-4 max-w-3xl text-sm text-muted-foreground">
        Printable Certificate of Insurance stub. Use the browser print dialog. This is not a
        licensed ACORD form and is not sent by email.
      </p>
      <CertificateStub business={workspace.business} certificate={workspace.certificate} />
    </AppShell>
  );
}
