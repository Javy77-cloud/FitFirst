import Link from "next/link";
import { notFound } from "next/navigation";
import { upsertCampaign } from "@/app/actions/campaigns";
import { AppShell } from "@/components/app-shell";
import { RecordModuleMacros } from "@/components/developer-hub/record-module-macros";
import { Notice } from "@/components/ops/stub-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCampaign, resolveCampaignAudience } from "@/lib/db/ops-queries";
import { CAMPAIGN_AUDIENCE_TYPES } from "@/lib/domain";
import { isUuid } from "@/lib/ids";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const query = await searchParams;
  const data = await getCampaign(id);
  if (!data) notFound();
  const { campaign, logs } = data;
  const preview = await resolveCampaignAudience(campaign.audienceType, campaign.audienceValue);
  const notice = typeof query.notice === "string" ? query.notice : undefined;

  return (
    <AppShell title={campaign.name}>
      <RecordModuleMacros module="campaigns" recordId={campaign.id} />
      <Notice code={notice} />
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Draft only. Connect work email under Settings before a campaign can leave the desk.
      </p>
      <div className="mb-3 text-sm">
        <Link href="/campaigns" className="text-primary hover:underline">
          ← All campaigns
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form action={upsertCampaign} className="ff-card space-y-3 p-4">
          <input type="hidden" name="id" value={campaign.id} />
          <div>
            <Label className="text-xs">Name</Label>
            <Input name="name" defaultValue={campaign.name} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input name="subject" defaultValue={campaign.subject} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <textarea
              name="body"
              defaultValue={campaign.body}
              rows={8}
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Audience type</Label>
              <select
                name="audienceType"
                defaultValue={campaign.audienceType}
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                {CAMPAIGN_AUDIENCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "tag" ? "Contact tag" : "Pipeline stage"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Value</Label>
              <Input name="audienceValue" defaultValue={campaign.audienceValue} className="mt-1 h-8" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="outline">
              Save draft
            </Button>
          </div>
        </form>
        <section className="space-y-4">
          <div className="ff-card p-4">
            <h2 className="text-sm font-semibold text-navy">Audience preview</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              {campaign.audienceType.replace("_", " ")} = {campaign.audienceValue}
            </p>
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching contacts or deals.</p>
            ) : (
              <ul className="text-sm">
                {preview.map((p, i) => (
                  <li key={`${p.email}-${i}`}>
                    {p.name}
                    {p.email ? ` · ${p.email}` : " · no email on file"}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Send is not wired. Connect Gmail or Outlook in Settings → Email.
            </p>
          </div>
          <div className="ff-card overflow-hidden p-4">
            <h2 className="mb-2 text-sm font-semibold text-navy">Send log</h2>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
            ) : (
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        {log.recipientName ?? "—"}
                        <div className="text-[11px] text-muted-foreground">{log.detail}</div>
                      </td>
                      <td className="capitalize">{log.outcome.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
