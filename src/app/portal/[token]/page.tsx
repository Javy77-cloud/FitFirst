import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { buttonVariants } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { portalHref, resolvePortalToken } from "@/lib/portal/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolvePortalToken(decodeURIComponent(token));
  if (!resolved.ok) notFound();
  const session = resolved.session;

  return (
    <PortalShell session={session} title={`Hello, ${session.partyName}`}>
      <p className="mb-4 text-sm text-muted-foreground">
        Self-serve stubs for {session.brand.agencyName}. Download an ID card,
        request a certificate, or send a policy change. The desk sees the full
        request on the work queue — nothing is retyped, and nothing emails.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={portalHref(session.token.token, "id-cards")} className="ff-card p-4">
          <h3 className="font-semibold text-navy">ID cards</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            View or download the wallet stub for each in-force policy.
          </p>
        </Link>
        <Link href={portalHref(session.token.token, "coi")} className="ff-card p-4">
          <h3 className="font-semibold text-navy">Certificates</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.certificates.length > 0
              ? `${session.certificates.length} issued stub${session.certificates.length === 1 ? "" : "s"} — reuse before requesting a new one.`
              : session.canRequestCoi
                ? "Request a COI for a holder. Issued stubs reuse when the holder already exists."
                : "COI stubs need an in-force GL or WC on a Business."}
          </p>
        </Link>
        <Link href={portalHref(session.token.token, "changes")} className="ff-card p-4">
          <h3 className="font-semibold text-navy">Policy change</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Endorsement, cancellation, or non-renewal — queued without rekey.
          </p>
        </Link>
      </div>

      <section className="ff-card mt-6 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Your policies
        </div>
        {session.policies.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No in-force policies on this link. Ask the agency if this is the wrong code.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {session.policies.map(({ policy, carrierName }) => (
              <li key={policy.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-navy">{policy.policyNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {carrierName} · {policy.status.replaceAll("_", " ")} ·{" "}
                    {formatDay(policy.effectiveDate)}–{formatDay(policy.expirationDate)}
                  </p>
                </div>
                <Link
                  href={portalHref(session.token.token, "changes")}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                >
                  Request a change
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalShell>
  );
}
