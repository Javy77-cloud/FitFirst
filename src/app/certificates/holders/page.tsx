import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { certificateFlagLabels } from "@/lib/ams/certificate-holders";
import { ACORD_STUB_DISCLAIMER } from "@/lib/ams/coi-requests";
import { listCertificateHolders } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function CertificateHoldersPage() {
  const holders = await listCertificateHolders();

  return (
    <AppShell title="Certificate holders">
      <p className="mb-4 text-base text-muted-foreground">
        Holders and additional insureds already on commercial Policies, plus open and issued COI
        stubs. {ACORD_STUB_DISCLAIMER}
      </p>
      <p className="mb-4 text-sm">
        <Link href="/certificates" className="text-primary hover:underline">
          Back to COI queue
        </Link>
      </p>
      <section className="ff-card overflow-hidden">
        {holders.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No certificate holders on file. Queue a Harbor COI and optionally add the holder as AI.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Holder</th>
                <th>Kind</th>
                <th>Business</th>
                <th>Policies</th>
                <th>Open / issued</th>
                <th>Stub flags</th>
              </tr>
            </thead>
            <tbody>
              {holders.map((row) => (
                <tr key={row.name}>
                  <td className="font-medium">{row.name}</td>
                  <td>{row.kinds.join(" · ") || "—"}</td>
                  <td>{row.accountName ?? "—"}</td>
                  <td>{row.policyNumbers.join(" · ") || "—"}</td>
                  <td>
                    {row.openCoi} open · {row.issuedStubs} issued
                  </td>
                  <td>
                    {certificateFlagLabels(row).join(" · ") || "None on the stub"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
