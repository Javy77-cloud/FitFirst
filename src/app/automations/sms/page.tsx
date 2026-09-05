import { saveBulkSmsDraft } from "@/app/actions/automations";
import { AppShell } from "@/components/app-shell";
import { ConnectEmpty } from "@/components/automations/connect-empty";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireSignedIn } from "@/lib/auth/guards";
import { connectedSmsIntegrations, smsReady } from "@/lib/automations/connections";
import { listBulkSmsDrafts } from "@/lib/db/automation-queries";
import { getSmsSettings } from "@/lib/db/ops-queries";
import { listCatalogItems } from "@/lib/integrations/catalog-store";

export const dynamic = "force-dynamic";

export default async function AutomationsSmsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const query = await searchParams;
  const [catalog, sms, drafts] = await Promise.all([
    listCatalogItems(),
    getSmsSettings(),
    listBulkSmsDrafts(),
  ]);
  const ready = smsReady(catalog, Boolean(sms?.connected));
  const connected = connectedSmsIntegrations(catalog);

  return (
    <AppShell title="Bulk SMS">
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Bulk text is a stub. FitFirst does not buy numbers or send SMS. Connect Twilio,
        RingCentral, or Lightspeed Voice first.
      </p>
      {!ready ? (
        <ConnectEmpty
          title="Connect an SMS integration"
          body="Bulk SMS stays guided and empty until Admin marks a phone / SMS vendor connected. Agency pays the vendor. Nothing texts a client from this desk."
          href="/settings/integrations#sms"
          cta="Connect SMS integration"
          adminOnly
          isAdmin={session.isAdmin}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <form action={saveBulkSmsDraft} className="ff-card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-navy">Compose (stub)</h2>
              <ConnectionBadge connected />
            </div>
            <p className="text-xs text-muted-foreground">
              {connected[0]?.name ?? sms?.provider ?? "SMS"} · from{" "}
              {sms?.displayFrom ?? connected[0]?.accountLabel ?? "not provisioned"}
            </p>
            <div>
              <Label className="text-xs">Name</Label>
              <Input name="name" required className="mt-1 h-8" defaultValue="Inspection chase" />
            </div>
            <div>
              <Label className="text-xs">Audience</Label>
              <Input
                name="audienceLabel"
                className="mt-1 h-8"
                defaultValue="HO3 contacts who have not opted out"
              />
            </div>
            <div>
              <Label className="text-xs">Text</Label>
              <Textarea
                name="body"
                required
                rows={5}
                className="mt-1"
                defaultValue="Please send the wind mit so we can finish shopping. This is a stub — nothing texts."
              />
            </div>
            <Button type="submit" size="sm">
              Log would send
            </Button>
          </form>
          <section className="ff-card overflow-hidden">
            {drafts.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No bulk SMS drafts yet. Compose one — it only writes a would-send row.
              </p>
            ) : (
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Audience</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="font-medium">{row.name}</div>
                        <div className="max-w-[280px] truncate text-[11px] text-muted-foreground">
                          {row.body}
                        </div>
                      </td>
                      <td className="text-xs">{row.audienceLabel ?? "—"}</td>
                      <td className="capitalize">{row.status.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
