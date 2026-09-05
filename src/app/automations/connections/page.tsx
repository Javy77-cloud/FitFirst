import Link from "next/link";
import { saveDeveloperConnection } from "@/app/actions/developer-hub";
import { AutomationsDeveloperFrame } from "@/components/automations/developer-frame";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSignedIn } from "@/lib/auth/guards";
import { listDeveloperConnections } from "@/lib/developer-hub/store";
import {
  CONNECTION_KIND_LABEL,
  CONNECTION_KINDS,
  CONNECTION_STATUS_LABEL,
  type ConnectionKind,
  type ConnectionStatus,
} from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

export default async function AutomationsConnectionsPage() {
  const session = await requireSignedIn();
  const rows = session.isAdmin ? await listDeveloperConnections() : [];

  return (
    <AutomationsDeveloperFrame title="Connections" isAdmin={session.isAdmin}>
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Named connectors Functions can reference by linkName. Authorize is an OAuth wall. No live
        Zoho writes.
      </p>
      {session.isAdmin ? (
        <>
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
                            href={`/automations/connections/${row.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {row.name}
                          </Link>
                        </td>
                        <td>
                          <code className="text-xs">{row.linkName}</code>
                        </td>
                        <td>{CONNECTION_KIND_LABEL[row.kind as ConnectionKind] ?? row.kind}</td>
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
            <input type="hidden" name="surface" value="automations" />
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
            <Button type="submit" size="sm">
              Save connector
            </Button>
          </form>
        </>
      ) : null}
    </AutomationsDeveloperFrame>
  );
}
