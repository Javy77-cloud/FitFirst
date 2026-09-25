import Link from "next/link";
import { notFound } from "next/navigation";
import { removeDeveloperConnection, saveDeveloperConnection } from "@/app/actions/developer-hub";
import { OauthWall } from "@/components/developer-hub/oauth-wall";
import { SettingsShell } from "@/components/settings/settings-shell";
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
  type ConnectionKind,
} from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

export default async function DeveloperConnectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const row = await getDeveloperConnection(id);
  if (!row) notFound();
  const kindLabel = CONNECTION_KIND_LABEL[row.kind as ConnectionKind] ?? row.kind;

  return (
    <SettingsShell title={row.name} current="connections">
      {notice === "saved" || notice === "created" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">Connection saved.</p>
      ) : null}

      <div className="mb-4">
        <OauthWall title={`Authorize ${kindLabel}`} provider={kindLabel} />
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
            <option value="needs_credentials">Needs credentials</option>
            <option value="connected_demo">Connected (demo)</option>
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
          <Textarea name="notes" defaultValue={row.notes ?? ""} className="mt-1 min-h-16" />
        </div>
        <Button type="submit" size="sm">
          Save connector
        </Button>
      </form>

      <HardDeleteForm action={removeDeveloperConnection} subject="this connector" className="mt-4">
        <input type="hidden" name="id" value={row.id} />
        <Button type="submit" size="sm" variant="destructive">
          Delete connector
        </Button>
      </HardDeleteForm>
      <p className="mt-3 text-sm">
        <Link href="/settings/developer/connections" className="text-primary hover:underline">
          All connections
        </Link>
      </p>
    </SettingsShell>
  );
}
