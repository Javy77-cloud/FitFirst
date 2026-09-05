import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { currentDeskSession } from "@/lib/auth/session";
import { listCatalogItems } from "@/lib/integrations/catalog-store";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  const [session, items] = await Promise.all([currentDeskSession(), listCatalogItems()]);
  const inboxes = items.filter((item) => item.category === "email");

  return (
    <SettingsShell title="Email" current="email">
      <p className="mb-4 text-sm text-muted-foreground">
        Client mail goes through the agency inbox. Connect Gmail, Outlook, or Yahoo as a stub.
        Templates and signatures are written once for the agency.
      </p>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/settings/email-templates" className="text-primary hover:underline">
          Template library
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/settings/email-signatures" className="text-primary hover:underline">
          Signatures
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/settings/email-triggers" className="text-primary hover:underline">
          Triggers
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {inboxes.map((item) => (
          <IntegrationCard key={item.id} item={item} canEdit={session.isAdmin} />
        ))}
      </div>
    </SettingsShell>
  );
}
