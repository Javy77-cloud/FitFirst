import { advanceEndorsementDraft } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
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
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No endorsement wording stubs yet. Draft one from a Policy — it does not file.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Form</th>
                <th>Status</th>
                <th>Next step</th>
                <th>Party</th>
                <th>Effective</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ draft, policy, contact, account }) => (
                <tr key={draft.id}>
                  <td className="font-medium">
                    <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                    <div className="text-sm text-muted-foreground">{draft.wording}</div>
                  </td>
                  <td>{endorsementFormLabel(draft.formCode)}</td>
                  <td>
                    <span className="rounded-full bg-[var(--ff-sidebar)] px-2 py-0.5 text-xs font-semibold text-white">
                      {endorsementDraftStatusLabel(draft.status)}
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground">
                    {endorsementDraftNextStep(draft.status)}
                  </td>
                  <td>
                    {contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—"}
                  </td>
                  <td>{formatDay(draft.effectiveOn)}</td>
                  <td className="whitespace-nowrap">
                    {draft.status === "drafted" || draft.status === "ready" ? (
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
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
