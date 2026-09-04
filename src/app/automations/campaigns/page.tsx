import Link from "next/link";
import { upsertCampaign } from "@/app/actions/campaigns";
import { AppShell } from "@/components/app-shell";
import { ConnectEmpty } from "@/components/automations/connect-empty";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSignedIn } from "@/lib/auth/guards";
import { campaignsReady, connectedCampaignIntegrations } from "@/lib/automations/connections";
import { listCampaigns, listContactTags } from "@/lib/db/ops-queries";
import { CAMPAIGN_AUDIENCE_TYPES, DEAL_STAGES } from "@/lib/domain";
import { listCatalogItems } from "@/lib/integrations/catalog-store";

export const dynamic = "force-dynamic";

export default async function AutomationsCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const query = await searchParams;
  const [catalog, rows, tags] = await Promise.all([
    listCatalogItems(),
    listCampaigns(),
    listContactTags(),
  ]);
  const ready = campaignsReady(catalog);
  const connected = connectedCampaignIntegrations(catalog);

  return (
    <AppShell title="Email campaigns">
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Uses the same Mailchimp / Constant Contact / SendGrid stubs as Settings → Integrations.
        Sends still log “would send”. No SMTP.
      </p>
      {!ready ? (
        <ConnectEmpty
          title="Connect a campaign integration"
          body="Email campaigns stay empty until Admin marks Mailchimp, Constant Contact, or SendGrid connected. FitFirst does not bill those vendors."
          href="/settings/integrations#campaigns"
          cta="Connect integration"
          adminOnly
          isAdmin={session.isAdmin}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {connected.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-2 text-xs">
                {item.name}
                <ConnectionBadge connected />
              </span>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <form action={upsertCampaign} className="ff-card space-y-3 p-4">
              <h2 className="text-sm font-semibold text-navy">Create campaign</h2>
              <div>
                <Label className="text-xs">Campaign name</Label>
                <Input name="name" required className="mt-1 h-8" defaultValue="Hurricane deductible reminder" />
              </div>
              <div>
                <Label className="text-xs">Subject</Label>
                <Input
                  name="subject"
                  required
                  className="mt-1 h-8"
                  defaultValue="Review your deductible before storm season"
                />
              </div>
              <div>
                <Label className="text-xs">Body</Label>
                <textarea
                  name="body"
                  required
                  rows={6}
                  className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
                  defaultValue="Short reminder from the agency. This campaign is a stub — FitFirst only logs would send."
                />
              </div>
              <div>
                <Label className="text-xs">Audience</Label>
                <select
                  name="audienceType"
                  defaultValue="tag"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {CAMPAIGN_AUDIENCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === "tag" ? "Contact tag" : "Pipeline stage"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Tag or stage</Label>
                <Input
                  name="audienceValue"
                  required
                  className="mt-1 h-8"
                  defaultValue={tags[0] ?? "ho3"}
                  list="automation-audience"
                />
                <datalist id="automation-audience">
                  {tags.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                  {DEAL_STAGES.map((stage) => (
                    <option key={stage} value={stage} />
                  ))}
                </datalist>
              </div>
              <Button type="submit" size="sm">
                Save draft
              </Button>
            </form>
            <section className="ff-card overflow-hidden">
              {rows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  No campaigns yet. Compose a draft against the connected vendor stub.
                </p>
              ) : (
                <table className="ff-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Audience</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <Link
                            href={`/campaigns/${row.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {row.name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">{row.subject}</div>
                        </td>
                        <td className="text-xs">
                          {row.audienceType.replace("_", " ")} · {row.audienceValue}
                        </td>
                        <td className="capitalize">{row.status.replace("_", " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
