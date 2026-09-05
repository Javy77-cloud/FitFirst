import { notFound } from "next/navigation";
import { removeDeveloperConnection, saveDeveloperConnection } from "@/app/actions/developer-hub";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { OauthWall } from "@/components/developer-hub/oauth-wall";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDeveloperConnection, maskConnectionSecret } from "@/lib/developer-hub/store";
import {
  CONNECTION_KIND_LABEL,
  CONNECTION_KINDS,
  CONNECTION_STATUSES,
  CONNECTION_STATUS_LABEL,
} from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

export default async function ConnectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const row = await getDeveloperConnection(id);
  if (!row) notFound();

  return (
    <AppShell title={row.name}>
      <AutomationsModuleNav />
      <AutomationsNotice notice={typeof query.notice === "string" ? query.notice : undefined} />
      <div className="mb-4">
        <OauthWall title="Authorize · needs OAuth" provider={CONNECTION_KIND_LABEL[row.kind as keyof typeof CONNECTION_KIND_LABEL] ?? row.kind} />
      </div>
      <form action={saveDeveloperConnection} className="ff-card max-w-xl space-y-3 p-4">
        <input type="hidden" name="id" value={row.id} />
        <div>
          <Label className="text-xs">Name</Label>
          <Input name="name" defaultValue={row.name} className="mt-1 h-8" required />
        </div>
        <div>
          <Label className="text-xs">linkName</Label>
          <Input name="linkName" defaultValue={row.linkName} className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Kind</Label>
          <select
            name="kind"
            defaultValue={row.kind}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {CONNECTION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {CONNECTION_KIND_LABEL[kind]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <select
            name="status"
            defaultValue={row.status}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {CONNECTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CONNECTION_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Client ID</Label>
          <Input name="clientId" defaultValue={row.clientId ?? ""} className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Client secret</Label>
          <Input
            name="clientSecret"
            type="password"
            defaultValue={maskConnectionSecret(row)}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea name="notes" defaultValue={row.notes ?? ""} className="mt-1" />
        </div>
        <Button type="submit" size="sm">
          Save connection
        </Button>
      </form>
      <HardDeleteForm action={removeDeveloperConnection} subject="this connection" className="mt-4">
        <input type="hidden" name="id" value={row.id} />
        <Button type="submit" size="sm" variant="destructive">
          Delete connection
        </Button>
      </HardDeleteForm>
    </AppShell>
  );
}
