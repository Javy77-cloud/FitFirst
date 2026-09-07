import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { getNavLink } from "@/lib/desk/nav-catalog";
import { OPERATIONS_NAV_IDS } from "@/lib/desk/nav-layout";

export const dynamic = "force-dynamic";

export default async function OperationsHubPage() {
  await requireAdminPage();
  const links = OPERATIONS_NAV_IDS.map((id) => getNavLink(id)).filter(
    (link): link is NonNullable<typeof link> => Boolean(link),
  );

  return (
    <AppShell title="Operations">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Agency operations. Agents never see this folder.
      </p>
      <ul className="space-y-2">
        <li>
          <Link href="/admin/operations/carrier-history" className="text-sm text-primary hover:underline">
            Carrier history
          </Link>
          <p className="text-helper text-muted-foreground">
            Admin only. Last pull, fields captured, confidence, and correction rules.
          </p>
        </li>
        {links.map((link) => (
          <li key={link.id}>
            <Link href={link.href} className="text-sm text-primary hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
