import Link from "next/link";
import { HubNotice } from "@/components/developer-hub/hub-notice";
import { SettingsShell } from "@/components/settings/settings-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatMacroModules } from "@/lib/developer-hub/macros";
import { listDeskMacros } from "@/lib/db/developer-hub-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MacrosPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdminPage();
  const { notice } = await searchParams;
  const macros = await listDeskMacros();

  return (
    <SettingsShell
      title="Macros"
      current="macros"
      actions={
        <Link href="/settings/developer-hub/macros/new" className={cn(buttonVariants())}>
          New macro
        </Link>
      }
    >

      <HubNotice notice={notice} />
      <section className="ff-card overflow-hidden">
        {macros.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No macros yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Modules</th>
                <th>Kind</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {macros.map((macro) => (
                <tr key={macro.id}>
                  <td>
                    <Link
                      href={`/settings/developer-hub/macros/${macro.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {macro.name}
                    </Link>
                    {macro.description ? (
                      <div className="text-xs text-muted-foreground">{macro.description}</div>
                    ) : null}
                  </td>
                  <td>{formatMacroModules(macro.module, macro.modules)}</td>
                  <td>{macro.kind === "follow_up" ? "follow-up" : "standard"}</td>
                  <td>{macro.enabled ? "on" : "off"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </SettingsShell>
  );
}
