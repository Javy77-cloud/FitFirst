import Link from "next/link";
import { toggleGuidedAutomation } from "@/app/actions/automations";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { Button } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import {
  AUTOMATION_ACTION_LABEL,
  AUTOMATION_CONDITION_LABEL,
  AUTOMATION_TRIGGER_LABEL,
  isAutomationAction,
  isAutomationCondition,
  isAutomationTrigger,
} from "@/lib/automations/types";
import { listGuidedAutomations } from "@/lib/db/automation-queries";
import { listCampaignSequences } from "@/lib/db/sequence-queries";

export const dynamic = "force-dynamic";

export default async function PlaybooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSignedIn();
  const query = await searchParams;
  const [rules, sequences] = await Promise.all([listGuidedAutomations(), listCampaignSequences()]);
  const onCount = sequences.filter((row) => row.enabled).length;

  return (
    <AppShell title="Playbooks">
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Existing in-desk playbooks. Each named rule is Trigger → Condition → Action and stays on
        this desk — Tasks and Alerts only. Campaign sequences (EN / ES templates) stay stubs.
        Paid SMS and Mailchimp blasts are not here.
      </p>
      <p className="mb-4 text-xs text-navy">
        {rules.filter((row) => row.enabled).length} of {rules.length} playbooks on · {onCount} of{" "}
        {sequences.length} sequences on
      </p>

      {rules.length === 0 ? (
        <section className="ff-card px-4 py-6 text-sm text-muted-foreground">
          No playbooks yet. Save one from the{" "}
          <Link href="/automations/builder" className="text-primary hover:underline">
            guided builder
          </Link>{" "}
          or seed the desk.
        </section>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rules.map((row) => (
            <section key={row.id} className="ff-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-navy">{row.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isAutomationTrigger(row.triggerKind)
                      ? AUTOMATION_TRIGGER_LABEL[row.triggerKind]
                      : row.triggerKind}{" "}
                    →{" "}
                    {isAutomationCondition(row.conditionKind)
                      ? AUTOMATION_CONDITION_LABEL[row.conditionKind]
                      : row.conditionKind}{" "}
                    →{" "}
                    {isAutomationAction(row.actionKind)
                      ? AUTOMATION_ACTION_LABEL[row.actionKind]
                      : row.actionKind}
                  </p>
                  {row.actionValue ? (
                    <p className="mt-2 text-xs text-navy">{row.actionValue}</p>
                  ) : null}
                </div>
                <form action={toggleGuidedAutomation}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="next" value="/automations/playbooks" />
                  <input type="hidden" name="enabled" value={row.enabled ? "false" : "true"} />
                  <Button type="submit" size="xs" variant={row.enabled ? "default" : "outline"}>
                    {row.enabled ? "On" : "Off"}
                  </Button>
                </form>
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-4 text-sm">
        <Link href="/automations/builder" className="text-primary hover:underline">
          Open guided builder
        </Link>
        {" · "}
        <Link href="/automations/sequences" className="text-primary hover:underline">
          Campaign sequences
        </Link>
        {" · "}
        <Link href="/automations/templates" className="text-primary hover:underline">
          EN / ES templates
        </Link>
      </p>
    </AppShell>
  );
}
