import { advancePolicyNotice } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { RecordLink } from "@/components/record-links";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { NOTICES_LIST_COLUMNS } from "@/lib/list-columns";
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
        <DeskColumnTable
          moduleId="notices"
          columns={NOTICES_LIST_COLUMNS}
          empty="No cancellation, non-renewal, or reinstatement notices yet. Draft one from a Policy."
          rows={rows.map(({ notice: row, policy, contact, account }) => ({
            key: row.id,
            cells: {
              policy: <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>,
              kind: (
                <>
                  {noticeKindLabel(row.kind)}
                  <div className="text-sm text-muted-foreground">{row.reason}</div>
                </>
              ),
              status: <StatusBadge status={row.status}>{noticeStatusLabel(row.status)}</StatusBadge>,
              next: noticeNextStep(row.status),
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              effective: formatDay(row.effectiveOn),
              actions:
                row.status === "drafted" ? (
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
                ) : null,
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
