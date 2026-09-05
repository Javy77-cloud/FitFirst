import { issueOrgApiKey, retireOrgApiKey, rotateOrgApiKey } from "@/app/actions/developer-hub";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { DEMO_ORG_API_KEY } from "@/lib/developer-hub/keys";
import { listOrgApiKeys } from "@/lib/developer-hub/store";

export const dynamic = "force-dynamic";

export default async function DeveloperApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const secret = typeof query.secret === "string" ? query.secret : undefined;
  const keys = await listOrgApiKeys();

  return (
    <SettingsShell title="API Keys" current="api-keys">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Org-level keys for Developer Hub REST stubs. The secret is hashed. Prefix stays on the
        row. User-scoped <code>/api/v1</code> tokens are separate. Seeded demo key:{" "}
        <code>{DEMO_ORG_API_KEY}</code> (shown here because this is the local desk).
      </p>
      {secret ? (
        <div className="mb-4 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-3 text-sm">
          <div className="font-semibold text-navy">
            {notice === "regenerated" ? "New secret — copy it now" : "Secret — copy it now"}
          </div>
          <p className="mt-1 font-mono text-xs break-all">{secret}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            FitFirst will not show this again. Revoke or regenerate if it leaves the desk.
          </p>
        </div>
      ) : null}
      {notice === "revoked" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Key revoked. Function REST calls with that secret fail.
        </p>
      ) : null}

      <form action={issueOrgApiKey} className="ff-card mb-4 max-w-xl space-y-3 p-4">
        <div>
          <Label className="text-xs">Key name</Label>
          <Input name="name" className="mt-1 h-8" placeholder="Functions REST" required />
        </div>
        <Button type="submit" size="sm">
          Create key
        </Button>
      </form>

      <section className="ff-card overflow-hidden">
        {keys.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No org API keys yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="font-medium text-navy">{key.name}</td>
                    <td>
                      <code className="text-xs">{key.prefix}…</code>
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {key.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {key.lastUsedAt ? key.lastUsedAt.toISOString().slice(0, 16).replace("T", " ") : "—"}
                    </td>
                    <td>
                      {key.revokedAt ? (
                        <span className="text-xs text-fit-red">Revoked</span>
                      ) : (
                        <StatusChip status="working" />
                      )}
                    </td>
                    <td className="space-x-2">
                      <form action={rotateOrgApiKey} className="inline">
                        <input type="hidden" name="id" value={key.id} />
                        <Button type="submit" size="xs" variant="outline">
                          Regenerate
                        </Button>
                      </form>
                      {!key.revokedAt ? (
                        <form action={retireOrgApiKey} className="inline">
                          <input type="hidden" name="id" value={key.id} />
                          <Button type="submit" size="xs" variant="destructive">
                            Revoke
                          </Button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SettingsShell>
  );
}
