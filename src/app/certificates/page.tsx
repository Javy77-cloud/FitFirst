import Link from "next/link";
import { advanceCertificateRequest } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { CertificateRequestForm } from "@/components/ams/certificate-request-form";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { RecordLink } from "@/components/record-links";
import { CERTIFICATES_LIST_COLUMNS } from "@/lib/list-columns";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { certificateFlagLabels } from "@/lib/ams/certificate-holders";
import { ACORD_STUB_DISCLAIMER } from "@/lib/ams/coi-requests";
import { certificateRequestStatusLabel } from "@/lib/domain-ams";
import { listAccountInterests, listCertificateQueue, listHolderContacts } from "@/lib/ams/queries";
import { HARBOR_ACCOUNT_ID, HARBOR_POLICY_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [{ requests, issued }, harborInterests, holderContacts] = await Promise.all([
    listCertificateQueue(),
    listAccountInterests(HARBOR_ACCOUNT_ID),
    listHolderContacts("active"),
  ]);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Certificates">
      <p className="mb-4 text-base text-muted-foreground">{ACORD_STUB_DISCLAIMER}</p>
      <p className="mb-4 text-sm">
        <Link href="/certificates/holders" className="text-primary hover:underline">
          Certificate holder directory
        </Link>
      </p>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-navy">COI {notice.replaceAll("_", " ")}.</p>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="ff-card p-4">
          <h2 className="text-base font-semibold text-navy">Queue a request</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Default Business is Harbor Key Marine (active GL). Issue from the queue after the
            holder is on file.
          </p>
          <CertificateRequestForm
            accountId={HARBOR_ACCOUNT_ID}
            policyId={HARBOR_POLICY_ID}
            returnTo="/certificates"
            canRequest
            error={error}
            interests={harborInterests.map(({ interest }) => interest)}
            holderContacts={holderContacts.map(({ contact }) => contact)}
          />
        </section>
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
            Open requests
          </div>
          {requests.filter((row) => row.request.status === "requested").length === 0 ? (
            <p className="px-4 py-6 text-base text-muted-foreground">
              No open COI requests. Issued stubs stay on the Business.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {requests
                .filter((row) => row.request.status === "requested")
                .map(({ request, account }) => (
                  <li key={request.id} className="space-y-2 px-4 py-3">
                    <div className="font-medium text-navy">{request.holderName}</div>
                    <div className="text-sm text-muted-foreground">
                      <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                      {request.jobLocation ? ` · ${request.jobLocation}` : ""}
                      {request.additionalInsured
                        ? ` · AI ${request.additionalInsured}`
                        : ""}
                      {certificateFlagLabels(request).length
                        ? ` · ${certificateFlagLabels(request).join(" · ")}`
                        : ""}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={advanceCertificateRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="action" value="issue" />
                        <Button type="submit" size="sm">
                          Issue stub
                        </Button>
                      </form>
                      <form action={advanceCertificateRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="action" value="withdraw" />
                        <Button type="submit" size="sm" variant="secondary">
                          Withdraw
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Issued stubs
        </div>
        <DeskColumnTable
          moduleId="certificates-issued"
          columns={CERTIFICATES_LIST_COLUMNS}
          empty="No certificate stubs issued yet."
          rows={issued.map(({ certificate, account }) => ({
            key: certificate.id,
            cells: {
              number: account ? (
                <Link
                  href={`/businesses/${account.id}/certificates/${certificate.id}`}
                  className="text-primary hover:underline"
                >
                  {certificate.certificateNumber}
                </Link>
              ) : (
                certificate.certificateNumber
              ),
              holder: certificate.holderName,
              business: account?.name ?? "—",
              issued: formatDay(certificate.issuedAt),
              flags: certificateFlagLabels(certificate).join(" · ") || "—",
            },
          }))}
        />
      </section>

      {requests.some((row) => row.request.status !== "requested") ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Closed requests:{" "}
          {requests
            .filter((row) => row.request.status !== "requested")
            .map((row) => `${row.request.holderName} (${certificateRequestStatusLabel(row.request.status)})`)
            .join(" · ")}
        </p>
      ) : null}
    </AppShell>
  );
}
