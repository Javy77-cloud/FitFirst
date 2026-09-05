import Link from "next/link";
import { HubNotice } from "@/components/developer-hub/hub-notice";
import { SettingsShell } from "@/components/settings/settings-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { DEV_HUB_MODULE_LABEL, isDevHubModule } from "@/lib/developer-hub/types";
import { listDeskButtons } from "@/lib/db/developer-hub-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomButtonsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdminPage();
  const { notice } = await searchParams;
  const buttons = await listDeskButtons();

  return (
    <SettingsShell
      title="Custom Buttons"
      current="dev-buttons"
      actions={
        <Link href="/settings/developer-hub/custom-buttons/new" className={cn(buttonVariants())}>
          New button
        </Link>
      }
    >
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Links & Buttons. Placement is list, detail, or mass action. Click can run a Function
        apiName (no-op until core lands), open a merge-token URL, or open a Widget panel.
      </p>
      <HubNotice notice={notice} />
      <section className="ff-card overflow-hidden">
        {buttons.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No custom buttons yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Module</th>
                <th>Placement</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {buttons.map((button) => (
                <tr key={button.id}>
                  <td>
                    <Link
                      href={`/settings/developer-hub/custom-buttons/${button.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {button.label}
                    </Link>
                  </td>
                  <td>
                    {isDevHubModule(button.module)
                      ? DEV_HUB_MODULE_LABEL[button.module]
                      : button.module}
                  </td>
                  <td>{button.placement.replaceAll("_", " ")}</td>
                  <td>{button.actionKind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </SettingsShell>
  );
}
