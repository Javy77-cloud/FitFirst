import Link from "next/link";
import { HubNotice } from "@/components/developer-hub/hub-notice";
import { SettingsShell } from "@/components/settings/settings-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { listDeskWidgets } from "@/lib/db/developer-hub-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WidgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdminPage();
  const { notice } = await searchParams;
  const widgets = await listDeskWidgets();

  return (
    <SettingsShell
      title="Widgets"
      current="dev-widgets"
      actions={
        <Link href="/settings/developer-hub/widgets/new" className={cn(buttonVariants())}>
          New widget
        </Link>
      }
    >

      <HubNotice notice={notice} />
      <section className="ff-card overflow-hidden">
        {widgets.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No widgets yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Hosting</th>
              </tr>
            </thead>
            <tbody>
              {widgets.map((widget) => (
                <tr key={widget.id}>
                  <td>
                    <Link
                      href={`/settings/developer-hub/widgets/${widget.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {widget.name}
                    </Link>
                  </td>
                  <td>{widget.type.replaceAll("_", " ")}</td>
                  <td>{widget.hosting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </SettingsShell>
  );
}
