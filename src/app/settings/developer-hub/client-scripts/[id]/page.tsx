import { notFound } from "next/navigation";
import { deleteDeskScript } from "@/app/actions/developer-hub";
import { HubNotice } from "@/components/developer-hub/hub-notice";
import { ScriptForm } from "@/components/developer-hub/script-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDeskScript } from "@/lib/db/developer-hub-queries";

export const dynamic = "force-dynamic";

export default async function EditClientScriptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const { notice } = await searchParams;
  const script = await getDeskScript(id);
  if (!script) notFound();

  return (
    <SettingsShell
      title={script.name}
      current="dev-scripts"
      actions={
        <HardDeleteForm action={deleteDeskScript} subject="this script">
          <input type="hidden" name="id" value={script.id} />
          <Button type="submit" size="sm" variant="outline">
            Delete
          </Button>
        </HardDeleteForm>
      }
    >
      <HubNotice notice={notice} />
      <ScriptForm script={script} />
    </SettingsShell>
  );
}
