import Link from "next/link";
import { upsertCampaign } from "@/app/actions/campaigns";
import { AppShell } from "@/components/app-shell";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCampaigns, listContactTags } from "@/lib/db/ops-queries";
import { CAMPAIGN_AUDIENCE_TYPES, DEAL_STAGES } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  {
    name: "Wind mit chase",
    subject: "Need your wind mitigation inspection",
    body: "Please send the wind mit so we can finish shopping.",
    audienceType: "tag",
    audienceValue: "ho3",
  },
  {
    name: "Hurricane season reminder",
    subject: "Review your deductible before storm season",
    body: "A short reminder to review hurricane deductibles. No SMTP in this build.",
    audienceType: "pipeline_stage",
    audienceValue: "shopping",
  },
  {
    name: "Renewal-watch note",
    subject: "We will shop your renewal 60 days out",
    body: "Placeholder renewal template. Audience is the renewal-watch tag when you add it.",
    audienceType: "tag",
    audienceValue: "renewal-watch",
  },
] as const;

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [rows, tags] = await Promise.all([listCampaigns(), listContactTags()]);
  const templateName = typeof params.template === "string" ? params.template : "";
  const preset = TEMPLATES.find((t) => t.name === templateName) ?? TEMPLATES[0];

  return (
    <AppShell
      title="Campaigns"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/automations" className={cn(buttonVariants({ size: "sm" }))}>
            Automations hub
          </Link>
          <Link href="/settings/sms" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            SMS settings
          </Link>
        </div>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Draft lists and templates. Sending waits until work email is connected under Settings →
        Email. No SMTP from this desk today.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {TEMPLATES.map((tpl) => (
          <Link
            key={tpl.name}
            href={`/campaigns?template=${encodeURIComponent(tpl.name)}`}
            className={cn(buttonVariants({ size: "sm", variant: preset.name === tpl.name ? "default" : "outline" }))}
          >
            {tpl.name}
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form action={upsertCampaign} className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Create campaign</h2>
          <div>
            <Label className="text-xs">Campaign name</Label>
            <Input name="name" required className="mt-1 h-8" defaultValue={preset.name} />
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input name="subject" required className="mt-1 h-8" defaultValue={preset.subject} />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <textarea
              name="body"
              required
              rows={6}
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
              defaultValue={preset.body}
            />
          </div>
          <div>
            <Label className="text-xs">Audience</Label>
            <select
              name="audienceType"
              defaultValue={preset.audienceType}
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
              defaultValue={preset.audienceValue}
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
            <ModuleListActions module="campaigns" recordIds={rows.map((row) => row.id)}>
            <table className="ff-table">
              <thead>
                <tr>
                  <th />
                  <th>Campaign</th>
                  <th>Audience</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <SelectRowCheckbox id={row.id} />
                    </td>
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
            </ModuleListActions>
          )}
        </section>
      </div>
    </AppShell>
  );
}
