import Link from "next/link";
import { upsertCampaign } from "@/app/actions/campaigns";
import { AppShell } from "@/components/app-shell";
import { StubBanner } from "@/components/ops/stub-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCampaigns, listContactTags } from "@/lib/db/ops-queries";
import { CAMPAIGN_AUDIENCE_TYPES, DEAL_STAGES } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [rows, tags] = await Promise.all([listCampaigns(), listContactTags()]);

  return (
    <AppShell
      title="Campaigns"
      actions={
        <Link href="/settings/sms" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          SMS settings
        </Link>
      }
    >
      <StubBanner>
        Email sends are stubbed. Pressing send logs “would send” for each audience member. No SMTP
        and no provider API.
      </StubBanner>
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form action={upsertCampaign} className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Composer</h2>
          <div>
            <Label className="text-xs">Campaign name</Label>
            <Input name="name" required className="mt-1 h-8" placeholder="Wind mit chase" />
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input name="subject" required className="mt-1 h-8" placeholder="Need your wind mit this week" />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <textarea
              name="body"
              required
              rows={6}
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
              placeholder="Hi — please send the wind mitigation inspection so we can finish shopping."
            />
          </div>
          <div>
            <Label className="text-xs">Audience</Label>
            <select
              name="audienceType"
              defaultValue="tag"
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
            <Label className="text-xs">Tag or stage</Label>
            <Input
              name="audienceValue"
              required
              className="mt-1 h-8"
              placeholder={tags[0] ?? "ho3"}
              list="audience-presets"
            />
            <datalist id="audience-presets">
              {tags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
              {DEAL_STAGES.map((stage) => (
                <option key={stage} value={stage} />
              ))}
            </datalist>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Known tags: {tags.length ? tags.join(", ") : "none yet — tag a contact first"}. Stages:{" "}
              {DEAL_STAGES.join(", ")}.
            </p>
          </div>
          <Button type="submit" size="sm">
            Save draft
          </Button>
        </form>
        <section className="ff-card overflow-hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No campaigns yet. Compose a draft and pick an audience by tag or pipeline stage.
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
                      <Link href={`/campaigns/${row.id}`} className="font-medium text-primary hover:underline">
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
    </AppShell>
  );
}
