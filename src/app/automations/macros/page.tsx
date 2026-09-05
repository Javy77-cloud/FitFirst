import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { DEV_HUB_MODULE_LABEL, MODULE_LIST_HREF, isDevHubModule } from "@/lib/developer-hub/types";
import { listDeskMacros } from "@/lib/db/developer-hub-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AutomationsMacrosPage() {
  const session = await requireSignedIn();
  const macros = await listDeskMacros();

  return (
    <AppShell
      title="Macros"
      actions={
        session.isAdmin ? (
          <Link
            href="/settings/developer-hub/macros/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            New macro
          </Link>
        ) : null
      }
    >
      <AutomationsModuleNav />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Manual only — not workflows and never scheduled. Check rows on Leads, Contacts, Deals,
        Policies, or Tasks, then <strong>Run Macro</strong>. Ana Dib is skipped. Admin CRUD also
        lives under Settings → Developer Hub.
      </p>
      <section className="ff-card overflow-hidden">
        {macros.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No macros yet. Admin can create one in Developer Hub.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Module</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {macros.map((macro) => {
                const href = isDevHubModule(macro.module) ? MODULE_LIST_HREF[macro.module] : "/leads";
                return (
                  <tr key={macro.id}>
                    <td>
                      {session.isAdmin ? (
                        <Link
                          href={`/settings/developer-hub/macros/${macro.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {macro.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-navy">{macro.name}</span>
                      )}
                      {macro.description ? (
                        <div className="text-xs text-muted-foreground">{macro.description}</div>
                      ) : null}
                    </td>
                    <td>
                      {isDevHubModule(macro.module)
                        ? DEV_HUB_MODULE_LABEL[macro.module]
                        : macro.module}
                    </td>
                    <td>{macro.enabled ? "on" : "off"}</td>
                    <td>
                      <Link href={href} className="text-sm text-primary hover:underline">
                        Run on list
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
