import { AppShell } from "@/components/app-shell";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function BookOfLifePage() {
  await requireAdminPage();
  return (
    <AppShell title="Book of Life" eyebrow="Operations">
      <p className="text-sm text-muted-foreground">No Life book rollup on this desk yet.</p>
    </AppShell>
  );
}
