import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { listDeskButtons } from "@/lib/db/developer-hub-queries";
import { DEV_HUB_MODULE_LABEL, isDevHubModule } from "@/lib/developer-hub/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ButtonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSignedIn();
  const query = await searchParams;
  const rows = await listDeskButtons();

  return (
    <AppShell
      title="Custom Buttons"
      actions={
        <Link href="/automations/buttons/new" className={cn(buttonVariants())}>
          New button
        </Link>
      }
    >
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        List, detail, or mass-action buttons. Click can open a URL, run a Developer Hub function,
        or a widget stub. Mass-action buttons show on Leads / Contacts / Deals with Run Macro.
      </p>
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No custom buttons yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Module</th>
                  <th>Placement</th>
                  <th>Action</th>
                  <th>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/automations/buttons/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.label}
                      </Link>
                    </td>
                    <td>{isDevHubModule(row.module) ? DEV_HUB_MODULE_LABEL[row.module] : row.module}</td>
                    <td>{row.placement.replaceAll("_", " ")}</td>
                    <td>{row.actionKind}</td>
                    <td>{row.enabled ? "On" : "Off"}</td>
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
