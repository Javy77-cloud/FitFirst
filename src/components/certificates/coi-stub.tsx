import { formatDay } from "@/lib/domain";
import type { Account, IssuedCertificate } from "@/lib/db/schema";

export function CertificateStub({
  business,
  certificate,
}: {
  business: Account;
  certificate: IssuedCertificate;
}) {
  const street = business.mailingAddress ?? business.primaryAddress1;
  const insuredAddress = [street, [business.city, business.state, business.zip].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join("\n");

  return (
    <article className="ff-coi-page mx-auto max-w-3xl bg-card p-6 text-[13px] text-foreground sm:p-8">
      <header className="border-b-2 border-navy pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Certificate of Insurance
            </p>
            <h1 className="text-xl font-semibold text-navy">Desk stub</h1>
          </div>
          <div className="text-right font-mono text-xs">
            <div className="font-semibold text-navy">{certificate.certificateNumber}</div>
            <div className="text-muted-foreground">Issued {formatDay(certificate.issuedAt)}</div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Not a licensed ACORD product. This stub does not amend, extend, or alter the policies
          listed. It is a desk preview for holder name, address, optional job/location, and
          in-force GL / WC lines.
        </p>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <section className="rounded-md border border-border p-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Producer
          </h2>
          <p className="mt-1 font-medium text-navy">{certificate.producerName ?? "FitFirst"}</p>
          <p className="text-muted-foreground">Florida P&amp;C desk · certificate stub</p>
        </section>
        <section className="rounded-md border border-border p-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Named insured
          </h2>
          <p className="mt-1 font-medium text-navy">{business.name}</p>
          {business.dba ? <p className="text-muted-foreground">DBA {business.dba}</p> : null}
          <p className="whitespace-pre-line text-muted-foreground">{insuredAddress}</p>
        </section>
      </div>

      <section className="mt-4">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Coverages from in-force policies
        </h2>
        {certificate.lines.length === 0 ? (
          <p className="rounded-md border border-border px-3 py-4 text-muted-foreground">
            No in-force GL or WC lines were listed on this stub.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Carrier</th>
                  <th>Policy</th>
                  <th>Effective</th>
                  <th>Expires</th>
                  <th>Limits</th>
                </tr>
              </thead>
              <tbody>
                {certificate.lines.map((line) => (
                  <tr key={`${line.policyId}-${line.lineOfBusiness}`}>
                    <td className="font-medium">{line.lineLabel}</td>
                    <td>{line.carrierName}</td>
                    <td className="font-mono text-xs">{line.policyNumber}</td>
                    <td>{line.effectiveDate}</td>
                    <td>{line.expirationDate}</td>
                    <td>
                      {line.limits.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="space-y-0.5">
                          {line.limits.map((limit) => (
                            <li key={limit.key}>
                              <span className="text-muted-foreground">{limit.label}: </span>
                              {limit.value}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <section className="rounded-md border border-border p-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Certificate holder
          </h2>
          <p className="mt-1 font-medium text-navy">{certificate.holderName}</p>
          <p className="whitespace-pre-line text-muted-foreground">{certificate.holderAddress}</p>
        </section>
        <section className="rounded-md border border-border p-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Job / location
          </h2>
          {certificate.jobLocation ? (
            <p className="mt-1">{certificate.jobLocation}</p>
          ) : (
            <p className="mt-1 text-muted-foreground">None listed.</p>
          )}
        </section>
      </div>

      <footer className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <p>
          If any of the described policies are cancelled before the expiration date, notice may be
          delivered in accordance with the policy terms. This desk stub is not evidence that notice
          was sent. No signature, e-sign envelope, or paid certificate vendor is attached.
        </p>
      </footer>
    </article>
  );
}
