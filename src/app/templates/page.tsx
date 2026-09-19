import { AppShell } from "@/components/app-shell";
import { TemplatesHub } from "@/components/templates/templates-hub";
import { requireSignedIn } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function TemplatesHubPage() {
  await requireSignedIn();
  return (
    <AppShell title="Templates" eyebrow="Library">
      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        Email and Documents are separate. Signatures are agency-owned. Layout presets stay under Other.
      </p>
      <TemplatesHub />
    </AppShell>
  );
}
