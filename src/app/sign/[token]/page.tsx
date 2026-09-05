import { notFound } from "next/navigation";
import { InDeskEsignBanner } from "@/components/esign/in-desk-banner";
import { SignaturePad } from "@/components/esign/signature-pad";
import { PortalShell } from "@/components/portal/portal-shell";
import { AGENCY_BRAND } from "@/lib/domain";
import { getInDeskEnvelopeByToken } from "@/lib/db/queries";
import { formatInDeskEsignTimestamp, type InDeskSignerRole } from "@/lib/esign/in-desk";

export const dynamic = "force-dynamic";

export default async function InDeskSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ role?: string; notice?: string }>;
}) {
  const { token } = await params;
  const { role, notice } = await searchParams;
  const row = await getInDeskEnvelopeByToken(decodeURIComponent(token));
  if (!row) notFound();
  const brand = { agencyName: AGENCY_BRAND.name, phone: AGENCY_BRAND.phone };
  const signerRole: InDeskSignerRole = role === "agent_demo" ? "agent_demo" : "client";
  const signed = row.envelope.status === "signed";

  return (
    <PortalShell brand={brand} title="Sign this packet">
      <InDeskEsignBanner>
        {signerRole === "agent_demo"
          ? "Agent demo. Same in-desk mark as a client link. DocuSign is not called."
          : "Client link. Draw or type the name, then mark Signed. DocuSign is not called."}
      </InDeskEsignBanner>
      {notice === "esign-invalid" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Type the legal name. If you chose draw, leave a mark on the pad.
        </p>
      ) : null}
      {notice === "esign-signed" || signed ? (
        <p className="mb-3 rounded-md border border-border bg-fit-green-bg px-3 py-2 text-sm text-fit-green">
          Signed in-app
          {row.envelope.signedAt ? ` · ${formatInDeskEsignTimestamp(row.envelope.signedAt)}` : ""}.
          Status is stored on the deal or policy. This is not a DocuSign envelope.
        </p>
      ) : null}
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
