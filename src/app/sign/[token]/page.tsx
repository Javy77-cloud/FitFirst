import { notFound } from "next/navigation";
import { InDeskEsignBanner } from "@/components/esign/in-desk-banner";
import { SignaturePad } from "@/components/esign/signature-pad";
import { PortalShell } from "@/components/portal/portal-shell";
import { AGENCY_BRAND } from "@/lib/domain";
import { getInDeskEnvelopeByToken } from "@/lib/db/queries";
import { type InDeskSignerRole } from "@/lib/esign/in-desk";

export const dynamic = "force-dynamic";

export default async function InDeskSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ role?: string; notice?: string }>;
}) {
  const { token } = await params;
  const { role } = await searchParams;
  const row = await getInDeskEnvelopeByToken(decodeURIComponent(token));
  if (!row) notFound();
  const brand = { agencyName: AGENCY_BRAND.name, phone: AGENCY_BRAND.phone };
  const signerRole: InDeskSignerRole = role === "agent_demo" ? "agent_demo" : "client";
  const signed = row.envelope.status === "signed";

  return (
    <PortalShell brand={brand} title="Sign this packet">
      <InDeskEsignBanner />
      <p className="mb-3 text-sm">
        <span className="font-medium">{row.document.filename}</span>
        {row.envelope.signerName ? (
          <span className="text-muted-foreground"> · requested for {row.envelope.signerName}</span>
        ) : null}
      </p>
      <div className="mb-4 overflow-hidden rounded-md border border-border bg-card">
        <iframe
          title={row.document.filename}
          src={`/api/sign/${encodeURIComponent(token)}/file`}
          className="h-[28rem] w-full"
        />
      </div>
      {signed ? null : (
        <SignaturePad
          token={token}
          role={signerRole}
          defaultName={row.envelope.signerName ?? ""}
        />
      )}
    </PortalShell>
  );
}
