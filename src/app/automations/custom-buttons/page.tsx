import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { DEV_HUB_MODULE_LABEL, MODULE_LIST_HREF, isDevHubModule } from "@/lib/developer-hub/types";
import { listDeskButtons } from "@/lib/db/developer-hub-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AutomationsCustomButtonsPage() {
  const session = await requireSignedIn();
  const buttons = await listDeskButtons();

  return (
    <AppShell
      title="Custom Buttons"
      actions={
        session.isAdmin ? (
          <Link
            href="/settings/developer-hub/custom-buttons/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            New button
          </Link>
        ) : null
      }
    >
      <AutomationsModuleNav />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Links & Buttons on list, detail, and mass-action bars. Same records as Settings →
        Developer Hub. Click can open a URL, a widget panel, or a Function apiName (no-op until
        the core Functions table exists).
      </p>
      <section className="ff-card overflow-hidden">
        {buttons.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No custom buttons yet. Admin can add one in Developer Hub.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Module</th>
                <th>Placement</th>
                <th>Action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {buttons.map((button) => {
                const href = isDevHubModule(button.module)
                  ? MODULE_LIST_HREF[button.module]
                  : "/leads";
                return (
                  <tr key={button.id}>
                    <td>
                      {session.isAdmin ? (
                        <Link
                          href={`/settings/developer-hub/custom-buttons/${button.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {button.label}
                        </Link>
                      ) : (
                        <span className="font-medium text-navy">{button.label}</span>
                      )}
                    </td>
                    <td>
                      {isDevHubModule(button.module)
                        ? DEV_HUB_MODULE_LABEL[button.module]
                        : button.module}
                    </td>
                    <td>{button.placement.replaceAll("_", " ")}</td>
                    <td>{button.actionKind}</td>
                    <td>
                      <Link href={href} className="text-sm text-primary hover:underline">
                        Open list
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
