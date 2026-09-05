import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { listDeskMacroRuns, listDeskMacros } from "@/lib/db/developer-hub-queries";
import { formatMacroModules } from "@/lib/developer-hub/macros";
import { isDevHubModule, MODULE_LIST_HREF } from "@/lib/developer-hub/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MacrosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const query = await searchParams;
  const [macros, runs] = await Promise.all([listDeskMacros(), listDeskMacroRuns()]);

  return (
    <AppShell
      title="Macros"
      actions={
        session.isAdmin ? (
          <Link href="/settings/developer-hub/macros/new" className={cn(buttonVariants())}>
            New macro
          </Link>
        ) : null
      }
    >
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Manual only — not workflows and never scheduled. Same <code>desk_macros</code> rows as
        Settings → Automations &amp; Developer → Macros. Configure every run surface there
        (Leads, Deals / Pipeline, Contacts, Businesses, Policies, Campaigns, Tasks, Quotes).
        Check rows, then <strong>Run Macro</strong>. Leads also has <strong>Run Follow-up Macro</strong>.
        Macros run on the records you pick.
      </p>
      <section className="ff-card overflow-hidden">
        {macros.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No macros yet. Admin can create one in Developer Hub.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Modules</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Run on list</th>
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
                      <td>{formatMacroModules(macro.module, macro.modules)}</td>
                      <td>{macro.kind === "follow_up" ? "follow-up" : "standard"}</td>
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
          </div>
        )}
      </section>
      <section className="ff-card mt-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">Recent runs</div>
        {runs.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No manual runs yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {runs.slice(0, 8).map((run) => (
              <li key={run.id} className="px-4 py-2 text-sm">
                <span className="text-navy">{run.summary}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {run.ranAt.toISOString().replace("T", " ").slice(0, 16)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
