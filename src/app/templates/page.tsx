import { AppShell } from "@/components/app-shell";
import { TemplatesHub } from "@/components/templates/templates-hub";
import { requireSignedIn } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function TemplatesHubPage() {
  await requireSignedIn();
  return (
    <AppShell title="Templates" eyebrow="Library">

      <TemplatesHub />
    </AppShell>
  );
}
