import { completeClaimDiary } from "@/app/actions/claims";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
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
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No claim diary rows in this view. Add one from a claim — it does not file FNOL.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Claim / Policy</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Party</th>
                <th>Due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ entry, claim, policy, contact, account }) => (
                <tr key={entry.id}>
                  <td className="font-medium">
                    <RecordLink href={`/claims/${claim.id}`}>
                      {policy?.policyNumber ?? "Unlinked claim"}
                    </RecordLink>
                    <div className="text-sm text-muted-foreground">{entry.body}</div>
                  </td>
                  <td>{claimDiaryKindLabel(entry.kind)}</td>
                  <td>
                    <span className="rounded-full bg-[var(--ff-sidebar)] px-2 py-0.5 text-xs font-semibold text-white">
                      {claimDiaryStatusLabel(entry.status)}
                    </span>
                  </td>
                  <td>
                    {contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—"}
                  </td>
                  <td>{formatDay(entry.dueAt)}</td>
                  <td>
                    {entry.status === "open" ? (
                      <form action={completeClaimDiary}>
                        <input type="hidden" name="entryId" value={entry.id} />
                        <input type="hidden" name="returnTo" value="/claims/diary" />
                        <Button type="submit" size="sm" variant="outline">
                          Mark done
                        </Button>
                      </form>
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
