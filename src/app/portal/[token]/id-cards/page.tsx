import Link from "next/link";
import { notFound } from "next/navigation";
import { IdCardStubView } from "@/components/portal/id-card-stub";
import { PortalShell } from "@/components/portal/portal-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildIdCardStub } from "@/lib/portal/id-card";
import { portalHref, resolvePortalToken } from "@/lib/portal/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalIdCardsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolvePortalToken(decodeURIComponent(token));
  if (!resolved.ok) notFound();
  const session = resolved.session;

  return (
    <PortalShell session={session} title="ID cards">
      <p className="mb-4 text-sm text-muted-foreground">
        Wallet stub from the in-force policy. Download uses the issued policy-file
        when one is on the record. This is not a carrier portal download.
      </p>
      {session.policies.length === 0 ? (
        <p className="ff-card px-4 py-6 text-sm text-muted-foreground">
          No policies on this link, so there is no ID card to show.
        </p>
      ) : (
        <div className="space-y-6">
          {session.policies.map(({ policy, carrierName, idCards }) => {
            const file = idCards[0] ?? null;
            const card = buildIdCardStub({
              policy,
              insuredName: session.partyName,
              carrierName,
              brand: session.brand,
              documentId: file?.id,
              filename: file?.filename,
            });
            const downloadHref = file
              ? `/api/portal/${encodeURIComponent(session.token.token)}/files/${file.id}?download=1`
              : null;
            return (
              <div key={policy.id} className="space-y-3">
                <IdCardStubView card={card} />
                <div className="flex flex-wrap gap-2">
                  {downloadHref ? (
                    <a
                      href={downloadHref}
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      Download {file?.filename ?? "ID card"}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No issued ID file on this policy yet. The stub above is the
                      desk preview.
                    </p>
                  )}
                  <Link
                    href={portalHref(session.token.token, "changes")}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    Request a policy change
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
