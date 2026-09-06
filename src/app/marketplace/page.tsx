import { AppShell } from "@/components/app-shell";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  await requireAdminPage();
  return (
    <AppShell title="Marketplace" eyebrow="Operations">
      <p className="text-sm text-muted-foreground">No Marketplace desk on this route yet.</p>
    </AppShell>
  );
}
