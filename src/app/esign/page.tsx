import Link from "next/link";
import { markEnvelopeSigned } from "@/app/actions/esign";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { StatusBadge } from "@/components/status-badge";
import { ESIGN_LIST_COLUMNS } from "@/lib/list-columns";
import { InDeskEsignBanner } from "@/components/esign/in-desk-banner";
import { Notice } from "@/components/ops/stub-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { listDocumentsWithExtracted, listEnvelopes } from "@/lib/db/ops-queries";
import { SendForSignature } from "@/components/ops/entity-upload";
import { ESIGN_PROVIDER_LABELS } from "@/lib/integrations/esign";
import type { EsignProvider } from "@/lib/domain";
import { IN_DESK_ESIGN_MODE, formatInDeskEsignTimestamp, inDeskSignHref } from "@/lib/esign/in-desk";
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
  const inDesk = envelopes.filter(({ envelope }) => envelope.mode === IN_DESK_ESIGN_MODE);
  const vendor = envelopes.filter(({ envelope }) => envelope.mode !== IN_DESK_ESIGN_MODE);

  return (
    <AppShell
      title="E-sign"
      actions={
        <Link href="/deals" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Open deals
        </Link>
      }
    >
      <Notice code={notice} />
      <InDeskEsignBanner>
        Request a signature on a Deal or Policy, or confirm a filled Documents form. The client or
        an agent can still draw or type a name in-desk. DocuSign sandbox send runs only when
        connected.
      </InDeskEsignBanner>

      <section className="ff-card mb-4 overflow-hidden p-4">
        <h2 className="mb-2 text-sm font-semibold text-navy">In-desk envelopes</h2>
        <DeskColumnTable
          moduleId="esign-in-desk"
          columns={ESIGN_LIST_COLUMNS}
          empty="None yet. Open a Deal Documents tab or a Policy, then Request signature."
          rows={inDesk.map(({ envelope, document }) => ({
            key: envelope.id,
            cells: {
              packet: (
                <>
                  <div className="font-medium">{document.filename}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {envelope.signerName ?? "No signer"}
                    {envelope.signedAt ? ` · ${formatInDeskEsignTimestamp(envelope.signedAt)}` : ""}
                  </div>
                </>
              ),
              record: envelope.policyId ? (
                <Link href={`/policies/${envelope.policyId}`} className="text-primary hover:underline">
                  Policy
                </Link>
              ) : envelope.dealId ? (
                <Link
                  href={`/deals/${envelope.dealId}?tab=documents`}
                  className="text-primary hover:underline"
                >
                  Deal
                </Link>
              ) : (
                "—"
              ),
              status: <StatusBadge status={envelope.status}>{envelope.status}</StatusBadge>,
              actions: envelope.publicToken ? (
                <Link
                  href={inDeskSignHref(envelope.publicToken, "agent_demo")}
                  className={cn(buttonVariants({ size: "xs", variant: "outline" }))}
                >
                  Open to sign
                </Link>
              ) : null,
            },
          }))}
        />
      </section>

      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        DocuSign and Dropbox Sign are not wired. Use in-desk signing on a Deal or Policy.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card overflow-hidden p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Parked vendor send</h2>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Upload a file on Documents, a deal, or a policy first.
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
          <h2 className="mb-2 text-sm font-semibold text-navy">Parked vendor envelopes</h2>
          {vendor.length === 0 ? (
            <p className="text-sm text-muted-foreground">No DocuSign envelopes. Do not connect a paid SDK.</p>
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
                {vendor.map(({ envelope, document }) => (
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
