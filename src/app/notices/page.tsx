import { advancePolicyNotice } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { NOTICE_DIARY_DISCLAIMER, noticeKindLabel, noticeNextStep, noticeStatusLabel } from "@/lib/domain-ams";
import { listPolicyNotices } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rows = await listPolicyNotices();
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Notices">
      <p className="mb-4 text-base text-muted-foreground">{NOTICE_DIARY_DISCLAIMER}</p>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-navy">Notice {notice.replaceAll("_", " ")}.</p>
      ) : null}
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No cancellation, non-renewal, or reinstatement notices yet. Draft one from a Policy.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Next step</th>
                <th>Party</th>
                <th>Effective</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ notice: row, policy, contact, account }) => (
                <tr key={row.id}>
                  <td className="font-medium">
                    <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  </td>
                  <td>
                    {noticeKindLabel(row.kind)}
                    <div className="text-sm text-muted-foreground">{row.reason}</div>
                  </td>
                  <td>
                    <span className="rounded-full bg-[var(--ff-sidebar)] px-2 py-0.5 text-xs font-semibold text-white">
                      {noticeStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground">{noticeNextStep(row.status)}</td>
                  <td>
                    {contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—"}
                  </td>
                  <td>{formatDay(row.effectiveOn)}</td>
                  <td className="whitespace-nowrap">
                    {row.status === "drafted" ? (
                      <div className="flex flex-wrap gap-1">
                        <form action={advancePolicyNotice}>
                          <input type="hidden" name="noticeId" value={row.id} />
                          <input type="hidden" name="action" value="mail" />
                          <input type="hidden" name="returnTo" value="/notices" />
                          <Button type="submit" size="sm">
                            Mark mailed
                          </Button>
                        </form>
                        <form action={advancePolicyNotice}>
                          <input type="hidden" name="noticeId" value={row.id} />
                          <input type="hidden" name="action" value="withdraw" />
                          <input type="hidden" name="returnTo" value="/notices" />
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
