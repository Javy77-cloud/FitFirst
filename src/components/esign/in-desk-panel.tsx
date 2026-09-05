import Link from "next/link";
import { requestInDeskSamplePacket, requestInDeskSignature } from "@/app/actions/in-desk-esign";
import { ChooseFiles } from "@/components/choose-files";
import { InDeskEsignBanner } from "@/components/esign/in-desk-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Document, SignatureEnvelope } from "@/lib/db/schema";
import {
  formatInDeskEsignList,
  formatInDeskEsignTimestamp,
  inDeskEsignStatusLabel,
  inDeskSignHref,
  isSignablePacket,
  parseInDeskEsignStatus,
} from "@/lib/esign/in-desk";
import { filePreviewHref } from "@/lib/files/urls";
import { cn } from "@/lib/utils";

export function InDeskEsignPanel({
  recordKind,
  recordId,
  riskId,
  partyName,
  status,
  requestedAt,
  signedAt,
  signerName,
  docs,
  envelope,
  notice,
}: {
  recordKind: "deal" | "policy";
  recordId: string;
  riskId?: string | null;
  partyName: string;
  status: string | null;
  requestedAt: Date | null;
  signedAt: Date | null;
  signerName: string | null;
  docs: Document[];
  envelope: SignatureEnvelope | null;
  notice?: string;
}) {
  const packets = docs.filter(isSignablePacket);
  const parsed = parseInDeskEsignStatus(status);

  return (
    <section className="ff-card p-4">
      <h3 className="mb-1 text-base font-semibold text-navy">In-desk signature</h3>
      <InDeskEsignBanner>
        Upload or pick a PDF packet, request a signature, then the client or an agent demo draws
        or types a name. Status and timestamp live on this {recordKind}. Finish-line DocuSign
        stays parked.
      </InDeskEsignBanner>
      {notice === "esign-requested" ? (
        <p className="mb-3 rounded-md border border-border px-3 py-2 text-sm">
          Signature requested. Open the client link or run the agent demo.
        </p>
      ) : null}
      {notice === "esign-need-packet" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Choose an existing PDF or upload one before requesting a signature.
        </p>
      ) : null}

      <p className="mb-3 text-sm">
        <span className="font-medium">{inDeskEsignStatusLabel(parsed)}</span>
        {parsed === "signed" && signedAt ? (
          <span className="text-muted-foreground"> · {formatInDeskEsignTimestamp(signedAt)}</span>
        ) : parsed === "requested" && requestedAt ? (
          <span className="text-muted-foreground"> · {formatInDeskEsignTimestamp(requestedAt)}</span>
        ) : null}
        {signerName ? <span className="text-muted-foreground"> · {signerName}</span> : null}
      </p>
      <p className="sr-only">{formatInDeskEsignList(status, signedAt, requestedAt)}</p>

      {envelope?.publicToken ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <Link
            href={inDeskSignHref(envelope.publicToken, "agent_demo")}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Open agent demo
          </Link>
          <Link
            href={inDeskSignHref(envelope.publicToken)}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Client sign link
          </Link>
        </div>
      ) : null}

      <form action={requestInDeskSignature} className="space-y-3 rounded-md border border-border p-3">
        <input type="hidden" name="recordKind" value={recordKind} />
        <input type="hidden" name="recordId" value={recordId} />
        {riskId ? <input type="hidden" name="riskId" value={riskId} /> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${recordKind}-esign-doc`}>Select a packet</Label>
            <select
              id={`${recordKind}-esign-doc`}
              name="documentId"
              className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue=""
            >
              <option value="">Upload or create a sample</option>
              {packets.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`${recordKind}-esign-name`}>Signer name</Label>
            <Input
              id={`${recordKind}-esign-name`}
              name="signerName"
              defaultValue={partyName}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>Upload a PDF packet</Label>
          <ChooseFiles name="file" accept="application/pdf,.pdf" className="mt-1" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            Request signature
          </Button>
          <Button type="submit" size="sm" variant="outline" formAction={requestInDeskSamplePacket}>
            Create sample packet + request
          </Button>
        </div>
      </form>

      {packets.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {packets.slice(0, 6).map((doc) => (
            <li key={doc.id}>
              <Link href={filePreviewHref(doc.id)} className="text-primary hover:underline">
                {doc.filename}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No packet on this {recordKind} yet. Upload a PDF or create the sample packet.
        </p>
      )}
    </section>
  );
}
