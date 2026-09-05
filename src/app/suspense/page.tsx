import { completeSuspenseTask } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay, SERVICING_DOC_LABELS } from "@/lib/domain";
import { loadSuspenseBoard } from "@/lib/ams/queries";
import { isSuspenseDocKey } from "@/lib/ams/suspense";
import { countSuspenseByAge } from "@/lib/ams/suspense-aging";
import { SUSPENSE_AGE_BUCKETS, isSuspenseAgeBucket, suspenseAgeLabel } from "@/lib/domain-ams";

export const dynamic = "force-dynamic";

function hrefFor(doc?: string, age?: string) {
  const params = new URLSearchParams();
  if (doc) params.set("doc", doc);
  if (age) params.set("age", age);
  const query = params.toString();
  return query ? `/suspense?${query}` : "/suspense";
}

export default async function SuspenseBoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const doc = typeof params.doc === "string" ? params.doc : undefined;
  const age = typeof params.age === "string" ? params.age : undefined;
  const board = await loadSuspenseBoard(doc, age);
  const unfiltered = age ? await loadSuspenseBoard(doc) : board;
  const ageCounts = countSuspenseByAge(unfiltered.rows);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Suspense">
      <p className="mb-4 text-base text-muted-foreground">
        Agency rollup of auto-opened AOR and ID-card follow-ups. Age is days open as of the desk
        clock — not a cancel. Dec stays a manual collect. Mark collected when the packet arrives —
        the Policy stays in force.
      </p>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <RecordLink href={hrefFor(undefined, age)}>All open</RecordLink>
        <RecordLink href={hrefFor("aor", age)}>AOR</RecordLink>
        <RecordLink href={hrefFor("id_card", age)}>ID cards</RecordLink>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <RecordLink href={hrefFor(doc)}>All ages</RecordLink>
        {SUSPENSE_AGE_BUCKETS.map((bucket) => (
          <RecordLink key={bucket} href={hrefFor(doc, bucket)}>
            {suspenseAgeLabel(bucket)} · {ageCounts[bucket]}
          </RecordLink>
        ))}
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
            No open AOR or ID-card suspense
            {age && isSuspenseAgeBucket(age) ? ` in ${suspenseAgeLabel(age).toLowerCase()}` : ""}.
            Missing dec still lives on Book health as a manual collect.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Party</th>
                <th>Missing</th>
                <th>Age</th>
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
                  <td>
                    {row.daysOpen ?? 0}d · {suspenseAgeLabel(row.age ?? "current").split(" (")[0]}
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
