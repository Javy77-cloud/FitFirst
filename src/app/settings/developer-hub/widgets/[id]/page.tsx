import { notFound } from "next/navigation";
import { deleteDeskWidget } from "@/app/actions/developer-hub";
import { HubNotice } from "@/components/developer-hub/hub-notice";
import { WidgetForm } from "@/components/developer-hub/widget-form";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import { SettingsShell } from "@/components/settings/settings-shell";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDeskWidget } from "@/lib/db/developer-hub-queries";

export const dynamic = "force-dynamic";

export default async function EditWidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const { notice } = await searchParams;
  const widget = await getDeskWidget(id);
  if (!widget) notFound();

  return (
    <SettingsShell
      title={widget.name}
      current="dev-widgets"
      actions={
        <HardDeleteForm action={deleteDeskWidget} subject="this widget">
          <input type="hidden" name="id" value={widget.id} />
          <Button type="submit" size="sm" variant="outline">
            Delete
          </Button>
        </HardDeleteForm>
      }
    >
      <HubNotice notice={notice} />
      <WidgetForm widget={widget} />
      <div className="mt-6">
        <WidgetHost name={widget.name} url={widget.externalUrl} />
      </div>
    </SettingsShell>
  );
}
