import { advanceEndorsementDraft } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { RecordLink } from "@/components/record-links";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { ENDORSEMENTS_LIST_COLUMNS } from "@/lib/list-columns";
import {
  ENDORSEMENT_DRAFT_DISCLAIMER,
  endorsementDraftNextStep,
  endorsementDraftStatusLabel,
  endorsementFormLabel,
} from "@/lib/domain-ams";
import { listEndorsementDrafts } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function EndorsementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rows = await listEndorsementDrafts();
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Endorsement drafts">
      <p className="mb-4 text-base text-muted-foreground">{ENDORSEMENT_DRAFT_DISCLAIMER}</p>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-navy">Draft {notice.replaceAll("_", " ")}.</p>
      ) : null}
      <section className="ff-card overflow-hidden">
        <DeskColumnTable
          moduleId="endorsements"
          columns={ENDORSEMENTS_LIST_COLUMNS}
          empty="No endorsement wording stubs yet. Draft one from a Policy — it does not file."
          rows={rows.map(({ draft, policy, contact, account }) => ({
            key: draft.id,
            cells: {
              policy: (
                <>
                  <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  <div className="text-sm text-muted-foreground">{draft.wording}</div>
                </>
              ),
              form: endorsementFormLabel(draft.formCode),
              status: <StatusBadge status={draft.status}>{endorsementDraftStatusLabel(draft.status)}</StatusBadge>,
              next: endorsementDraftNextStep(draft.status),
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              effective: formatDay(draft.effectiveOn),
              actions:
                draft.status === "drafted" || draft.status === "ready" ? (
                  <div className="flex flex-wrap gap-1">
                    {draft.status === "drafted" ? (
                      <form action={advanceEndorsementDraft}>
                        <input type="hidden" name="draftId" value={draft.id} />
                        <input type="hidden" name="action" value="ready" />
                        <input type="hidden" name="returnTo" value="/endorsements" />
                        <Button type="submit" size="sm">
                          Mark ready
                        </Button>
                      </form>
                    ) : null}
                    <form action={advanceEndorsementDraft}>
                      <input type="hidden" name="draftId" value={draft.id} />
                      <input type="hidden" name="action" value="withdraw" />
                      <input type="hidden" name="returnTo" value="/endorsements" />
                      <Button type="submit" size="sm" variant="secondary">
                        Withdraw
                      </Button>
                    </form>
                  </div>
                ) : null,
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
