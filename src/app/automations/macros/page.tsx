import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { listDeskMacroRuns, listDeskMacros } from "@/lib/db/developer-hub-queries";
import { DEV_HUB_MODULE_LABEL, isDevHubModule, MODULE_LIST_HREF } from "@/lib/developer-hub/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MacrosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSignedIn();
  const query = await searchParams;
  const [macros, runs] = await Promise.all([listDeskMacros(), listDeskMacroRuns()]);

  return (
    <AppShell
      title="Macros"
      actions={
        <Link href="/automations/macros/new" className={cn(buttonVariants())}>
          New macro
        </Link>
      }
    >
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Manual only. Each macro may queue one email stub, apply up to three field updates, and
        create up to three tasks. Run Macro lives on Leads, Contacts, and Deals lists. Ana Dib
        is skipped.
      </p>
      <section className="ff-card overflow-hidden">
        {macros.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No macros yet. Create one or seed the desk.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Module</th>
                  <th>Enabled</th>
                  <th>Run on list</th>
                </tr>
              </thead>
              <tbody>
                {macros.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/automations/macros/${row.id}`} className="font-medium text-primary hover:underline">
                        {row.name}
                      </Link>
                      {row.description ? (
                        <div className="text-xs text-muted-foreground">{row.description}</div>
                      ) : null}
                    </td>
                    <td>
                      {isDevHubModule(row.module) ? DEV_HUB_MODULE_LABEL[row.module] : row.module}
                    </td>
                    <td>{row.enabled ? "On" : "Off"}</td>
                    <td>
                      {isDevHubModule(row.module) ? (
                        <Link href={MODULE_LIST_HREF[row.module]} className="text-xs text-primary hover:underline">
                          {DEV_HUB_MODULE_LABEL[row.module]} list
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
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
