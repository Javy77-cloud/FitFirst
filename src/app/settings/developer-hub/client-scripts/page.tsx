import Link from "next/link";
import { HubNotice } from "@/components/developer-hub/hub-notice";
import { SettingsShell } from "@/components/settings/settings-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { DEV_HUB_MODULE_LABEL, isDevHubModule } from "@/lib/developer-hub/types";
import { listDeskScripts } from "@/lib/db/developer-hub-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientScriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdminPage();
  const { notice } = await searchParams;
  const scripts = await listDeskScripts();

  return (
    <SettingsShell
      title="Client Scripts"
      current="dev-scripts"
      actions={
        <Link href="/settings/developer-hub/client-scripts/new" className={cn(buttonVariants())}>
          New script
        </Link>
      }
    >

      <HubNotice notice={notice} />
      <section className="ff-card overflow-hidden">
        {scripts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No client scripts yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Module</th>
                <th>Page</th>
                <th>Event</th>
              </tr>
            </thead>
            <tbody>
              {scripts.map((script) => (
                <tr key={script.id}>
                  <td>
                    <Link
                      href={`/settings/developer-hub/client-scripts/${script.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {script.name}
                    </Link>
                  </td>
                  <td>
                    {isDevHubModule(script.module)
                      ? DEV_HUB_MODULE_LABEL[script.module]
                      : script.module}
                  </td>
                  <td>{script.page}</td>
                  <td>
                    {script.event}
                    {script.fieldName ? ` · ${script.fieldName}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </SettingsShell>
  );
}
