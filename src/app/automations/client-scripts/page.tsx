import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { listDeskScripts } from "@/lib/db/developer-hub-queries";
import { DEV_HUB_MODULE_LABEL, isDevHubModule } from "@/lib/developer-hub/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientScriptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSignedIn();
  const query = await searchParams;
  const rows = await listDeskScripts();

  return (
    <AppShell
      title="Client Scripts"
      actions={
        <Link href="/automations/client-scripts/new" className={cn(buttonVariants())}>
          New script
        </Link>
      }
    >
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Page + event + optional field. The body persists. The desk parses allowlisted{" "}
        <code>getValue</code> / <code>setValue</code> / <code>showError</code> only — no eval.
      </p>
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No client scripts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Module</th>
                  <th>Page</th>
                  <th>Event</th>
                  <th>Field</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/automations/client-scripts/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td>{isDevHubModule(row.module) ? DEV_HUB_MODULE_LABEL[row.module] : row.module}</td>
                    <td>{row.page}</td>
                    <td>{row.event}</td>
                    <td>{row.fieldName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
