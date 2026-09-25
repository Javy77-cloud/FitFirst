import Link from "next/link";
import { upsertCampaign } from "@/app/actions/campaigns";
import { AppShell } from "@/components/app-shell";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { FormPrimaryActions } from "@/components/desk/form-actions";
import { SavedToast } from "@/components/desk/saved-toast";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { CAMPAIGNS_LIST_COLUMNS } from "@/lib/list-columns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCampaigns, listContactTags } from "@/lib/db/ops-queries";
import { CAMPAIGN_AUDIENCE_TYPES, DEAL_STAGES } from "@/lib/domain";
import { CAMPAIGN_EMAIL_PRESETS } from "@/lib/templates/campaign-presets";
import { chosenDrop, resolveTemplateText } from "@/lib/templates/revision";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TEMPLATES = CAMPAIGN_EMAIL_PRESETS.filter((preset) => !chosenDrop(preset.key)).map((preset) => {
  const resolved = resolveTemplateText(preset.key, "en", {
    subject: preset.subject,
    body: preset.body,
  });
  return {
    name: preset.name,
    subject: resolved.send ? resolved.subject : preset.subject,
    body: resolved.send ? resolved.body : preset.body,
    audienceType: preset.audienceType,
    audienceValue: preset.audienceValue,
  };
});

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [rows, tags] = await Promise.all([listCampaigns(), listContactTags()]);
  const templateName = typeof params.template === "string" ? params.template : "";
  const saved = params.saved === "1" || (Array.isArray(params.saved) && params.saved[0] === "1");
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
      <SavedToast show={saved} message="Campaign saved." listHref="/campaigns" />

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

          </div>
          <FormPrimaryActions submitLabel="Save draft" />
        </form>
        <section className="ff-card overflow-hidden">
          <ModuleListActions
            module="campaigns"
            recordIds={rows.map((row) => row.id)}
            records={rows.map((row) => ({
              id: row.id,
              label: row.name,
            }))}
          >
            <DeskColumnTable
              moduleId="campaigns"
              columns={CAMPAIGNS_LIST_COLUMNS}
              empty="No campaigns yet. Compose a draft and pick an audience by tag or pipeline stage."
              rows={rows.map((row) => ({
                key: row.id,
                cells: {
                  pick: <SelectRowCheckbox id={row.id} />,
                  campaign: (
                    <>
                      <Link href={`/campaigns/${row.id}`} className="font-medium text-primary hover:underline">
                        {row.name}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">{row.subject}</div>
                    </>
                  ),
                  audience: `${row.audienceType.replace("_", " ")} · ${row.audienceValue}`,
                  status: <StatusBadge status={row.status}>{row.status.replace("_", " ")}</StatusBadge>,
                },
              }))}
            />
          </ModuleListActions>
        </section>
      </div>
    </AppShell>
  );
}
