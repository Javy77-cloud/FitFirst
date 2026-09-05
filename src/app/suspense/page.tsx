import { completeSuspenseTask } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay, SERVICING_DOC_LABELS } from "@/lib/domain";
import { loadSuspenseBoard } from "@/lib/ams/queries";
import { isSuspenseDocKey } from "@/lib/ams/suspense";

export const dynamic = "force-dynamic";

export default async function SuspenseBoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const doc = typeof params.doc === "string" ? params.doc : undefined;
  const board = await loadSuspenseBoard(doc);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Suspense">
      <p className="mb-4 text-base text-muted-foreground">
        Agency rollup of auto-opened AOR and ID-card follow-ups. Dec stays a manual collect. Mark
        collected when the packet arrives — the Policy stays in force.
      </p>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <RecordLink href="/suspense">All open</RecordLink>
        <RecordLink href="/suspense?doc=aor">AOR</RecordLink>
        <RecordLink href="/suspense?doc=id_card">ID cards</RecordLink>
      </div>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice === "suspense_closed" ? (
        <p className="mb-3 text-sm text-navy">Suspense row marked collected. Policy unchanged.</p>
      ) : null}
      <section className="ff-card overflow-hidden">
        {board.rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No open AOR or ID-card suspense. Missing dec still lives on Book health as a manual
            collect.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Party</th>
                <th>Missing</th>
                <th>Due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {board.rows.map((row) => (
                <tr key={row.taskId}>
                  <td className="font-medium">
                    <RecordLink href={`/policies/${row.policyId}`}>{row.policyNumber}</RecordLink>
                  </td>
                  <td>{row.partyName}</td>
                  <td>
                    {isSuspenseDocKey(row.docKey) ? SERVICING_DOC_LABELS[row.docKey] : row.title}
                  </td>
                  <td>{formatDay(row.dueDate)}</td>
                  <td>
                    <form action={completeSuspenseTask}>
                      <input type="hidden" name="taskId" value={row.taskId} />
                      <input type="hidden" name="returnTo" value="/suspense" />
                      <Button type="submit" size="sm" variant="outline">
                        Mark collected
                      </Button>
                    </form>
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
