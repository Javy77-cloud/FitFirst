import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DocumentTable } from "@/components/ops/entity-upload";
import { LibraryUpload } from "@/components/ops/library-upload";
import { StubBanner } from "@/components/ops/stub-banner";
import { buttonVariants } from "@/components/ui/button";
import { listDocumentsWithExtracted, listRelatedOptions } from "@/lib/db/ops-queries";
import { CONFIDENCE_THRESHOLD, formatPct } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [{ docs, fields }, related] = await Promise.all([
    listDocumentsWithExtracted(),
    listRelatedOptions(),
  ]);
  const flagged = fields.filter((f) => f.flagged && !f.appliedToRisk);

  return (
    <AppShell
      title="Documents"
      actions={
        <Link href="/esign" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          E-sign envelopes
        </Link>
      }
    >
      <StubBanner>
        Files stay in FitFirst. Extraction confidence flags still apply on deal/risk uploads. No
        Zoho upload.
      </StubBanner>
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="ff-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-navy">Upload</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Attach a dec, wind mit, 4-point, photo, or signed app to a contact, deal, or policy.
          </p>
          <LibraryUpload related={related} />
        </section>
        <section className="space-y-4">
          <div className="ff-card overflow-hidden p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy">Library</h2>
            <DocumentTable docs={docs} returnTo="/documents" />
          </div>
          <div className="ff-card overflow-hidden p-4">
            <h2 className="mb-1 text-sm font-semibold text-navy">Confidence flags</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Fields under {Math.round(CONFIDENCE_THRESHOLD * 100)}% stay off the worksheet until
              accepted on the deal.
            </p>
            {flagged.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flagged extractions.</p>
            ) : (
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Raw</th>
                    <th>Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {flagged.map((field) => (
                    <tr key={field.id} className="bg-fit-flag-bg/40">
                      <td>{field.fieldKey.replaceAll("_", " ")}</td>
                      <td className="font-mono text-[11px]">{field.rawValue}</td>
                      <td className="font-semibold text-fit-flag">{formatPct(Number(field.confidence))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
