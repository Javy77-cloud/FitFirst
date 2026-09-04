import Link from "next/link";
import { openPortalLink } from "@/app/actions/portal";
import { PortalShell } from "@/components/portal/portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ELENA_PORTAL_TOKEN, HARBOR_PORTAL_TOKEN } from "@/lib/fixtures/ids";
import { loadPortalBrand, portalHref } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const brand = await loadPortalBrand();

  return (
    <PortalShell brand={brand} title="Open your self-serve link">
      <div className="ff-card space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          {brand.agencyName} sent you a stub portal link. Paste the code from that
          message — there is no password on this slice. Requests go to the agency
          work queue so staff do not retype holder or change details.
        </p>
        {error ? (
          <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red" role="alert">
            {error}
          </p>
        ) : null}
        <form action={openPortalLink} className="space-y-3">
          <div>
            <Label htmlFor="token">Portal code</Label>
            <Input
              id="token"
              name="token"
              required
              placeholder="elena-ruiz-2026"
              className="mt-1 font-mono"
              autoComplete="off"
            />
          </div>
          <Button type="submit">Open portal</Button>
        </form>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href={portalHref(ELENA_PORTAL_TOKEN)}
          className="ff-card block p-4 hover:border-navy"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Personal stub
          </p>
          <h3 className="mt-1 font-semibold text-navy">Elena Ruiz</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ID card for HO3-ELENA-2026 and a policy-change request. Ana is not on
            this portal.
          </p>
        </Link>
        <Link
          href={portalHref(HARBOR_PORTAL_TOKEN)}
          className="ff-card block p-4 hover:border-navy"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Commercial stub
          </p>
          <h3 className="mt-1 font-semibold text-navy">Harbor Key Marine LLC</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Reuse COI-20260820-0001 or request a new certificate. Change requests
            queue on GL-HARBOR-2026.
          </p>
        </Link>
      </section>
    </PortalShell>
  );
}
