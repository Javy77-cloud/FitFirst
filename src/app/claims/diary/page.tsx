import { completeClaimDiary } from "@/app/actions/claims";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { RecordLink } from "@/components/record-links";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { CLAIMS_DIARY_COLUMNS } from "@/lib/list-columns";
import {
  CLAIM_DIARY_DISCLAIMER,
  claimDiaryKindLabel,
  claimDiaryStatusLabel,
} from "@/lib/domain-ams";
import { listClaimDiary } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function ClaimDiaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "open";
  const rows = await listClaimDiary(undefined, status === "all" ? undefined : status);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Claim diary" eyebrow="Claims log">
      <p className="mb-4 text-base text-muted-foreground">{CLAIM_DIARY_DISCLAIMER}</p>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <RecordLink href="/claims">Claims log</RecordLink>
        <RecordLink href="/claims/diary">Open diary</RecordLink>
        <RecordLink href="/claims/diary?status=all">All rows</RecordLink>
      </div>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-navy">Diary {notice.replaceAll("_", " ")}.</p>
      ) : null}
      <section className="ff-card overflow-hidden">
        <DeskColumnTable
          moduleId="claims-diary"
          columns={CLAIMS_DIARY_COLUMNS}
          empty="No claim diary rows in this view. Add one from a claim — it does not file FNOL."
          rows={rows.map(({ entry, claim, policy, contact, account }) => ({
            key: entry.id,
            cells: {
              claim: (
                <>
                  <RecordLink href={`/claims/${claim.id}`}>
                    {policy?.policyNumber ?? "Unlinked claim"}
                  </RecordLink>
                  <div className="text-sm text-muted-foreground">{entry.body}</div>
                </>
              ),
              kind: claimDiaryKindLabel(entry.kind),
              status: <StatusBadge status={entry.status}>{claimDiaryStatusLabel(entry.status)}</StatusBadge>,
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              due: formatDay(entry.dueAt),
              actions:
                entry.status === "open" ? (
                  <form action={completeClaimDiary}>
                    <input type="hidden" name="entryId" value={entry.id} />
                    <input type="hidden" name="returnTo" value="/claims/diary" />
                    <Button type="submit" size="sm" variant="outline">
                      Mark done
                    </Button>
                  </form>
                ) : null,
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
