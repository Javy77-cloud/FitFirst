import { notFound } from "next/navigation";
import { deleteDeskButton } from "@/app/actions/developer-hub";
import { ButtonForm } from "@/components/developer-hub/button-form";
import { HubNotice } from "@/components/developer-hub/hub-notice";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDeskButton, listDeskWidgets } from "@/lib/db/developer-hub-queries";

export const dynamic = "force-dynamic";

export default async function EditCustomButtonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const { notice } = await searchParams;
  const [button, widgets] = await Promise.all([getDeskButton(id), listDeskWidgets()]);
  if (!button) notFound();

  return (
    <SettingsShell
      title={button.label}
      current="dev-buttons"
      actions={
        <form action={deleteDeskButton}>
          <input type="hidden" name="id" value={button.id} />
          <Button type="submit" size="sm" variant="outline">
            Delete
          </Button>
        </form>
      }
    >
      <HubNotice notice={notice} />
      <ButtonForm button={button} widgets={widgets} />
    </SettingsShell>
  );
}
