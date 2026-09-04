import Link from "next/link";
import type { PortalSession } from "@/lib/portal/session";
import { portalHref } from "@/lib/portal/session";

export function PortalShell({
  session,
  brand: brandProp,
  title,
  children,
}: {
  session?: PortalSession | null;
  brand?: { agencyName: string; phone: string };
  title: string;
  children: React.ReactNode;
}) {
  const brand = brandProp ?? session?.brand ?? { agencyName: "Agency", phone: "" };
  const token = session?.token.token;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Client portal
            </p>
            <h1 className="text-xl font-semibold text-navy">{brand.agencyName}</h1>
            {brand.phone ? (
              <p className="text-sm text-muted-foreground">{brand.phone}</p>
            ) : null}
          </div>
          {token ? (
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link href={portalHref(token)} className="text-primary hover:underline">
                Home
              </Link>
              <Link href={portalHref(token, "id-cards")} className="text-primary hover:underline">
                ID cards
              </Link>
              <Link href={portalHref(token, "coi")} className="text-primary hover:underline">
                Certificates
              </Link>
              <Link href={portalHref(token, "changes")} className="text-primary hover:underline">
                Policy change
              </Link>
            </nav>
          ) : (
            <p className="text-sm text-muted-foreground">Stub link — no password.</p>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h2 className="mb-4 text-lg font-semibold text-navy">{title}</h2>
        {children}
      </main>
    </div>
  );
}
