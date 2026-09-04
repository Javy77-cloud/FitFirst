import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificateStub } from "@/components/certificates/coi-stub";
import { PrintCertificateButton } from "@/components/certificates/print-button";
import { PortalShell } from "@/components/portal/portal-shell";
import { buttonVariants } from "@/components/ui/button";
import { portalHref, resolvePortalToken } from "@/lib/portal/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; certId: string }>;
  searchParams: Promise<{ reused?: string }>;
}) {
  const { token, certId } = await params;
  const { reused } = await searchParams;
  const resolved = await resolvePortalToken(decodeURIComponent(token));
  if (!resolved.ok || !resolved.session.account) notFound();
  const certificate = resolved.session.certificates.find((row) => row.id === certId);
  if (!certificate) notFound();

  return (
    <PortalShell
      session={resolved.session}
      title={certificate.certificateNumber}
    >
      {reused ? (
        <p className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-fit-green">
          That holder already has a stub. Reusing {certificate.certificateNumber} —
          no second request was queued.
        </p>
      ) : null}
      <div className="ff-no-print mb-4 flex flex-wrap gap-2">
        <Link
          href={portalHref(resolved.session.token.token, "coi")}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to certificates
        </Link>
        <PrintCertificateButton />
      </div>
      <CertificateStub business={resolved.session.account} certificate={certificate} />
    </PortalShell>
  );
}
