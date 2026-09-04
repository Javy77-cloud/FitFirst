import Link from "next/link";
import { notFound } from "next/navigation";
import { requestPortalCoi } from "@/app/actions/portal";
import { PortalShell } from "@/components/portal/portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { portalHref, resolvePortalToken } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalCoiPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; queued?: string; reused?: string }>;
}) {
  const { token } = await params;
  const { error, queued } = await searchParams;
  const resolved = await resolvePortalToken(decodeURIComponent(token));
  if (!resolved.ok) notFound();
  const session = resolved.session;

  return (
    <PortalShell session={session} title="Certificate of Insurance">
      <p className="mb-4 text-sm text-muted-foreground">
        Issued stubs stay on the Business. If you ask for a holder that already
        has a stub, we open that preview instead of creating a second request.
        New holders go to the agency work queue with the holder fields filled in.
      </p>

      {queued ? (
        <p className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-fit-green">
          Request received. The desk already has the holder name, address, and job
          location — they will not retype it.
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red" role="alert">
          {error}
        </p>
      ) : null}

      <section className="ff-card mb-6 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Issued stubs
        </div>
        {session.certificates.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {session.canRequestCoi
              ? "No certificate stub on this Business yet."
              : "COI stubs are for a Business with an in-force GL or WC policy. Personal HO ID cards live under ID cards."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {session.certificates.map((cert) => (
              <li key={cert.id} className="px-4 py-3 text-sm">
                <Link
                  href={portalHref(session.token.token, `coi/${cert.id}`)}
                  className="font-medium text-primary hover:underline"
                >
                  {cert.certificateNumber}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">
                  {cert.holderName}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ff-card p-4">
        <h3 className="text-sm font-semibold text-navy">Request a certificate</h3>
        {session.canRequestCoi ? (
          <form action={requestPortalCoi} className="mt-3 space-y-3">
            <input type="hidden" name="token" value={session.token.token} />
            <div>
              <Label htmlFor="holderName" className="text-xs">
                Certificate holder
              </Label>
              <Input
                id="holderName"
                name="holderName"
                required
                placeholder="General contractor, owner, or additional interest"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="holderAddress" className="text-xs">
                Holder address
              </Label>
              <Textarea
                id="holderAddress"
                name="holderAddress"
                required
                placeholder="Street, city, state, ZIP"
                className="mt-1 min-h-20"
              />
            </div>
            <div>
              <Label htmlFor="jobLocation" className="text-xs">
                Job / location <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="jobLocation"
                name="jobLocation"
                placeholder="Job site or project name"
                className="mt-1"
              />
            </div>
            <Button type="submit" size="sm">
              Submit COI request
            </Button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            This link has no certifiable GL or WC line. Use Harbor Key Marine LLC
            for the commercial COI stub, or open ID cards for a personal policy.
          </p>
        )}
      </section>
    </PortalShell>
  );
}
