import Link from "next/link";
import { notFound } from "next/navigation";
import { removeDeveloperConnection, saveDeveloperConnection } from "@/app/actions/developer-hub";
import { AutomationsDeveloperFrame } from "@/components/automations/developer-frame";
import { OauthWall } from "@/components/developer-hub/oauth-wall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSignedIn } from "@/lib/auth/guards";
import { getDeveloperConnection, maskConnectionSecret } from "@/lib/developer-hub/store";
import {
  CONNECTION_KIND_LABEL,
  CONNECTION_KINDS,
  type ConnectionKind,
} from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

export default async function AutomationsConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSignedIn();
  const { id } = await params;
  const row = await getDeveloperConnection(id);
  if (!row) notFound();
  const kindLabel = CONNECTION_KIND_LABEL[row.kind as ConnectionKind] ?? row.kind;

  return (
    <AutomationsDeveloperFrame title={row.name} isAdmin={session.isAdmin}>
      <div className="mb-4">
        <OauthWall title={`Authorize ${kindLabel}`} provider={kindLabel} />
      </div>
      {row.kind === "zoho_crm" ? (
        <p className="mb-4 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Live Zoho stays the book of record. This connector does not write to Zoho CRM.
        </p>
      ) : null}
      {session.isAdmin ? (
        <>
          <form action={saveDeveloperConnection} className="ff-card max-w-xl space-y-3 p-4">
            <input type="hidden" name="surface" value="automations" />
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
            <Button type="submit" size="sm">
              Save connector
            </Button>
          </form>
          <form action={removeDeveloperConnection} className="mt-4">
            <input type="hidden" name="surface" value="automations" />
            <input type="hidden" name="id" value={row.id} />
            <Button type="submit" size="sm" variant="destructive">
              Delete connector
            </Button>
          </form>
        </>
      ) : null}
      <p className="mt-3 text-sm">
        <Link href="/automations/connections" className="text-primary hover:underline">
          All connections
        </Link>
      </p>
    </AutomationsDeveloperFrame>
  );
}
