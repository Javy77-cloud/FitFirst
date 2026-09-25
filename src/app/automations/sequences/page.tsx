import { toggleCampaignSequence } from "@/app/actions/campaign-sequences";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { offsetLabel, stepKindLabel, type SequenceStep } from "@/lib/campaign-sequences/types";
import { listCampaignSequences } from "@/lib/db/sequence-queries";

export const dynamic = "force-dynamic";

export default async function CampaignSequencesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSignedIn();
  const query = await searchParams;
  const rows = await listCampaignSequences();
  const onCount = rows.filter((row) => row.enabled).length;

  return (
    <AppShell title="Campaign sequences">
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />

      <p className="mb-4 text-xs text-navy">
        {onCount} of {rows.length} sequences on
      </p>
      {rows.length === 0 ? (
        <section className="ff-card px-4 py-6 text-sm text-muted-foreground">
          No sequences yet. Run <code>npm run db:seed</code> to load the five insurance
          catalogs.
        </section>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <section key={row.id} className="ff-card p-4" id={row.slug}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-navy">{row.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{row.summary}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Audience: {row.audience}
                  </p>
                </div>
                <form action={toggleCampaignSequence}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="enabled" value={row.enabled ? "false" : "true"} />
                  <Button type="submit" size="xs" variant={row.enabled ? "default" : "outline"}>
                    {row.enabled ? "On" : "Off"}
                  </Button>
                </form>
              </div>
              <ol className={`mt-3 space-y-2 ${row.enabled ? "" : "opacity-60"}`}>
                {(row.steps ?? []).map((step, index) => (
                  <SequenceStepRow
                    key={step.key}
                    step={step}
                    index={index}
                    anchor={row.anchor}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function SequenceStepRow({
  step,
  index,
  anchor,
}: {
  step: SequenceStep;
  index: number;
  anchor: string;
}) {
  return (
    <li className="rounded-md border border-border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{index + 1}.</span>
        <Badge variant="outline">{stepKindLabel(step.kind)}</Badge>
        <span className="text-sm font-medium text-navy">{step.title}</span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{offsetLabel(step.offsetDays, anchor)}</div>
      {step.kind === "task" ? (
        <p className="mt-1 text-sm">{step.taskTitle}</p>
      ) : (
        <div className="mt-1">
          <div className="text-sm font-medium">{step.emailSubject}</div>
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
            {step.emailBody}
          </p>
        </div>
      )}
    </li>
  );
}
