import Link from "next/link";
import { markEnvelopeSigned } from "@/app/actions/esign";
import { AppShell } from "@/components/app-shell";
import { Notice, StubBanner } from "@/components/ops/stub-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { listDocumentsWithExtracted, listEnvelopes } from "@/lib/db/ops-queries";
import { SendForSignature } from "@/components/ops/entity-upload";
import { ESIGN_PROVIDER_LABELS } from "@/lib/integrations/esign";
import type { EsignProvider } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EsignPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const [{ docs }, envelopes] = await Promise.all([listDocumentsWithExtracted(), listEnvelopes()]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;

  return (
    <AppShell
      title="E-sign"
      actions={
        <Link href="/documents" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Document library
        </Link>
      }
    >
      <Notice code={notice} />
      <StubBanner>
        Provider interface only (DocuSign, Dropbox Sign, Zoho Sign). Send returns not_implemented.
        Status is tracked in FitFirst as draft / sent / signed. No credentials, no outbound call.
      </StubBanner>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card overflow-hidden p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Send a document</h2>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Upload a file on Documents, a deal, a contact, or a policy first.
            </p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-medium">{doc.filename}</td>
                    <td>
                      <SendForSignature document={doc} returnTo="/esign" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="ff-card overflow-hidden p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Envelopes</h2>
          {envelopes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No envelopes. Send a document for signature.</p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {envelopes.map(({ envelope, document }) => (
                  <tr key={envelope.id}>
                    <td>
                      <div className="font-medium">{document.filename}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {envelope.signerName ?? "No signer"} · {envelope.lastProviderResult ?? "—"}
                      </div>
                    </td>
                    <td>{ESIGN_PROVIDER_LABELS[envelope.provider as EsignProvider] ?? envelope.provider}</td>
                    <td className="capitalize">{envelope.status}</td>
                    <td>
                      {envelope.status !== "signed" ? (
                        <form action={markEnvelopeSigned}>
                          <input type="hidden" name="id" value={envelope.id} />
                          <Button type="submit" size="xs" variant="outline">
                            Mark signed
                          </Button>
                        </form>
                      ) : (
                        <span className="text-[11px] text-fit-green">Signed in-app</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
