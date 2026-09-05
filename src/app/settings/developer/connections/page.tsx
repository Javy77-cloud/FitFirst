import Link from "next/link";
import { saveDeveloperConnection } from "@/app/actions/developer-hub";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { listDeveloperConnections } from "@/lib/developer-hub/store";
import {
  CONNECTION_KIND_LABEL,
  CONNECTION_KINDS,
  CONNECTION_STATUS_LABEL,
  type ConnectionKind,
  type ConnectionStatus,
} from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

export default async function DeveloperConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const rows = await listDeveloperConnections();

  return (
    <SettingsShell title="Connections" current="connections">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Named connectors Functions can reference by <code>linkName</code> in metadata. Status is
        Connected (demo) or Needs credentials. Client secrets are encrypted at rest. Authorize
        hits the OAuth wall — agency BYO later. Zoho CRM sync does not write to live Zoho.
      </p>
      {notice === "deleted" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Connection deleted.
        </p>
      ) : null}

      <section className="ff-card mb-4 overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No connectors yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>linkName</th>
                  <th>Kind</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/settings/developer/connections/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td>
                      <code className="text-xs">{row.linkName}</code>
                    </td>
                    <td>
                      {CONNECTION_KIND_LABEL[row.kind as ConnectionKind] ?? row.kind}
                    </td>
                    <td>
                      {row.status === "connected_demo" ? (
                        <StatusChip status="stub" />
                      ) : (
                        <StatusChip status="needs_oauth" />
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        {CONNECTION_STATUS_LABEL[row.status as ConnectionStatus] ?? row.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form action={saveDeveloperConnection} className="ff-card max-w-xl space-y-3 p-4">
        <div className="text-sm font-semibold text-navy">Add connector</div>
        <div>
          <Label className="text-xs">Name</Label>
          <Input name="name" className="mt-1 h-8" required />
        </div>
        <div>
          <Label className="text-xs">linkName</Label>
          <Input name="linkName" className="mt-1 h-8" placeholder="stripe_live" />
        </div>
        <div>
          <Label className="text-xs">Kind</Label>
          <select
            name="kind"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="custom_oauth"
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
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="needs_credentials"
          >
            <option value="needs_credentials">Needs credentials</option>
            <option value="connected_demo">Connected (demo)</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Client ID</Label>
          <Input name="clientId" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Client secret (encrypted at rest)</Label>
          <Input name="clientSecret" type="password" className="mt-1 h-8" />
        </div>
        <Button type="submit" size="sm">
          Save connector
        </Button>
      </form>
    </SettingsShell>
  );
}
