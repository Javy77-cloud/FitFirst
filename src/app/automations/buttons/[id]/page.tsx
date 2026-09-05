import { notFound } from "next/navigation";
import { deleteDeskButton } from "@/app/actions/developer-hub";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { ButtonForm } from "@/components/developer-hub/button-form";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDeskButton, listDeskWidgets } from "@/lib/db/developer-hub-queries";

export const dynamic = "force-dynamic";

export default async function ButtonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const button = await getDeskButton(id);
  if (!button) notFound();
  const widgets = await listDeskWidgets();

  return (
    <AppShell title={button.label}>
      <AutomationsModuleNav />
      <AutomationsNotice notice={typeof query.notice === "string" ? query.notice : undefined} />
      <ButtonForm button={button} widgets={widgets} />
      <HardDeleteForm action={deleteDeskButton} subject="this button" className="mt-4">
        <input type="hidden" name="id" value={button.id} />
        <Button type="submit" size="sm" variant="destructive">
          Delete button
        </Button>
      </HardDeleteForm>
    </AppShell>
  );
}
